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
    { upsert: true, new: true }
  );

  res.json({ success: true, data: user });
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const user = await UserModel.findById(req.user!.uid);
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  res.json({ success: true, data: user });
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const user = await UserModel.findByIdAndUpdate(
    req.user!.uid,
    { $set: req.body },
    { new: true }
  );
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

    const user = await UserModel.findByIdAndUpdate(
      req.user!.uid,
      { $set: { whatsappPhone: e164 } },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Send a confirmation WhatsApp to prove the link works
    try {
      const firstName = user.name.split(' ')[0];
      await sendWhatsAppMessage(
        e164,
        `✅ MedVault connected!\n\nHi ${firstName}! Your health assistant is ready.\n\nSend *menu* to see what I can do, or just ask me anything about your records.`
      );
    } catch (err) {
      // Don't fail the endpoint if WhatsApp delivery fails — phone is already saved
      console.warn('WhatsApp welcome message failed:', err);
    }

    res.json({ success: true, data: { whatsappPhone: e164 } });
  } catch (err) {
    console.error('linkWhatsApp error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

