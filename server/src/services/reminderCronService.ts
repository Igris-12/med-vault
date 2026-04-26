import cron from 'node-cron';
import UserModel from '../models/User.js';
import PrescriptionModel from '../models/Prescription.js';
import ReminderModel from '../models/Reminder.js';
import { sendWhatsAppMessage } from './whatsappService.js';
import { io } from '../index.js';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function todayAt(h: number, m: number): Date {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

// Map frequency text → IST hour/minute slots
function getSlots(frequency: string): Array<{ h: number; m: number; label: string }> {
  const f = frequency.toLowerCase();
  if (/once\s*(a\s*day|daily)?|morning|breakfast|empty\s*stomach/i.test(f))
    return [{ h: 7, m: 30, label: 'Morning' }];
  if (/twice|bd|twice\s*daily|two\s*times/i.test(f))
    return [{ h: 7, m: 30, label: 'Morning' }, { h: 20, m: 0, label: 'Evening' }];
  if (/three\s*times|tds|tid/i.test(f))
    return [{ h: 7, m: 30, label: 'Morning' }, { h: 13, m: 0, label: 'Afternoon' }, { h: 20, m: 0, label: 'Evening' }];
  if (/night|bedtime|dinner|evening|pm/i.test(f))
    return [{ h: 20, m: 0, label: 'Evening' }];
  if (/afternoon|lunch/i.test(f))
    return [{ h: 13, m: 0, label: 'Afternoon' }];
  if (/weekly/i.test(f))
    return []; // handled separately
  if (/monthly/i.test(f))
    return []; // handled separately
  // Default: once in the morning
  return [{ h: 7, m: 30, label: 'Morning' }];
}

function buildMedMsg(name: string, drug: string, dosage: string, frequency: string, slot: string): string {
  return `💊 *Medication Reminder*\n\nHi ${name}! 🌟 Time for your *${slot}* medication:\n\n*${drug}* — ${dosage}\n📋 ${frequency}\n\n✅ Take it now and stay on track!\n\n_— MedVault Health Assistant_`;
}

function buildMorningMsg(name: string, meds: Array<{ drugName: string; dosage: string }>): string {
  const list = meds.map(m => `• *${m.drugName}* — ${m.dosage}`).join('\n');
  return `☀️ *Good Morning, ${name}!*\n\nHere are your medications for today:\n\n${list}\n\n💡 Tip: Taking medicines at the same time daily improves effectiveness.\n\n_— MedVault Health Assistant_`;
}

// ─── 1. Auto-generate daily Reminders from active prescriptions (runs at midnight IST) ─
export function scheduleDailyReminderGeneration(): void {
  // 18:30 UTC = 00:00 IST (midnight)
  cron.schedule('30 18 * * *', async () => {
    console.log('[Cron] Generating daily medication reminders from prescriptions...');
    try {
      const users = await UserModel.find({
        whatsappPhone: { $exists: true, $nin: [null, ''] },
      }).select('_id name whatsappPhone').lean();

      let total = 0;
      for (const user of users) {
        try {
          const meds = await PrescriptionModel.find({
            userId: user._id,
            status: 'active',
          }).select('drugName dosage frequency').lean();

          if (!meds.length) continue;

          const firstName = user.name?.split(' ')[0] || 'there';

          for (const med of meds) {
            const slots = getSlots(med.frequency);
            for (const slot of slots) {
              const scheduledAt = todayAt(slot.h - 5, slot.m === 30 ? 30 : slot.m); // Convert IST → stored UTC
              // IST is UTC+5:30, so subtract 5h30m
              const utc = new Date();
              utc.setDate(utc.getDate() + 1); // Tomorrow
              utc.setHours(slot.h - 5, slot.m === 0 ? 30 : slot.m - 30, 0, 0);

              // Correct IST→UTC: subtract 5h30m
              const istHour = slot.h;
              const istMin  = slot.m;
              let utcHour = istHour - 5;
              let utcMin  = istMin  - 30;
              if (utcMin < 0) { utcMin += 60; utcHour -= 1; }
              if (utcHour < 0) { utcHour += 24; }

              const tomorrowUtc = new Date();
              tomorrowUtc.setDate(tomorrowUtc.getDate() + 1);
              tomorrowUtc.setHours(utcHour, utcMin, 0, 0);

              // Check if one already exists for tomorrow + this drug + slot
              const exists = await ReminderModel.exists({
                userId: user._id,
                tag: `med:${med.drugName}:${slot.label}`,
                scheduledAt: { $gte: new Date(tomorrowUtc.getTime() - 60000), $lte: new Date(tomorrowUtc.getTime() + 60000) },
                status: 'pending',
              });

              if (!exists) {
                await ReminderModel.create({
                  userId:      user._id,
                  phone:       user.whatsappPhone!,
                  message:     buildMedMsg(firstName, med.drugName, med.dosage, med.frequency, slot.label),
                  scheduledAt: tomorrowUtc,
                  frequency:   'once',
                  tag:         `med:${med.drugName}:${slot.label}`,
                  status:      'pending',
                });
                total++;
              }
            }
          }
        } catch (err) {
          console.error(`[Cron] Failed to generate reminders for ${user._id}:`, err);
        }
      }
      console.log(`[Cron] Generated ${total} medication reminders for tomorrow.`);
    } catch (err) {
      console.error('[Cron] Daily reminder generation failed:', err);
    }
  }, { timezone: 'UTC' });
  console.log('[Cron] Daily reminder generator scheduled: midnight IST');
}

// ─── 2. Per-minute: send pending Reminders ────────────────────────────────────
export function scheduleReminderProcessor(): void {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const pending = await ReminderModel.find({
        status: 'pending',
        scheduledAt: { $lte: now },
      }).limit(30);

      if (!pending.length) return;
      console.log(`[Cron] Processing ${pending.length} pending reminder(s)...`);

      for (const rem of pending) {
        try {
          await sendWhatsAppMessage(rem.phone, rem.message);
          rem.status = 'sent';
          rem.sentAt  = new Date();
          await rem.save();
          console.log(`[Cron] ✅ Sent reminder to ${rem.phone}: ${rem.tag}`);
          try { io.to(rem.userId).emit('reminder:sent', { id: rem._id, message: rem.message }); } catch {}

          // Clone for recurring reminders
          if (rem.frequency !== 'once') {
            const next = new Date(rem.scheduledAt);
            if (rem.frequency === 'daily')   next.setDate(next.getDate() + 1);
            if (rem.frequency === 'weekly')  next.setDate(next.getDate() + 7);
            if (rem.frequency === 'monthly') next.setMonth(next.getMonth() + 1);
            await ReminderModel.create({
              userId: rem.userId, phone: rem.phone, message: rem.message,
              scheduledAt: next, frequency: rem.frequency, tag: rem.tag, status: 'pending',
            });
          }
        } catch (err: any) {
          rem.status = 'failed';
          await rem.save();
          console.error(`[Cron] ❌ Failed to send to ${rem.phone}:`, err?.message || err);
          try { io.to(rem.userId).emit('reminder:failed', { id: rem._id }); } catch {}
        }
      }
    } catch (err) {
      console.error('[Cron] Reminder processor error:', err);
    }
  });
  console.log('[Cron] Per-minute reminder processor active');
}

// ─── 3. Morning summary (7:30 AM IST = 2:00 AM UTC) ──────────────────────────
export function scheduleMorningMedicationReminder(): void {
  cron.schedule('0 2 * * *', async () => {
    console.log('[Cron] Running morning medication summary...');
    try {
      const users = await UserModel.find({
        whatsappPhone: { $exists: true, $nin: [null, ''] },
      }).select('_id name whatsappPhone').lean();

      for (const user of users) {
        try {
          const meds = await PrescriptionModel.find({
            userId: user._id, status: 'active',
          }).select('drugName dosage').lean();

          if (!meds.length) continue;
          const firstName = user.name?.split(' ')[0] || 'there';
          await sendWhatsAppMessage(user.whatsappPhone!, buildMorningMsg(firstName, meds));
          console.log(`[Cron] ✅ Morning summary sent to ${user.whatsappPhone}`);
          await new Promise(r => setTimeout(r, 600)); // rate-limit
        } catch (err: any) {
          console.error(`[Cron] Morning summary failed for ${user.whatsappPhone}:`, err?.message);
        }
      }
    } catch (err) { console.error('[Cron] Morning job error:', err); }
  }, { timezone: 'UTC' });
  console.log('[Cron] Morning summary scheduled: 7:30 AM IST daily');
}

// ─── 4. Evening reminder (8:00 PM IST = 14:30 UTC) ───────────────────────────
export function scheduleEveningMedicationReminder(): void {
  cron.schedule('30 14 * * *', async () => {
    console.log('[Cron] Running evening medication reminders...');
    try {
      const users = await UserModel.find({
        whatsappPhone: { $exists: true, $nin: [null, ''] },
      }).select('_id name whatsappPhone').lean();

      for (const user of users) {
        try {
          const meds = await PrescriptionModel.find({
            userId: user._id, status: 'active',
            frequency: { $regex: /night|bedtime|dinner|evening|twice|pm|bd|tds|tid/i },
          }).select('drugName dosage frequency').lean();

          if (!meds.length) continue;
          const firstName = user.name?.split(' ')[0] || 'there';
          await sendWhatsAppMessage(
            user.whatsappPhone!,
            `🌙 *Evening Medication Reminder*\n\nHi ${firstName}! Time for your evening medicines:\n\n${meds.map(m => `• *${m.drugName}* — ${m.dosage}`).join('\n')}\n\n✅ Take them now!\n\n_— MedVault_`
          );
          console.log(`[Cron] ✅ Evening reminder sent to ${user.whatsappPhone}`);
          await new Promise(r => setTimeout(r, 600));
        } catch (err: any) {
          console.error(`[Cron] Evening reminder failed for ${user.whatsappPhone}:`, err?.message);
        }
      }
    } catch (err) { console.error('[Cron] Evening job error:', err); }
  }, { timezone: 'UTC' });
  console.log('[Cron] Evening reminder scheduled: 8:00 PM IST daily');
}

// ─── 5. Weekly health check-in (Monday 9 AM IST = Mon 3:30 AM UTC) ───────────
export function scheduleWeeklyCheckIn(): void {
  cron.schedule('30 3 * * 1', async () => {
    console.log('[Cron] Running weekly health check-in...');
    try {
      const users = await UserModel.find({
        whatsappPhone: { $exists: true, $nin: [null, ''] },
      }).select('_id name whatsappPhone').lean();

      for (const user of users) {
        try {
          const firstName = user.name?.split(' ')[0] || 'there';
          const activeMeds = await PrescriptionModel.countDocuments({ userId: user._id, status: 'active' });
          await sendWhatsAppMessage(
            user.whatsappPhone!,
            `📊 *Weekly Health Check-in*\n\nHi ${firstName}! 🌟 A new week, a healthier you!\n\nYou have *${activeMeds} active medication(s)* this week.\n\nSend *menu* to:\n• Check your lab results\n• View your health summary\n• Ask a health question\n\n_— MedVault Health Assistant_`
          );
          console.log(`[Cron] ✅ Weekly check-in sent to ${user.whatsappPhone}`);
          await new Promise(r => setTimeout(r, 600));
        } catch (err: any) {
          console.error(`[Cron] Weekly check-in failed for ${user.whatsappPhone}:`, err?.message);
        }
      }
    } catch (err) { console.error('[Cron] Weekly check-in error:', err); }
  }, { timezone: 'UTC' });
  console.log('[Cron] Weekly check-in scheduled: Monday 9:00 AM IST');
}

// ─── Start all ────────────────────────────────────────────────────────────────
export function startAllCronJobs(): void {
  scheduleReminderProcessor();
  scheduleMorningMedicationReminder();
  scheduleEveningMedicationReminder();
  scheduleWeeklyCheckIn();
  scheduleDailyReminderGeneration();
  console.log('[Cron] ✅ All 5 cron jobs started.');
}
