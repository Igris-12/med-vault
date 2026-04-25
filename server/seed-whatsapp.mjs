import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);

// Use the real User model schema shape minimally
const UserSchema = new mongoose.Schema({
  _id: String,
  name: String,
  email: String,
  whatsappPhone: String,
  bloodType: String,
  allergies: [String],
  emergencyContacts: [Object],
  emergencyToken: String,
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

const existing = await User.findById('dev-user-001');
if (existing) {
  await User.findByIdAndUpdate('dev-user-001', { whatsappPhone: '+919359025745' });
  console.log('✅ Updated dev-user-001 with WhatsApp phone +919359025745');
} else {
  await User.create({
    _id: 'dev-user-001',
    name: 'Dev User',
    email: 'dev@medvault.app',
    whatsappPhone: '+919359025745',
    bloodType: 'O+',
    allergies: [],
    emergencyContacts: [],
    emergencyToken: 'dev-token-001',
  });
  console.log('✅ Created dev-user-001 with WhatsApp phone +919359025745');
}

await mongoose.disconnect();
console.log('Done!');
