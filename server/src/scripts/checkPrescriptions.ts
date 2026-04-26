import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import DocumentModel from '../models/Document.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  const docs = await DocumentModel.find({ documentType: 'prescription' });
  console.log(`Found ${docs.length} prescriptions.`);
  for (const doc of docs) {
    console.log(`\nDoc ID: ${doc._id}, UserID: ${doc.userId}, Filename: ${doc.filename}`);
  }
  process.exit(0);
}
run();
