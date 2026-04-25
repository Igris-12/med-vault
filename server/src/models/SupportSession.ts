import mongoose, { Schema, Document } from 'mongoose';

export interface ISupportMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ISupportSession extends Document {
  userId: string | null;
  sessionId: string;   // browser-generated UUID
  messages: ISupportMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const SupportSessionSchema = new Schema<ISupportSession>(
  {
    userId: { type: String, index: true, default: null },
    sessionId: { type: String, required: true, unique: true },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<ISupportSession>('SupportSession', SupportSessionSchema);
