import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppMessage extends Document {
  userId: string | null;   // null if not yet linked
  phoneNumber: string;     // E.164 format
  direction: 'in' | 'out';
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  timestamp: Date;
}

const WhatsAppMessageSchema = new Schema<IWhatsAppMessage>(
  {
    userId: { type: String, index: true, default: null },
    phoneNumber: { type: String, required: true, index: true },
    direction: { type: String, enum: ['in', 'out'], required: true },
    content: { type: String, required: true },
    mediaUrl: { type: String },
    mediaType: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export default mongoose.model<IWhatsAppMessage>('WhatsAppMessage', WhatsAppMessageSchema);
