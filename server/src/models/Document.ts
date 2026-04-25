import mongoose, { Schema, Document as MongoDoc } from 'mongoose';

export interface IDocument extends MongoDoc {
  userId: string;
  filename: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'done' | 'failed';
  uploadedAt: Date;
  processedAt?: Date;
  documentType: string;
  documentDate?: Date;
  sourceHospital?: string;
  doctorName?: string;
  conditionsMentioned: string[];
  medications: Array<{ name: string; dosage: string; frequency: string; duration: string }>;
  labValues: Array<{
    test_name: string;
    value: string;
    unit: string;
    reference_range: string;
    is_abnormal: boolean;
  }>;
  summaryPlain: string;
  summaryClinical: string;
  criticalityScore: number;
  keyFindings: string[];
  tags: string[];
  embedding: number[];
  rawGeminiResponse?: string;
}

const DocumentSchema = new Schema<IDocument>(
  {
    userId: { type: String, required: true, index: true },
    filename: { type: String, required: true },
    filePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'processing', 'done', 'failed'], default: 'pending' },
    uploadedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    documentType: { type: String, default: 'other' },
    documentDate: { type: Date, index: true },
    sourceHospital: { type: String },
    doctorName: { type: String },
    conditionsMentioned: [{ type: String }],
    medications: [
      {
        name: String,
        dosage: String,
        frequency: String,
        duration: String,
      },
    ],
    labValues: [
      {
        test_name: String,
        value: String,
        unit: String,
        reference_range: String,
        is_abnormal: Boolean,
      },
    ],
    summaryPlain: { type: String, default: '' },
    summaryClinical: { type: String, default: '' },
    criticalityScore: { type: Number, default: 1, min: 1, max: 10 },
    keyFindings: [{ type: String }],
    tags: [{ type: String }],
    embedding: [{ type: Number }],
    rawGeminiResponse: { type: String },
  },
  { timestamps: true }
);

// Text index for search
DocumentSchema.index({ summaryPlain: 'text', conditionsMentioned: 'text' });

export default mongoose.model<IDocument>('Document', DocumentSchema);
