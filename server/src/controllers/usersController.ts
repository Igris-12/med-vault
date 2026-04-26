import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import UserModel from '../models/User.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';

export const syncUser = async (req: Request, res: Response): Promise<void> => {
  const { uid, email, name, picture } = req.user!;

  const user = await UserModel.findByIdAndUpdate(
    uid,
    {
      $setOnInsert: {
        _id: uid,
        emergencyToken: uuidv4(),
        bloodType: 'unknown',
        allergies: [],
        emergencyContacts: [],
        modePreference: 'patient',
      },
      $set: { email, name, photoUrl: picture },
    },
    { upsert: true, returnDocument: 'after' }
  );

  res.json({ success: true, data: user });
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const user = await UserModel.findById(req.user!.uid);
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  res.json({ success: true, data: user });
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const allowed = [
    'name', 'bloodType', 'dateOfBirth', 'allergies', 'emergencyContacts',
    'modePreference', 'notificationPrefs', 'uiPrefs', 'photoUrl',
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const user = await UserModel.findByIdAndUpdate(
    req.user!.uid,
    { $set: updates },
    { returnDocument: 'after', runValidators: true }
  );
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  res.json({ success: true, data: user });
};

export const linkWhatsApp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body as { phone: string };
    if (!phone) {
      res.status(400).json({ success: false, error: 'phone is required' });
      return;
    }

    // Normalise to E.164 (+91XXXXXXXXXX for India)
    const digits = phone.replace(/\D/g, '');
    const e164 = digits.startsWith('91') && digits.length === 12
      ? `+${digits}`
      : `+91${digits}`;

    // Upsert: create user document if it doesn't exist yet (first-time login without syncUser)
    const user = await UserModel.findByIdAndUpdate(
      req.user!.uid,
      {
        $setOnInsert: {
          _id: req.user!.uid,
          email: req.user!.email || '',
          name: req.user!.name || 'MedVault User',
          photoUrl: req.user!.picture || '',
          emergencyToken: uuidv4(),
          bloodType: 'unknown',
          allergies: [],
          emergencyContacts: [],
          modePreference: 'patient',
        },
        $set: { whatsappPhone: e164 },
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Send a confirmation WhatsApp to prove the link works
    try {
      const firstName = (user?.name || 'there').split(' ')[0];
      await sendWhatsAppMessage(
        e164,
        `✅ MedVault connected!\n\nHi ${firstName}! Your health assistant is ready.\n\nSend *menu* to see what I can do, or just ask me anything about your records.`
      );
    } catch (err: any) {
      // Twilio sandbox: unregistered numbers get a specific error
      const errMsg = err?.message || String(err);
      if (errMsg.includes('unregistered') || errMsg.includes('21608') || errMsg.includes('not a valid')) {
        console.warn('WhatsApp: number not registered in sandbox:', e164);
        // Still save the number but warn the user
        res.json({
          success: true,
          data: { whatsappPhone: e164 },
          warning: 'Number saved, but the WhatsApp confirmation failed. Make sure this number has joined the Twilio sandbox by sending "join <keyword>" to +14155238886 first.',
        });
        return;
      }
      console.warn('WhatsApp welcome message failed:', err);
    }

    res.json({ success: true, data: { whatsappPhone: e164 } });
  } catch (err) {
    console.error('linkWhatsApp error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const regenerateEmergencyToken = async (req: Request, res: Response): Promise<void> => {
  const newToken = uuidv4();
  const user = await UserModel.findByIdAndUpdate(
    req.user!.uid,
    { $set: { emergencyToken: newToken } },
    { returnDocument: 'after' }
  );
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  res.json({ success: true, data: { emergencyToken: newToken } });
};

// ─── Send an immediate test WhatsApp reminder ─────────────────────────────────
export const sendTestReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await UserModel.findById(req.user!.uid).select('name whatsappPhone').lean();
    if (!user?.whatsappPhone) {
      res.status(400).json({ success: false, error: 'No WhatsApp number linked. Go to Settings → WhatsApp.' });
      return;
    }

    const firstName = user.name?.split(' ')[0] || 'there';
    const msg = req.body?.message ||
      `🧪 *MedVault Test Reminder*\n\nHi ${firstName}! This is a test message from MedVault to confirm your WhatsApp reminders are working.\n\n✅ If you see this, your reminder setup is working perfectly!\n\nSend *menu* to explore MedVault features.\n\n_— MedVault Health Assistant_`;

    await sendWhatsAppMessage(user.whatsappPhone, msg);
    res.json({ success: true, data: { sent: true, to: user.whatsappPhone } });
  } catch (err: any) {
    console.error('[Test Reminder] Error:', err);
    const isSandbox = err?.message?.includes('21608') || err?.code === 21608;
    res.status(isSandbox ? 400 : 500).json({
      success: false,
      error: isSandbox
        ? 'Your number is not joined to the Twilio Sandbox. Send "join <sandbox-word>" to +1 415 523 8886 on WhatsApp first.'
        : err.message || 'Failed to send WhatsApp message',
    });
  }
};

// ─── Manually schedule a reminder (creates a Reminder document) ───────────────
export const scheduleReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, scheduledAt, frequency = 'once', tag = 'manual', phone: bodyPhone } = req.body as {
      message: string; scheduledAt: string; frequency?: string; tag?: string; phone?: string;
    };
    if (!message || !scheduledAt) {
      res.status(400).json({ success: false, error: 'message and scheduledAt are required' });
      return;
    }

    // Validate scheduledAt is in the future
    const schedDate = new Date(scheduledAt);
    if (isNaN(schedDate.getTime())) {
      res.status(400).json({ success: false, error: 'Invalid scheduledAt date' });
      return;
    }
    if (schedDate <= new Date()) {
      res.status(400).json({ success: false, error: 'Scheduled time must be in the future' });
      return;
    }

    const user = await UserModel.findById(req.user!.uid).select('name whatsappPhone').lean();
    const phone = bodyPhone || user?.whatsappPhone;
    if (!phone) {
      res.status(400).json({ success: false, error: 'No WhatsApp number. Link one in Settings → Profile first.' });
      return;
    }

    const { default: ReminderModel } = await import('../models/Reminder.js');
    const reminder = await ReminderModel.create({
      userId:      req.user!.uid,
      phone:       phone.startsWith('+') ? phone : `+${phone}`,
      message,
      scheduledAt: schedDate,
      frequency,
      tag,
      status:      'pending',
    });

    console.log(`[Reminder] Scheduled: ${reminder._id} → ${phone} at ${schedDate.toISOString()} [${frequency}]`);
    res.json({ success: true, data: reminder });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};


