import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import UserModel from '../models/User.js';

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
