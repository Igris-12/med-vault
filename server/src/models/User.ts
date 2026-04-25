import mongoose, { Schema, Types } from 'mongoose';

export interface IUser {
  _id: string;  // Firebase UID stored as string
  email: string;
  name: string;
  photoUrl?: string;
  bloodType: string;
  dateOfBirth?: Date;
  allergies: string[];
  emergencyContacts: Array<{ name: string; phone: string; relationship: string }>;
  emergencyToken: string;
  modePreference: 'patient' | 'doctor';
  whatsappPhone?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true }, // Firebase UID
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    photoUrl: { type: String },
    bloodType: { type: String, default: 'unknown' },
    dateOfBirth: { type: Date },
    allergies: [{ type: String }],
    emergencyContacts: [
      {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        relationship: { type: String, required: true },
      },
    ],
    emergencyToken: { type: String, required: true, unique: true },
    modePreference: { type: String, enum: ['patient', 'doctor'], default: 'patient' },
    whatsappPhone: { type: String, sparse: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
