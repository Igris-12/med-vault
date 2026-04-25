import { flashModel, genAI } from '../config/gemini.js';
import { Medication, LabValue } from '../types/api.js';

// ─── Extraction Prompt ────────────────────────────────────────────────────────
const EXTRACTION_PROMPT = `
You are a medical document analysis AI. Extract all medical information from the provided document.
Return ONLY a valid JSON object matching this exact schema. No explanation, no markdown, no preamble.

{
  "document_type": "lab_report | discharge_summary | prescription | imaging | vaccination | consultation | other",
  "document_date": "ISO 8601 date string or null",
  "source_hospital": "string or null",
  "doctor_name": "string or null",
  "conditions_mentioned": ["array of condition strings"],
  "medications": [{"name": "string", "dosage": "string", "frequency": "string", "duration": "string"}],
  "lab_values": [{"test_name": "string", "value": "string", "unit": "string", "reference_range": "string", "is_abnormal": true}],
  "summary_plain": "Under 80 words. Second person. Zero medical jargon. What does this mean for the patient?",
  "summary_clinical": "Under 120 words. Full clinical terminology. For a physician.",
  "criticality_score": 5,
  "key_findings": ["up to 3 strings, most critical insights"],
  "tags": ["3-5 semantic tags like kidney function, diabetes management, cardiovascular"]
}
`.trim();

// ─── Retry wrapper ────────────────────────────────────────────────────────────
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxAttempts) {
        const delay = Math.pow(3, attempt - 1) * 1000;
        console.warn(`Gemini attempt ${attempt} failed. Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ─── Call queue (serial processing) ─────────────────────────────────────────
type QueueTask = () => Promise<void>;
const queue: QueueTask[] = [];
let isProcessing = false;

function enqueue(task: QueueTask): void {
  queue.push(task);
  if (!isProcessing) processQueue();
}

async function processQueue(): Promise<void> {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;
  while (queue.length > 0) {
    const task = queue.shift()!;
    try {
      await task();
    } catch (err) {
      console.error('Queue task failed:', err);
    }
  }
  isProcessing = false;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export interface ExtractedDocument {
  document_type: string;
  document_date: string | null;
  source_hospital: string | null;
  doctor_name: string | null;
  conditions_mentioned: string[];
  medications: Medication[];
  lab_values: LabValue[];
  summary_plain: string;
  summary_clinical: string;
  criticality_score: number;
  key_findings: string[];
  tags: string[];
}

export function extractDocumentQueued(
  buffer: Buffer,
  mimeType: string,
  onResult: (result: ExtractedDocument | null, raw?: string) => void
): void {
  enqueue(async () => {
    const result = await extractDocument(buffer, mimeType);
    onResult(result.data, result.raw);
  });
}

async function extractDocument(
  buffer: Buffer,
  mimeType: string
): Promise<{ data: ExtractedDocument | null; raw?: string }> {
  const base64 = buffer.toString('base64');

  return withRetry(async () => {
    const result = await flashModel.generateContent([
      EXTRACTION_PROMPT,
      { inlineData: { mimeType, data: base64 } },
    ]);

    const text = result.response.text();

    // responseMimeType: 'application/json' guarantees valid JSON, but still guard
    try {
      const parsed = JSON.parse(text) as ExtractedDocument;
      return { data: parsed };
    } catch {
      console.error('JSON parse failed despite structured output mode:', text.slice(0, 200));
      return { data: null, raw: text };
    }
  });
}

export async function generateEmbedding(text: string): Promise<number[]> {
  return withRetry(async () => {
    const result = await genAI.getGenerativeModel({ model: 'text-embedding-004' }).embedContent({
      content: { role: 'user', parts: [{ text }] },
    });
    return result.embedding.values;
  });
}

export async function generateAnomalyInsight(
  testName: string,
  readings: Array<{ value: number; unit: string; date: string }>
): Promise<string> {
  return withRetry(async () => {
    const chatModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
A patient has the following ${testName} readings over time:
${readings.map((r) => `- ${r.date}: ${r.value} ${r.unit}`).join('\n')}

Write ONE paragraph (under 60 words) explaining what this trend means for the patient in plain language.
Do not diagnose. Do not recommend specific treatments. Be honest but reassuring.
Return only the paragraph text, no preamble.
`.trim();

    const result = await chatModel.generateContent(prompt);
    return result.response.text().trim();
  });
}

export async function checkInteractions(
  drugNames: string[]
): Promise<Array<{ drug1: string; drug2: string; severity: string; description: string }>> {
  if (drugNames.length < 2) return [];

  return withRetry(async () => {
    const prompt = `
Check for known drug interactions between these medications: ${drugNames.join(', ')}.
Return a JSON array. Each element: {"drug1": "name", "drug2": "name", "severity": "none|mild|moderate|severe", "description": "one sentence"}.
If no interactions, return an empty array [].
Return ONLY valid JSON, no markdown.
`.trim();

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  });
}

export async function* streamChatResponse(
  systemContext: string,
  userMessage: string
): AsyncGenerator<string> {
  const chatModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const fullPrompt = `${systemContext}\n\nPatient question: ${userMessage}`;
  const stream = await chatModel.generateContentStream(fullPrompt);

  for await (const chunk of stream.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

// ─── Non-streaming response (for WhatsApp — cannot stream) ───────────────────
export async function generateContent(prompt: string): Promise<string> {
  return withRetry(async () => {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  });
}
