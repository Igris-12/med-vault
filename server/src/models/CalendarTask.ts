import mongoose, { Schema, Document } from 'mongoose';

export interface ICalendarTask extends Document {
  userId: string;
  title: string;
  dateStr: string;
  timeStr: string;
  fullDateStr: string;
  colorBg: string;
  colorDot: string;
  rating: number;
  reminderId?: string;
  createdAt: Date;
}

const CalendarTaskSchema = new Schema<ICalendarTask>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    dateStr: { type: String, required: true, index: true },
    timeStr: { type: String, required: true },
    fullDateStr: { type: String, required: true },
    colorBg: { type: String, required: true },
    colorDot: { type: String, required: true },
    rating: { type: Number, default: 5 },
    reminderId: { type: String }, // References Reminder _id
  },
  { timestamps: true }
);

export default mongoose.model<ICalendarTask>('CalendarTask', CalendarTaskSchema);
