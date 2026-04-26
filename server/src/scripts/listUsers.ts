import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;
  const users = await db.collection('users').find({}).limit(10).project({ _id: 1, name: 1, email: 1 }).toArray();
  console.log('\n=== Users in DB ===');
  users.forEach(u => console.log(`UID: ${u._id}  |  Name: ${u.name}  |  Email: ${u.email}`));
  console.log(`\nTotal: ${users.length}`);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
