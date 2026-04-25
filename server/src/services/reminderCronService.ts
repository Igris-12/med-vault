import cron from 'node-cron';
import UserModel from '../models/User.js';
import PrescriptionModel from '../models/Prescription.js';
import { sendWhatsAppMessage } from './whatsappService.js';

// ─── Language-aware messages ───────────────────────────────────────────────────
function medReminderMsg(lang: string, name: string, drug: string, dosage: string, freq: string): string {
  const msgs: Record<string, string> = {
    English:  `💊 *Medication Reminder*\n\nHi ${name}! Time to take your medication:\n\n*${drug}* — ${dosage}\n🕐 ${freq}\n\n_Stay healthy! — MedVault_`,
    Hindi:    `💊 *दवा याद दिलाने वाला*\n\nनमस्ते ${name}! आपकी दवा लेने का समय:\n\n*${drug}* — ${dosage}\n🕐 ${freq}\n\n_स्वस्थ रहें! — MedVault_`,
    Marathi:  `💊 *औषध स्मरणपत्र*\n\nनमस्कार ${name}! तुमचे औषध घेण्याची वेळ:\n\n*${drug}* — ${dosage}\n🕐 ${freq}\n\n_निरोगी राहा! — MedVault_`,
    Tamil:    `💊 *மருந்து நினைவூட்டல்*\n\nவணக்கம் ${name}! உங்கள் மருந்து உட்கொள்ளும் நேரம்:\n\n*${drug}* — ${dosage}\n🕐 ${freq}\n\n_ஆரோக்கியமாக இருங்கள்! — MedVault_`,
    Telugu:   `💊 *మందు రిమైండర్*\n\nనమస్తే ${name}! మీ మందు తీసుకునే సమయం:\n\n*${drug}* — ${dosage}\n🕐 ${freq}\n\n_ఆరోగ్యంగా ఉండండి! — MedVault_`,
    Bengali:  `💊 *ওষুধের অনুস্মারক*\n\nনমস্কার ${name}! আপনার ওষুধ খাওয়ার সময়:\n\n*${drug}* — ${dosage}\n🕐 ${freq}\n\n_সুস্থ থাকুন! — MedVault_`,
    Gujarati: `💊 *દવાની યાદ*\n\nનમસ્તે ${name}! તમારી દવા લેવાનો સમય:\n\n*${drug}* — ${dosage}\n🕐 ${freq}\n\n_સ્વસ્થ રહો! — MedVault_`,
    Kannada:  `💊 *ಔಷಧಿ ರಿಮೈಂಡರ್*\n\nನಮಸ್ಕಾರ ${name}! ನಿಮ್ಮ ಔಷಧಿ ತೆಗೆದುಕೊಳ್ಳುವ ಸಮಯ:\n\n*${drug}* — ${dosage}\n🕐 ${freq}\n\n_ಆರೋಗ್ಯವಾಗಿರಿ! — MedVault_`,
  };
  return msgs[lang] || msgs['English'];
}

function morningGreetingMsg(lang: string, name: string, count: number): string {
  const msgs: Record<string, string> = {
    English:  `☀️ *Good morning, ${name}!*\n\nYou have *${count} active medication(s)* to take today.\n\nSend *2* for your health summary or *1* for today's health tip.\n\n_— MedVault Health Assistant_`,
    Hindi:    `☀️ *सुप्रभात, ${name}!*\n\nआज आपको *${count} दवा(एं)* लेनी हैं।\n\nस्वास्थ्य सारांश के लिए *2* भेजें।\n\n_— MedVault_`,
    Marathi:  `☀️ *सुप्रभात, ${name}!*\n\nआज तुम्हाला *${count} औषध(े)* घ्यायची आहेत।\n\nआरोग्य सारांशासाठी *2* पाठवा।\n\n_— MedVault_`,
  };
  return msgs[lang] || msgs['English'];
}

// ─── Morning medication summary (every day at 7:30 AM IST = 2:00 UTC) ─────────
export function scheduleMorningMedicationReminder(): void {
  cron.schedule('0 2 * * *', async () => {
    console.log('[Cron] Running morning medication reminder...');
    try {
      const users = await UserModel.find({ whatsappPhone: { $exists: true, $ne: null } })
        .select('_id name whatsappPhone');

      for (const user of users) {
        try {
          const activeMeds = await PrescriptionModel.find({
            userId: user._id,
            status: 'active',
          }).select('drugName dosage frequency');

          if (!activeMeds.length) continue;

          const firstName = user.name?.split(' ')[0] || 'there';
          // Fetch language preference from session (in-memory) or default to English
          const lang = 'English'; // sessions are in-memory; morning reminder defaults English

          const msg = morningGreetingMsg(lang, firstName, activeMeds.length);
          await sendWhatsAppMessage(user.whatsappPhone!, msg);

          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 500));
        } catch (err) {
          console.error(`[Cron] Failed to send morning reminder to ${user.whatsappPhone}:`, err);
        }
      }
    } catch (err) {
      console.error('[Cron] Morning reminder job failed:', err);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('[Cron] Morning medication reminder scheduled: 7:30 AM IST daily');
}

// ─── Evening medication reminder (every day at 8:00 PM IST = 14:30 UTC) ───────
export function scheduleEveningMedicationReminder(): void {
  cron.schedule('30 14 * * *', async () => {
    console.log('[Cron] Running evening medication reminder...');
    try {
      const users = await UserModel.find({ whatsappPhone: { $exists: true, $ne: null } })
        .select('_id name whatsappPhone');

      for (const user of users) {
        try {
          const eveningMeds = await PrescriptionModel.find({
            userId: user._id,
            status: 'active',
            frequency: { $regex: /evening|night|twice|dinner|pm/i },
          }).select('drugName dosage frequency');

          if (!eveningMeds.length) continue;

          const firstName = user.name?.split(' ')[0] || 'there';
          for (const med of eveningMeds) {
            const msg = medReminderMsg('English', firstName, med.drugName, med.dosage, med.frequency);
            await sendWhatsAppMessage(user.whatsappPhone!, msg);
            await new Promise(r => setTimeout(r, 500));
          }
        } catch (err) {
          console.error(`[Cron] Evening reminder failed for ${user.whatsappPhone}:`, err);
        }
      }
    } catch (err) {
      console.error('[Cron] Evening reminder job failed:', err);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('[Cron] Evening medication reminder scheduled: 8:00 PM IST daily');
}

// ─── Weekly health check-in (every Monday 9:00 AM IST) ─────────────────────────
export function scheduleWeeklyCheckIn(): void {
  cron.schedule('0 3 * * 1', async () => {
    console.log('[Cron] Running weekly health check-in...');
    try {
      const users = await UserModel.find({ whatsappPhone: { $exists: true, $ne: null } })
        .select('_id name whatsappPhone');

      for (const user of users) {
        try {
          const firstName = user.name?.split(' ')[0] || 'there';
          const msg = `📊 *Weekly Health Check-in*\n\nHi ${firstName}! Start your week healthy.\n\nSend *2* to see your health summary or *1* for today's health tip.\n\n_— MedVault Health Assistant_`;
          await sendWhatsAppMessage(user.whatsappPhone!, msg);
          await new Promise(r => setTimeout(r, 500));
        } catch (err) {
          console.error(`[Cron] Weekly check-in failed for ${user.whatsappPhone}:`, err);
        }
      }
    } catch (err) {
      console.error('[Cron] Weekly check-in job failed:', err);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('[Cron] Weekly health check-in scheduled: Monday 9:00 AM IST');
}

// ─── Start all cron jobs ────────────────────────────────────────────────────────
export function startAllCronJobs(): void {
  scheduleMorningMedicationReminder();
  scheduleEveningMedicationReminder();
  scheduleWeeklyCheckIn();
  console.log('[Cron] All reminder jobs started.');
}
