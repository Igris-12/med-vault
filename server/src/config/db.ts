import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.set('strictQuery', true);

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/medvault';

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected:', MONGODB_URI.replace(/\/\/.*@/, '//***@'));
  } catch (error) {
    console.warn('⚠️  MongoDB unavailable:', error instanceof Error ? error.message : error);
    throw error; // let caller decide
  }

  mongoose.connection.on('error', (err: any) => {
    console.error('MongoDB runtime error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
  });
};
