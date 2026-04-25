import { Request, Response } from 'express';
import twilio from 'twilio';
import UserModel from '../models/User.js';
import DocumentModel from '../models/Document.js';
import PrescriptionModel from '../models/Prescription.js';
import {
  extractDocumentQueued,
  generateEmbedding,
  generateContent,
} from '../services/geminiService.js';
import { buildUserContext, buildLightContext, assemblePrompt } from '../services/contextBuilder.js';
import { sendWhatsAppMessage, sendWhatsAppMenu } from '../services/whatsappService.js';

// ─── Session types ────────────────────────────────────────────────────────────
interface WhatsAppSession {
  userId: string | null;
  phoneNumber: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  awaitingUpload: boolean;
  lastActivity: Date;
}

// In-memory sessions — fine for demo scale; swap for Redis in production
const sessions = new Map<string, WhatsAppSession>();

// ─── Main webhook handler ─────────────────────────────────────────────────────
export async function handleIncomingWhatsApp(req: Request, res: Response): Promise<void> {
  const MessagingResponse = twilio.twiml.MessagingResponse;
  const twiml = new MessagingResponse();

  const from: string = req.body.From ?? '';           // "whatsapp:+919876543210"
  const body: string = (req.body.Body ?? '').trim();
  const mediaUrl: string | undefined = req.body.MediaUrl0;
  const mediaType: string | undefined = req.body.MediaContentType0;

  res.type('text/xml');

  try {
    const phoneNumber = from.replace('whatsapp:', '');
    const session = sessions.get(phoneNumber) ?? createSession(phoneNumber);
    sessions.set(phoneNumber, session);

    let responseText: string;

    if (mediaUrl && isDocumentMedia(mediaType)) {
      responseText = await handleDocumentUpload(session, mediaUrl, mediaType!);
    } else if (isEmergencyKeyword(body)) {
      responseText = await handleEmergencyRequest(session, phoneNumber);
    } else if (!session.userId) {
      responseText = await handleAccountLinking(session, phoneNumber);
    } else if (isMenuCommand(body)) {
      responseText = await handleMenuCommand(session, body);
    } else {
      responseText = await handleAIQuery(session, body);
    }

    // Update conversation history
    session.conversationHistory.push({ role: 'user', content: body || '[document]' });
    session.conversationHistory.push({ role: 'assistant', content: responseText });
    session.lastActivity = new Date();
    if (session.conversationHistory.length > 20) {
      session.conversationHistory = session.conversationHistory.slice(-20);
    }

    twiml.message(responseText);
    res.send(twiml.toString());
  } catch (err: any) {
    console.error('WhatsApp webhook error:', err);
    twiml.message(`Error: ${err.message}`);
    res.send(twiml.toString());
  }
}

// ─── Session factory ──────────────────────────────────────────────────────────
function createSession(phoneNumber: string): WhatsAppSession {
  return {
    userId: null,
    phoneNumber,
    conversationHistory: [],
    awaitingUpload: false,
    lastActivity: new Date(),
  };
}

// ─── Guards ───────────────────────────────────────────────────────────────────
function isDocumentMedia(mediaType?: string): boolean {
  if (!mediaType) return false;
  return mediaType.startsWith('image/') || mediaType === 'application/pdf';
}

function isEmergencyKeyword(body: string): boolean {
  const lower = body.toLowerCase();
  return ['emergency', 'sos', 'help', '911', 'urgent'].some((k) => lower.includes(k));
}

function isMenuCommand(body: string): boolean {
  const lower = body.toLowerCase().trim();
  const menuTriggers = [
    'menu', 'hi', 'hello', 'start', 'back', 'home',
    '1', '2', '3', '4', '5', '6', '7',
    'health summary', 'active medications', 'upload document', 'emergency card',
    'tip', 'tips', 'appointment', 'appointments', 'vitals', 'bmi',
  ];
  return menuTriggers.includes(lower);
}

// ─── Account linking ──────────────────────────────────────────────────────────
async function handleAccountLinking(
  session: WhatsAppSession,
  phoneNumber: string
): Promise<string> {
  const user = await UserModel.findOne({ whatsappPhone: phoneNumber });
  if (user) {
    session.userId = user._id.toString();
    setImmediate(async () => {
      try { await sendWhatsAppMenu(phoneNumber); } catch { /* ignore */ }
    });
    return `✅ Welcome back, ${user.name.split(' ')[0]}! Here's your menu:`;
  }

  return (
    `👋 Hi! I'm your MedVault health assistant.\n\n` +
    `To link your account:\n` +
    `1. Open MedVault on your phone\n` +
    `2. Go to Emergency → WhatsApp Connect\n` +
    `3. Enter your number: ${phoneNumber}\n\n` +
    `Once linked, you can:\n` +
    `📋 Query your medical history\n` +
    `💊 Check medications & interactions\n` +
    `📄 Upload documents by sending a photo\n` +
    `🆘 Get emergency health card`
  );
}

// ─── Emergency card ───────────────────────────────────────────────────────────
async function handleEmergencyRequest(
  session: WhatsAppSession,
  phoneNumber: string
): Promise<string> {
  if (!session.userId) {
    return (
      `🆘 *EMERGENCY CARD*\n\n` +
      `Your number isn't linked to MedVault.\n\n` +
      `Send *hi* to get started, or call 112 immediately.`
    );
  }

  const user = await UserModel.findById(session.userId);
  if (!user) return 'Account not found. Call 112 immediately.';

  const activePrescriptions = await PrescriptionModel.find({
    userId: session.userId,
    status: 'active',
  }).select('drugName dosage frequency');

  const meds =
    activePrescriptions.map((p) => `• ${p.drugName} ${p.dosage} (${p.frequency})`).join('\n') ||
    '• None on record';

  const contacts =
    user.emergencyContacts.map((c) => `• ${c.name} — ${c.phone} (${c.relationship})`).join('\n') ||
    '• None on record';

  const allergies = user.allergies.length > 0 ? user.allergies.join(', ') : 'None known';

  return (
    `🆘 *EMERGENCY CARD — ${user.name.toUpperCase()}*\n\n` +
    `🩸 *Blood Type:* ${user.bloodType}\n` +
    `⚠️ *Allergies:* ${allergies}\n\n` +
    `💊 *Current Medications:*\n${meds}\n\n` +
    `📞 *Emergency Contacts:*\n${contacts}\n\n` +
    `🔗 Token: ${user.emergencyToken}`
  );
}

// ─── Document upload (async processing) ──────────────────────────────────────
async function handleDocumentUpload(
  session: WhatsAppSession,
  mediaUrl: string,
  mediaType: string
): Promise<string> {
  if (!session.userId) {
    return `Please link your MedVault account first.\n\nSend *hi* to get started.`;
  }

  processDocumentAsync(session.userId, mediaUrl, mediaType, session.phoneNumber);

  return (
    `📄 Got your document! Processing now...\n\n` +
    `I'll analyse it with AI and send you a summary in ~30 seconds.\n\n` +
    `You can keep chatting while I work on it.`
  );
}

async function processDocumentAsync(
  userId: string,
  mediaUrl: string,
  mediaType: string,
  phoneNumber: string
): Promise<void> {
  try {
    const axios = (await import('axios')).default;
    const response = await axios.get<ArrayBuffer>(mediaUrl, {
      responseType: 'arraybuffer',
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID!,
        password: process.env.TWILIO_AUTH_TOKEN!,
      },
    });

    const fileBuffer = Buffer.from(response.data);

    extractDocumentQueued(fileBuffer, mediaType, async (extracted, rawResponse) => {
      if (!extracted) {
        await sendWhatsAppMessage(
          phoneNumber,
          `❌ Sorry, I couldn't read that document. Please try again or upload via the app.`
        );
        return;
      }

      const doc = await DocumentModel.create({
        userId,
        filename: `whatsapp_upload_${Date.now()}`,
        filePath: mediaUrl,
        mimeType: mediaType,
        fileSize: fileBuffer.length,
        status: 'done',
        documentType: extracted.document_type,
        documentDate: extracted.document_date ? new Date(extracted.document_date) : undefined,
        sourceHospital: extracted.source_hospital ?? undefined,
        doctorName: extracted.doctor_name ?? undefined,
        conditionsMentioned: extracted.conditions_mentioned,
        medications: extracted.medications,
        labValues: extracted.lab_values,
        summaryPlain: extracted.summary_plain,
        summaryClinical: extracted.summary_clinical,
        criticalityScore: extracted.criticality_score,
        keyFindings: extracted.key_findings,
        tags: extracted.tags,
        processedAt: new Date(),
        rawGeminiResponse: rawResponse,
      }) as any;

      // Generate and store embedding
      try {
        const embeddingText = [
          extracted.summary_plain,
          extracted.summary_clinical,
          extracted.conditions_mentioned.join(' '),
          extracted.tags.join(' '),
        ].join(' ');
        const embedding = await generateEmbedding(embeddingText);
        await DocumentModel.findByIdAndUpdate(doc._id, { embedding });
      } catch {
        console.warn('WhatsApp doc: embedding generation failed, continuing without it');
      }

      // Auto-save detected medications as prescriptions
      if (extracted.medications?.length) {
        for (const med of extracted.medications) {
          await PrescriptionModel.findOneAndUpdate(
            { userId, drugName: med.name },
            {
              $setOnInsert: {
                userId,
                drugName: med.name,
                dosage: med.dosage || 'see document',
                frequency: med.frequency || 'see document',
                prescribingDoctor: extracted.doctor_name || 'unknown',
                startDate: extracted.document_date
                  ? new Date(extracted.document_date)
                  : new Date(),
                status: 'active',
              },
              $set: { sourceDocumentId: doc._id },
            },
            { upsert: true, new: true }
          );
        }
      }

      const critEmoji =
        extracted.criticality_score >= 7 ? '🔴' :
        extracted.criticality_score >= 4 ? '🟡' : '🟢';

      const lines: string[] = [
        `✅ *Document Processed*`,
        ``,
        `📋 *Type:* ${formatDocType(extracted.document_type)}`,
        `📅 *Date:* ${extracted.document_date ? new Date(extracted.document_date).toLocaleDateString('en-IN') : 'Unknown'}`,
        `🏥 *Source:* ${extracted.source_hospital || 'Unknown'}`,
        `${critEmoji} *Severity:* ${extracted.criticality_score}/10`,
        ``,
        `📝 *Summary:*`,
        extracted.summary_plain,
      ];

      if (extracted.key_findings?.length) {
        lines.push(``, `🔍 *Key Findings:*`);
        extracted.key_findings.forEach((f) => lines.push(`• ${f}`));
      }

      const abnormal = (extracted.lab_values ?? []).filter((l) => l.is_abnormal);
      if (abnormal.length) {
        lines.push(``, `⚠️ *Abnormal Values:*`);
        abnormal.forEach((l) =>
          lines.push(`• ${l.test_name}: ${l.value} ${l.unit} (ref: ${l.reference_range})`)
        );
      }

      if (extracted.medications?.length) {
        lines.push(``, `💊 *Medications detected & saved:*`);
        extracted.medications.forEach((m) => lines.push(`• ${m.name} ${m.dosage}`));
      }

      lines.push(``, `Ask me anything about this document!`);
      await sendWhatsAppMessage(phoneNumber, lines.join('\n'));
    });
  } catch (err) {
    console.error('WhatsApp async document processing failed:', err);
    await sendWhatsAppMessage(
      phoneNumber,
      `❌ Sorry, I couldn't process that document. Please try again or upload via the app.`
    );
  }
}

// ─── Menu command router ──────────────────────────────────────────────────────
async function handleMenuCommand(session: WhatsAppSession, body: string): Promise<string> {
  const lower = body.toLowerCase().trim();

  if (lower === '1' || lower === 'health summary')     return handleHealthSummary(session);
  if (lower === '2' || lower === 'active medications') return handleMedications(session);
  if (lower === '3' || lower === 'lab results')        return handleLabResults(session);
  if (lower === '4' || lower === 'upload document') {
    session.awaitingUpload = true;
    return `📤 Ready to receive your document!\n\nPlease send a *photo* of any medical report, prescription, or lab result.\n\nI'll extract and save all the details automatically using AI! 🤖`;
  }
  if (lower === 'emergency card') return handleEmergencyRequest(session, session.phoneNumber);
  if (lower === '5' || lower === 'drug interactions') return handleDrugInteractions(session);
  if (lower === '6' || lower === 'tip' || lower === 'tips') return getHealthTip(session);
  if (lower === '7' || lower === 'vitals' || lower === 'bmi') return handleVitalsSummary(session);

  setImmediate(async () => {
    try { await sendWhatsAppMenu(session.phoneNumber); } catch { /* ignore */ }
  });
  return `👋 Opening your MedVault menu...`;
}

// ─── Menu sub-handlers ────────────────────────────────────────────────────────
async function handleHealthSummary(session: WhatsAppSession): Promise<string> {
  const docs = await DocumentModel.find({ userId: session.userId! })
    .sort({ documentDate: -1 })
    .limit(5)
    .select('documentType documentDate criticalityScore summaryPlain');

  if (!docs.length) {
    return `No documents found yet. Send me a photo of any medical report to get started!`;
  }

  const avg = docs.reduce((s, d) => s + (d.criticalityScore || 0), 0) / docs.length;
  const emoji = avg >= 7 ? '🔴' : avg >= 4 ? '🟡' : '🟢';

  const lines = [
    `${emoji} *Your Health Summary*`,
    ``,
    `📊 ${docs.length} records on file`,
    `📈 Overall health index: ${(10 - avg).toFixed(1)}/10`,
    ``,
    `📋 *Recent Records:*`,
  ];

  docs.slice(0, 3).forEach((d) => {
    const date = d.documentDate
      ? new Date(d.documentDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
      : 'Unknown date';
    lines.push(`• ${formatDocType(d.documentType)} — ${date}`);
  });

  lines.push(``, `Ask me about any specific record or condition!`);
  return lines.join('\n');
}

async function handleMedications(session: WhatsAppSession): Promise<string> {
  const prescriptions = await PrescriptionModel.find({
    userId: session.userId!,
    status: 'active',
  });

  if (!prescriptions.length) {
    return `No active medications on record.\n\nSend me a prescription photo to add medications!`;
  }

  const lines = [`💊 *Active Medications (${prescriptions.length})*`, ``];
  prescriptions.forEach((p) => {
    lines.push(`*${p.drugName}*`);
    if (p.dosage) lines.push(`Dose: ${p.dosage}`);
    if (p.frequency) lines.push(`Frequency: ${p.frequency}`);
    if (p.interactionSeverity && p.interactionSeverity !== 'none') {
      lines.push(`⚠️ Interaction: ${p.interactionSeverity}`);
    }
    lines.push(``);
  });

  lines.push(`Send *5* or *interactions* to check for drug interactions.`);
  return lines.join('\n');
}

async function handleLabResults(session: WhatsAppSession): Promise<string> {
  const latestLab = await DocumentModel.findOne({
    userId: session.userId!,
    documentType: 'lab_report',
  }).sort({ documentDate: -1 });

  if (!latestLab) {
    return `No lab reports found.\n\nSend me a lab report photo to get started!`;
  }

  const date = latestLab.documentDate
    ? new Date(latestLab.documentDate).toLocaleDateString('en-IN')
    : 'Unknown date';

  const lines = [`🧪 *Latest Lab Report* (${date})`, ``];

  if (latestLab.labValues?.length) {
    const abnormal = latestLab.labValues.filter((l) => l.is_abnormal);
    const normalCount = latestLab.labValues.length - abnormal.length;

    if (abnormal.length) {
      lines.push(`⚠️ *Abnormal:*`);
      abnormal.slice(0, 5).forEach((l) => lines.push(`• ${l.test_name}: ${l.value} ${l.unit}`));
      lines.push(``);
    }
    lines.push(`✅ *Normal (${normalCount} values)*`);
  }

  lines.push(``, latestLab.summaryPlain);
  return lines.join('\n');
}

async function handleDrugInteractions(session: WhatsAppSession): Promise<string> {
  const flagged = await PrescriptionModel.find({
    userId: session.userId!,
    status: 'active',
    interactionSeverity: { $ne: 'none' },
  });

  if (!flagged.length) {
    return `✅ No known drug interactions found for your current medications.`;
  }

  const lines = [`⚠️ *Drug Interaction Alerts*`, ``];
  flagged.forEach((p) => {
    if (p.interactionWarnings?.length) {
      const e =
        p.interactionSeverity === 'severe' ? '🔴' :
        p.interactionSeverity === 'moderate' ? '🟡' : '🟠';
      lines.push(`${e} *${p.drugName}* — ${p.interactionSeverity}`);
      p.interactionWarnings.forEach((w: string) => lines.push(`  ${w}`));
      lines.push(``);
    }
  });

  lines.push(`⚕️ Always consult your doctor before changing medications.`);
  return lines.join('\n');
}

// ─── Health tip (AI-generated, fully context-aware) ──────────────────────────
async function getHealthTip(session: WhatsAppSession): Promise<string> {
  if (!session.userId) return `Link your account first to get personalised tips! Send *hi*.`;

  // buildLightContext: profile + active meds — fast and personalised
  const contextBlock = await buildLightContext(session.userId);
  const prompt = assemblePrompt(
    contextBlock,
    `You are a friendly health coach. Based on this specific patient's profile above, give ONE personalised, actionable health tip for today. Keep it under 60 words. No markdown. Be warm and encouraging. If they have active medications or known allergies, factor those in.`
  );

  const tip = await generateContent(prompt);
  return `💡 *Today's Health Tip*\n\n${tip.trim()}\n\n_Send *tip* anytime for a new tip!_`;
}

// ─── Vitals summary from lab reports ─────────────────────────────────────────
async function handleVitalsSummary(session: WhatsAppSession): Promise<string> {
  if (!session.userId) return `Link your account first. Send *hi*.`;

  const labs = await DocumentModel.find({
    userId: session.userId!,
    documentType: 'lab_report',
    'labValues.0': { $exists: true },
  }).sort({ documentDate: -1 }).limit(3);

  if (!labs.length) {
    return `No lab reports with vitals found yet.\n\nSend me a photo of a lab report to get started!`;
  }

  const lines = [`🩺 *Your Recent Vitals*`, ``];

  labs.forEach((lab) => {
    const date = lab.documentDate
      ? new Date(lab.documentDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
      : 'Unknown';
    lines.push(`📅 *${date}*`);
    (lab.labValues ?? []).slice(0, 5).forEach((v) => {
      const flag = v.is_abnormal ? ' ⚠️' : ' ✅';
      lines.push(`• ${v.test_name}: ${v.value} ${v.unit}${flag}`);
    });
    lines.push(``);
  });

  lines.push(`_Ask me about any specific value!_`);
  return lines.join('\n');
}

// ─── AI query (context-aware via contextBuilder + Gemini) ─────────────────────
async function handleAIQuery(session: WhatsAppSession, userMessage: string): Promise<string> {
  if (!session.userId) {
    return `Please link your MedVault account first. Send *hi* to get started.`;
  }

  // Full context: profile + active meds + semantically-relevant docs + rising trends
  const ctx = await buildUserContext(session.userId, userMessage);

  const historySnippet = session.conversationHistory
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Patient' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const taskPrompt =
    `You are a helpful medical records assistant for MedVault (WhatsApp).\n` +
    `Rules:\n` +
    `- Answer ONLY based on the patient context above.\n` +
    `- Keep responses concise (under 200 words) — this is WhatsApp.\n` +
    `- Use simple language. No markdown (* or #). Plain text only.\n` +
    `- If the context doesn't answer the question, say so honestly.\n` +
    `- Never diagnose. Always recommend consulting a doctor.\n` +
    (historySnippet ? `\nConversation history:\n${historySnippet}` : '') +
    `\n\nPatient asks: ${userMessage}`;

  const fullPrompt = assemblePrompt(ctx.block, taskPrompt);
  const result = await generateContent(fullPrompt);
  return result.replace(/\*\*/g, '').replace(/#{1,3} /g, '').trim();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDocType(type: string): string {
  const map: Record<string, string> = {
    lab_report: 'Lab Report',
    discharge_summary: 'Discharge Summary',
    prescription: 'Prescription',
    imaging: 'Imaging Report',
    vaccination: 'Vaccination Record',
    consultation: 'Consultation Note',
    other: 'Medical Document',
  };
  return map[type] ?? 'Medical Document';
}
