/**
 * geminiService.ts
 *
 * All AI *generation* calls (text + image) are routed through the
 * ai/server.py Playwright proxy via aiClient.ts.
 *
 * Text embeddings still use the Google SDK directly
 * (text-embedding-004), because the Gemini web UI does not
 * expose an embeddings endpoint.
 */

import { embeddingModel } from '../config/gemini.js';
import { queryText, queryImage } from './aiClient.js';
import { Medication, LabValue } from '../types/api.js';

// ContextBuilder is imported lazily inside functions to avoid circular deps
// (contextBuilder → geminiService for generateEmbedding)

// ─── Prescription BBox Extraction Types ───────────────────────────────────────
export interface FieldExtraction {
  value: string | null;
  bounding_box: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0–1
  confidence_score: number; // 1–100
  confidence_reason: string;
}

export interface MedicationExtraction {
  medication_name: FieldExtraction;
  dosage: FieldExtraction;
  frequency: FieldExtraction;
  duration: FieldExtraction;
  instructions: FieldExtraction;
}

export interface PrescriptionExtraction {
  patient_name: FieldExtraction;
  doctor_name: FieldExtraction;
  date: FieldExtraction;
  medications: MedicationExtraction[];
  diagnosis: FieldExtraction;
  overall_legibility: number;
}

// ─── Prescription BBox Prompt ────────────────────────────────────────────────
const PRESCRIPTION_BBOX_PROMPT = `
You are a medical document extraction AI. You will be given an image of a handwritten doctor's prescription.

Your job is to extract all medical information and return it as a single valid JSON object. No explanation, no markdown, no backticks — pure JSON only.

For EVERY field you extract, you must also return:
1. A bounding_box as [ymin, xmin, ymax, xmax] in normalized coordinates (0.0 to 1.0), representing where on the image you found this text.
2. A confidence_score from 1 to 100 based purely on how legible the handwriting is for that specific field.
3. A confidence_reason: a single short phrase explaining the score (e.g. "clearly printed", "cursive, ambiguous letter", "partially obscured by ink smudge").

Return this exact JSON structure:

{
  "patient_name": { "value": "", "bounding_box": [], "confidence_score": 0, "confidence_reason": "" },
  "doctor_name": { "value": "", "bounding_box": [], "confidence_score": 0, "confidence_reason": "" },
  "date": { "value": "", "bounding_box": [], "confidence_score": 0, "confidence_reason": "" },
  "medications": [
    {
      "medication_name": { "value": "", "bounding_box": [], "confidence_score": 0, "confidence_reason": "" },
      "dosage": { "value": "", "bounding_box": [], "confidence_score": 0, "confidence_reason": "" },
      "frequency": { "value": "", "bounding_box": [], "confidence_score": 0, "confidence_reason": "" },
      "duration": { "value": "", "bounding_box": [], "confidence_score": 0, "confidence_reason": "" },
      "instructions": { "value": "", "bounding_box": [], "confidence_score": 0, "confidence_reason": "" }
    }
  ],
  "diagnosis": { "value": "", "bounding_box": [], "confidence_score": 0, "confidence_reason": "" },
  "overall_legibility": 0
}

Rules:
- If a field is not present in the prescription, set value to null and confidence_score to 0.
- Bounding boxes must tightly wrap only the handwritten text for that field, not the entire document.
- overall_legibility is the average confidence across all extracted fields, rounded to the nearest integer.
- Never hallucinate drug names. If you cannot read a medication name with at least 40% confidence, set value to "ILLEGIBLE" and confidence_score to the actual score.
`.trim();

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
        console.warn(`AI proxy attempt ${attempt} failed. Retrying in ${delay}ms... (${lastError.message})`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ─── Strip JSON fences that the web UI may add ────────────────────────────────
function stripJsonFences(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

// ─── Call queue (serial processing — prevents browser tab overload) ───────────
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

// ─── Document extraction (queued, non-blocking) ───────────────────────────────
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
  return withRetry(async () => {
    const text = await queryImage(EXTRACTION_PROMPT, buffer, mimeType);
    const cleaned = stripJsonFences(text);

    try {
      const parsed = JSON.parse(cleaned) as ExtractedDocument;
      return { data: parsed };
    } catch {
      console.error('JSON parse failed for document extraction:', cleaned.slice(0, 200));
      return { data: null, raw: text };
    }
  });
}

// ─── Embedding (SDK only — web UI has no embeddings endpoint) ─────────────────
export async function generateEmbedding(text: string): Promise<number[]> {
  return withRetry(async () => {
    const result = await embeddingModel.embedContent({
      content: { role: 'user', parts: [{ text }] },
    });
    return result.embedding.values;
  });
}

// ─── Anomaly insight ──────────────────────────────────────────────────────────
export async function generateAnomalyInsight(
  testName: string,
  readings: Array<{ value: number; unit: string; date: string }>
): Promise<string> {
  return withRetry(async () => {
    const prompt = `
A patient has the following ${testName} readings over time:
${readings.map((r) => `- ${r.date}: ${r.value} ${r.unit}`).join('\n')}

Write ONE paragraph (under 60 words) explaining what this trend means for the patient in plain language.
Do not diagnose. Do not recommend specific treatments. Be honest but reassuring.
Return only the paragraph text, no preamble.
`.trim();

    const response = await queryText(prompt);
    return response.trim();
  });
}

// ─── Drug interaction check ───────────────────────────────────────────────────
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

    const text = await queryText(prompt);
    const cleaned = stripJsonFences(text);
    return JSON.parse(cleaned);
  });
}

// ─── Streaming chat response ──────────────────────────────────────────────────
// The ai/server.py proxy is synchronous — it waits for the full response.
// We yield a single chunk so SSE consumers still work transparently.
//
// Pass a pre-built systemContext string, OR pass userId to auto-build context.
export async function* streamChatResponse(
  systemContext: string,
  userMessage: string,
): AsyncGenerator<string> {
  const fullPrompt = `${systemContext}\n\nPatient question: ${userMessage}`;
  const response = await withRetry(async () => queryText(fullPrompt));
  yield response;
}

/**
 * Context-aware chat: fetches patient data from MongoDB and builds
 * a rich prompt automatically. Use this instead of streamChatResponse
 * when you have a userId but no pre-built context.
 */
export async function* streamContextualChat(
  userId: string,
  userMessage: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
): AsyncGenerator<string> {
  // Lazy import to avoid circular dependency
  const { buildUserContext, assemblePrompt } = await import('./contextBuilder.js');

  const ctx = await buildUserContext(userId, userMessage);

  const historySnippet = (conversationHistory ?? [])
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Patient' : 'MedVault AI'}: ${m.content}`)
    .join('\n');

  const systemPrompt = `You are MedVault AI, an empathetic medical records assistant.
Rules:
- Answer ONLY based on the provided patient context and medical evidence.
- Never diagnose conditions or recommend specific treatments.
- Always recommend consulting a real physician for clinical decisions.
- Be clear, concise, and compassionate. Use plain language.
- Cite document dates when referencing specific records.
- If the context doesn't contain enough information to answer, say so honestly.`;

  const fullPrompt = assemblePrompt(
    ctx.block,
    `${systemPrompt}${
      historySnippet ? `\n\nConversation so far:\n${historySnippet}` : ''
    }\n\nPatient asks: ${userMessage}`,
  );

  const response = await withRetry(async () => queryText(fullPrompt));
  yield response;
}

// ─── Prescription BBox Extractor ──────────────────────────────────────────────
// Used exclusively for handwritten prescription images.
export async function extractPrescriptionWithBBoxes(
  buffer: Buffer,
  mimeType: string
): Promise<PrescriptionExtraction | null> {
  return withRetry(async () => {
    const text = await queryImage(PRESCRIPTION_BBOX_PROMPT, buffer, mimeType);
    const cleaned = stripJsonFences(text);

    try {
      return JSON.parse(cleaned) as PrescriptionExtraction;
    } catch {
      console.error('Prescription bbox JSON parse failed:', cleaned.slice(0, 200));
      return null;
    }
  });
}

// ─── Non-streaming response (WhatsApp, tips, etc.) ───────────────────────────
export async function generateContent(prompt: string): Promise<string> {
  return withRetry(async () => {
    const response = await queryText(prompt);
    return response.trim();
  });
}

/**
 * Context-aware non-streaming response.
 * Automatically fetches the patient's light context (profile + meds)
 * and prepends it to the prompt. Used for WhatsApp tips, health summaries, etc.
 */
export async function generateContextualContent(
  userId: string,
  prompt: string,
): Promise<string> {
  const { buildLightContext, assemblePrompt } = await import('./contextBuilder.js');
  const contextBlock = await buildLightContext(userId);
  const fullPrompt = assemblePrompt(contextBlock, prompt);

  return withRetry(async () => {
    const response = await queryText(fullPrompt);
    return response.trim();
  });
}
