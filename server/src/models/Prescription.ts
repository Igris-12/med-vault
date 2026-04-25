import mongoose, { Schema, Document } from 'mongoose';

export interface IPrescription extends Document {
  userId: string;
  drugName: string;
  dosage: string;
  frequency: string;
  prescribingDoctor: string;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'discontinued';
  sourceDocumentId?: mongoose.Types.ObjectId;
  interactionWarnings: string[];
  interactionSeverity: 'none' | 'mild' | 'moderate' | 'severe';
  createdAt: Date;
}

const PrescriptionSchema = new Schema<IPrescription>(
  {
    userId: { type: String, required: true, index: true },
    drugName: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    prescribingDoctor: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, enum: ['active', 'discontinued'], default: 'active' },
    sourceDocumentId: { type: Schema.Types.ObjectId, ref: 'Document' },
    interactionWarnings: [{ type: String }],
    interactionSeverity: {
      type: String,
      enum: ['none', 'mild', 'moderate', 'severe'],
      default: 'none',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IPrescription>('Prescription', PrescriptionSchema);
