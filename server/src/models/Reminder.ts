import mongoose, { Schema, Document } from 'mongoose';

export interface IReminder extends Document {
  userId: string;
  phone: string;
  message: string;
  scheduledAt: Date;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  tag: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  createdAt: Date;
}

const ReminderSchema = new Schema<IReminder>(
  {
    userId: { type: String, required: true, index: true },
    phone: { type: String, required: true },
    message: { type: String, required: true },
    scheduledAt: { type: Date, required: true, index: true },
    frequency: { type: String, enum: ['once', 'daily', 'weekly', 'monthly'], default: 'once' },
    tag: { type: String, default: 'general' },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IReminder>('Reminder', ReminderSchema);
