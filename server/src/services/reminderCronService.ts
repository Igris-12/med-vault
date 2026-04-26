import cron from 'node-cron';
import UserModel from '../models/User.js';
import PrescriptionModel from '../models/Prescription.js';
import ReminderModel from '../models/Reminder.js';
import { sendWhatsAppMessage } from './whatsappService.js';
import { io } from '../index.js';

// ─── Language-aware messages ───────────────────────────────────────────────────
function medReminderMsg(lang: string, name: string, drug: string, dosage: string, freq: string): string {
  const msgs: Record<string, string> = {
    English:  `💊 *Medication Reminder*\n\nHi ${name}! Time to take your medication:\n\n*${drug}* — ${dosage}\n🕐 ${freq}\n\n_Stay healthy! — MedVault_`,
    Hindi:    `💊 *दवा याद दिलाने वाला*\n\nनमस्ते ${name}! आपकी दवा लेने का समय:\n\n*${drug}* — ${dosage}\n🕐 ${freq}\n\n_स्वस्थ रहें! — MedVault_`,
  };
  return msgs[lang] || msgs['English'];
}

function morningGreetingMsg(lang: string, name: string, count: number): string {
  const msgs: Record<string, string> = {
    English:  `☀️ *Good morning, ${name}!*\n\nYou have *${count} active medication(s)* to take today.\n\nSend *2* for your health summary or *1* for today's health tip.\n\n_— MedVault Health Assistant_`,
    Hindi:    `☀️ *सुप्रभात, ${name}!*\n\nआज आपको *${count} दवा(एं)* लेनी हैं।\n\nस्वास्थ्य सारांश के लिए *2* भेजें।\n\n_— MedVault_`,
  };
  return msgs[lang] || msgs['English'];
}

// ─── Per-minute: process scheduled Reminders ──────────────────────────────────
export function scheduleReminderProcessor(): void {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const pending = await ReminderModel.find({
        status: 'pending',
        scheduledAt: { $lte: now },
      }).limit(20);

      if (!pending.length) return;

      for (const rem of pending) {
        try {
          await sendWhatsAppMessage(rem.phone, rem.message);
          rem.status = 'sent';
          await rem.save();
          try { io.to(rem.userId).emit('reminder:sent', { id: rem._id, message: rem.message }); } catch {}

          // Schedule next occurrence for recurring reminders
          if (rem.frequency !== 'once') {
            const next = new Date(rem.scheduledAt);
            if (rem.frequency === 'daily') next.setDate(next.getDate() + 1);
            else if (rem.frequency === 'weekly') next.setDate(next.getDate() + 7);
            else if (rem.frequency === 'monthly') next.setMonth(next.getMonth() + 1);
            await ReminderModel.create({
              userId: rem.userId, phone: rem.phone, message: rem.message,
              scheduledAt: next, frequency: rem.frequency, tag: rem.tag, status: 'pending',
            });
          }
        } catch (err) {
          rem.status = 'failed';
          await rem.save();
          try { io.to(rem.userId).emit('reminder:failed', { id: rem._id }); } catch {}
          console.error(`[Cron] Reminder send failed:`, err);
        }
      }
    } catch (err) {
      console.error('[Cron] Reminder processor error:', err);
    }
  });
  console.log('[Cron] Per-minute reminder processor scheduled');
}

// ─── Morning medication summary (7:30 AM IST daily) ──────────────────────────
export function scheduleMorningMedicationReminder(): void {
  cron.schedule('0 2 * * *', async () => {
    try {
      const users = await UserModel.find({ whatsappPhone: { $exists: true, $ne: null } }).select('_id name whatsappPhone');
      for (const user of users) {
        try {
          const count = await PrescriptionModel.countDocuments({ userId: user._id, status: 'active' });
          if (!count) continue;
          const msg = morningGreetingMsg('English', user.name?.split(' ')[0] || 'there', count);
          await sendWhatsAppMessage(user.whatsappPhone!, msg);
          await new Promise(r => setTimeout(r, 500));
        } catch (err) { console.error(`[Cron] Morning reminder failed for ${user.whatsappPhone}:`, err); }
      }
    } catch (err) { console.error('[Cron] Morning reminder job failed:', err); }
  }, { timezone: 'Asia/Kolkata' });
  console.log('[Cron] Morning medication reminder scheduled: 7:30 AM IST daily');
}

// ─── Evening medication reminder (8:00 PM IST daily) ─────────────────────────
export function scheduleEveningMedicationReminder(): void {
  cron.schedule('30 14 * * *', async () => {
    try {
      const users = await UserModel.find({ whatsappPhone: { $exists: true, $ne: null } }).select('_id name whatsappPhone');
      for (const user of users) {
        try {
          const meds = await PrescriptionModel.find({
            userId: user._id, status: 'active', frequency: { $regex: /evening|night|twice|dinner|pm/i },
          }).select('drugName dosage frequency');
          if (!meds.length) continue;
          const firstName = user.name?.split(' ')[0] || 'there';
          for (const med of meds) {
            await sendWhatsAppMessage(user.whatsappPhone!, medReminderMsg('English', firstName, med.drugName, med.dosage, med.frequency));
            await new Promise(r => setTimeout(r, 500));
          }
        } catch (err) { console.error(`[Cron] Evening reminder failed for ${user.whatsappPhone}:`, err); }
      }
    } catch (err) { console.error('[Cron] Evening reminder job failed:', err); }
  }, { timezone: 'Asia/Kolkata' });
  console.log('[Cron] Evening medication reminder scheduled: 8:00 PM IST daily');
}

// ─── Weekly health check-in (Monday 9:00 AM IST) ─────────────────────────────
export function scheduleWeeklyCheckIn(): void {
  cron.schedule('0 3 * * 1', async () => {
    try {
      const users = await UserModel.find({ whatsappPhone: { $exists: true, $ne: null } }).select('_id name whatsappPhone');
      for (const user of users) {
        try {
          const firstName = user.name?.split(' ')[0] || 'there';
          await sendWhatsAppMessage(user.whatsappPhone!, `📊 *Weekly Health Check-in*\n\nHi ${firstName}! Start your week healthy.\n\nSend *2* for health summary or *1* for today's tip.\n\n_— MedVault_`);
          await new Promise(r => setTimeout(r, 500));
        } catch (err) { console.error(`[Cron] Weekly check-in failed for ${user.whatsappPhone}:`, err); }
      }
    } catch (err) { console.error('[Cron] Weekly check-in job failed:', err); }
  }, { timezone: 'Asia/Kolkata' });
  console.log('[Cron] Weekly health check-in scheduled: Monday 9:00 AM IST');
}

// ─── Start all cron jobs ────────────────────────────────────────────────────────
export function startAllCronJobs(): void {
  scheduleReminderProcessor();
  scheduleMorningMedicationReminder();
  scheduleEveningMedicationReminder();
  scheduleWeeklyCheckIn();
  console.log('[Cron] All reminder jobs started.');
}
