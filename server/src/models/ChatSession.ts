import mongoose, { Schema, Document } from 'mongoose';

export interface IChatSession extends Document {
  userId: string;
  title: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    sourceDocIds: mongoose.Types.ObjectId[];
    timestamp: Date;
  }>;
  createdAt: Date;
}

const ChatSessionSchema = new Schema<IChatSession>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, default: 'New Conversation' },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        sourceDocIds: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
