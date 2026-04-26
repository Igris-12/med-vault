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
