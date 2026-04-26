import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import PrescriptionModel from '../models/Prescription.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  const meds = await PrescriptionModel.find();
  console.log(`Found ${meds.length} prescriptions in DB.`);
  for (const m of meds) {
    console.log(`\nMed: ${m.drugName}`);
    console.log(`Source Doc ID: ${m.sourceDocumentId}`);
    console.log(`Doctor: ${m.prescribingDoctor}`);
  }
  process.exit(0);
}
run();
