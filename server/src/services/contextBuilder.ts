/**
 * contextBuilder.ts
 *
 * Assembles a rich, token-efficient patient context block from MongoDB
 * and injects it into Gemini prompts before they reach ai/server.py.
 *
 * The Python server never touches the database — Node.js owns all data access.
 * Context flows: MongoDB → contextBuilder → geminiService → aiClient → Gemini
 */

import UserModel from '../models/User.js';
import DocumentModel from '../models/Document.js';
import PrescriptionModel from '../models/Prescription.js';
import { generateEmbedding } from './geminiService.js';
import { findTopK } from './vectorService.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserContext {
  /** Formatted context block ready to prepend to any prompt */
  block: string;
  /** Raw data for programmatic use */
  userId: string;
  patientName: string;
  hasDocuments: boolean;
  activeMedCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date?: Date | null): string {
  if (!date) return 'Unknown';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function calcAge(dob?: Date | null): string {
  if (!dob) return 'Unknown';
  const ageMsec = Date.now() - new Date(dob).getTime();
  return `${Math.floor(ageMsec / (1000 * 60 * 60 * 24 * 365))} years`;
}

function severityEmoji(score: number): string {
  if (score >= 8) return '🔴';
  if (score >= 5) return '🟡';
  return '🟢';
}

// ─── Full context (for chat + complex queries) ─────────────────────────────────

/**
 * Builds a comprehensive patient context block.
 *
 * If `queryText` is provided and embeddings exist, performs semantic search
 * to surface the most relevant documents for that query. Otherwise returns
 * the most recent documents.
 *
 * Context is designed to be:
 *   - Token-efficient (~800–1200 tokens typical)
 *   - Clinically useful (includes abnormal values, trends, key findings)
 *   - Safe (no raw file paths, no embeddings, no internal IDs)
 */
export async function buildUserContext(
  userId: string,
  queryText?: string,
): Promise<UserContext> {
  // Fetch all three collections in parallel
  const [user, allDocs, activePrescriptions] = await Promise.all([
    UserModel.findById(userId).lean(),
    DocumentModel.find(
      { userId, status: 'done' },
      { embedding: 1, summaryPlain: 1, summaryClinical: 1, documentType: 1,
        documentDate: 1, sourceHospital: 1, doctorName: 1, conditionsMentioned: 1,
        medications: 1, labValues: 1, criticalityScore: 1, keyFindings: 1, tags: 1 }
    ).sort({ documentDate: -1 }).lean(),
    PrescriptionModel.find({ userId, status: 'active' }).lean(),
  ]);

  const lines: string[] = [];
  lines.push('[PATIENT CONTEXT — MEDVAULT]');
  lines.push('────────────────────────────────────────');

  // ── Patient Profile ──────────────────────────────────────────────────────────
  const patientName = user?.name ?? 'Patient';
  lines.push('PATIENT PROFILE');
  if (user) {
    lines.push(`Name: ${user.name}  |  Blood Type: ${user.bloodType || 'Unknown'}  |  Age: ${calcAge(user.dateOfBirth)}`);
    if (user.allergies?.length) {
      lines.push(`⚠️  Known Allergies: ${user.allergies.join(', ')}`);
    } else {
      lines.push('Allergies: None recorded');
    }
  } else {
    lines.push('(Profile not yet set up)');
  }

  // ── Active Medications ───────────────────────────────────────────────────────
  lines.push('');
  lines.push(`ACTIVE MEDICATIONS (${activePrescriptions.length})`);
  if (activePrescriptions.length === 0) {
    lines.push('None on record');
  } else {
    for (const rx of activePrescriptions) {
      const interactionFlag =
        rx.interactionSeverity && rx.interactionSeverity !== 'none'
          ? ` ⚠️ ${rx.interactionSeverity} interaction`
          : '';
      lines.push(`  • ${rx.drugName} ${rx.dosage} – ${rx.frequency}${interactionFlag}`);
    }
  }

  // ── Medical History (semantic or recency-based) ───────────────────────────────
  lines.push('');
  lines.push(`MEDICAL HISTORY (${allDocs.length} total records)`);

  let topDocs = allDocs.slice(0, 5); // default: 5 most recent

  // If a query is provided and some docs have embeddings, do semantic retrieval
  if (queryText && allDocs.length > 0) {
    const docsWithEmbeddings = allDocs.filter((d) => d.embedding?.length > 0);
    if (docsWithEmbeddings.length >= 3) {
      try {
        const queryVec = await generateEmbedding(queryText);
        topDocs = findTopK(queryVec, docsWithEmbeddings as any, 5) as any;
      } catch {
        // Embedding failed — fall back to recency
        topDocs = allDocs.slice(0, 5);
      }
    }
  }

  if (topDocs.length === 0) {
    lines.push('No processed documents yet');
  } else {
    topDocs.forEach((doc: any, i: number) => {
      const type = doc.documentType?.replace(/_/g, ' ')?.replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? 'Document';
      const date = formatDate(doc.documentDate);
      const hospital = doc.sourceHospital ? ` (${doc.sourceHospital})` : '';
      const doctor = doc.doctorName ? `, Dr. ${doc.doctorName}` : '';
      const sev = severityEmoji(doc.criticalityScore ?? 1);

      lines.push(`[${i + 1}] ${sev} ${type} – ${date}${hospital}${doctor}`);

      // Key findings
      if (doc.keyFindings?.length) {
        doc.keyFindings.slice(0, 2).forEach((f: string) => lines.push(`      Finding: ${f}`));
      }

      // Abnormal lab values (most informative signal)
      const abnormal = (doc.labValues ?? []).filter((lv: any) => lv.is_abnormal);
      if (abnormal.length) {
        abnormal.slice(0, 4).forEach((lv: any) =>
          lines.push(`      ⚠️  ${lv.test_name}: ${lv.value} ${lv.unit} (ref: ${lv.reference_range})`)
        );
      }

      // Conditions
      if (doc.conditionsMentioned?.length) {
        lines.push(`      Conditions: ${doc.conditionsMentioned.slice(0, 3).join(', ')}`);
      }

      // Plain summary (capped to keep tokens manageable)
      if (doc.summaryPlain) {
        const snippet = doc.summaryPlain.length > 200
          ? doc.summaryPlain.slice(0, 200) + '…'
          : doc.summaryPlain;
        lines.push(`      Summary: ${snippet}`);
      }
    });
  }

  // ── Anomaly Trends ────────────────────────────────────────────────────────────
  const trendMap: Record<string, number[]> = {};
  for (const doc of allDocs) {
    for (const lv of (doc as any).labValues ?? []) {
      const num = parseFloat(lv.value);
      if (!isNaN(num)) {
        if (!trendMap[lv.test_name]) trendMap[lv.test_name] = [];
        trendMap[lv.test_name].push(num);
      }
    }
  }

  const risingTests = Object.entries(trendMap)
    .filter(([, vals]) => {
      if (vals.length < 3) return false;
      const last3 = vals.slice(-3);
      return last3[2] > last3[1] && last3[1] > last3[0];
    })
    .map(([name, vals]) => `${name} (${vals.slice(-3).join(' → ')})`);

  if (risingTests.length > 0) {
    lines.push('');
    lines.push('RISING TRENDS (last 3 readings)');
    risingTests.slice(0, 4).forEach((t) => lines.push(`  • ${t}`));
  }

  lines.push('────────────────────────────────────────');
  lines.push('[END CONTEXT]');

  const block = lines.join('\n');

  return {
    block,
    userId,
    patientName,
    hasDocuments: allDocs.length > 0,
    activeMedCount: activePrescriptions.length,
  };
}

// ─── Light context (WhatsApp, tips, brief queries) ────────────────────────────

/**
 * Builds a compact context block — profile + active meds only.
 * Used for quick queries where fetching full document history would be slow.
 */
export async function buildLightContext(userId: string): Promise<string> {
  const [user, activePrescriptions] = await Promise.all([
    UserModel.findById(userId).lean(),
    PrescriptionModel.find({ userId, status: 'active' }).lean(),
  ]);

  const lines: string[] = [];
  lines.push('[PATIENT CONTEXT — MEDVAULT]');

  if (user) {
    lines.push(`Patient: ${user.name} | Blood Type: ${user.bloodType || '?'} | Age: ${calcAge(user.dateOfBirth)}`);
    if (user.allergies?.length) lines.push(`Allergies: ${user.allergies.join(', ')}`);
  }

  if (activePrescriptions.length) {
    lines.push(`Active meds: ${activePrescriptions.map((r) => `${r.drugName} ${r.dosage}`).join(', ')}`);
  }

  lines.push('[END CONTEXT]');
  return lines.join('\n');
}

// ─── Prompt assembler ─────────────────────────────────────────────────────────

/**
 * Wraps a raw user prompt with a patient context block.
 * This is the single function that all context-aware AI calls go through.
 */
export function assemblePrompt(contextBlock: string, userPrompt: string): string {
  return `${contextBlock}\n\n${userPrompt}`;
}
