import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️  GEMINI_API_KEY not set — Gemini calls will fail');
}

export const genAI = new GoogleGenerativeAI(apiKey || 'missing-key');

export const flashModel = genAI.getGenerativeModel({
  model: 'gemini-3.1-flash-tts',
  generationConfig: {
    // Structured output — guarantees valid JSON, no markdown fences
    responseMimeType: 'application/json',
  },
});

export const flashChatModel = genAI.getGenerativeModel({
  model: 'gemini-3.1-flash-tts',
  // Chat uses plain text (streaming)
});
