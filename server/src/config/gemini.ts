/**
 * gemini.ts — Google Generative AI configuration
 *
 * Only the text-embedding-004 model is instantiated here.
 * All other Gemini *generation* calls are routed through the
 * ai/server.py Playwright proxy (see services/aiClient.ts).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️  GEMINI_API_KEY not set — embedding calls will fail (vector search disabled)');
}

export const genAI = new GoogleGenerativeAI(apiKey || 'missing-key');

/**
 * Embedding model — used only for generateEmbedding().
 * Generation tasks (text + image) are handled by aiClient.ts.
 */
export const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
