import { Request, Response } from 'express';
import SupportSessionModel from '../models/SupportSession.js';
import { queryText } from '../services/aiClient.js';

// ─── Get or create a support session ─────────────────────────────────────────
export const getSupportSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = String(req.params.sessionId);
    const userId = req.user?.uid || null;

    let session = await SupportSessionModel.findOne({ sessionId });
    if (!session) {
      session = await SupportSessionModel.create({ sessionId, userId, messages: [] });
    } else if (userId && !session.userId) {
      session.userId = userId;
      await session.save();
    }

    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Post a message to support chat ──────────────────────────────────────────
export const postSupportMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = String(req.params.sessionId);
    const { content } = req.body as { content: string };
    const userId = req.user?.uid || null;

    if (!content?.trim()) {
      res.status(400).json({ success: false, error: 'content is required' });
      return;
    }

    let session = await SupportSessionModel.findOne({ sessionId });
    if (!session) {
      session = await SupportSessionModel.create({ sessionId, userId, messages: [] });
    }

    // Push user message
    const userMsg = { role: 'user' as const, content: content.trim(), timestamp: new Date() };
    session.messages.push(userMsg);

    // ── Generate AI reply via Gemini Web scraper ────────────────────────────
    let reply: string;
    try {
      const context = session.messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
      const prompt = `You are MedVault's friendly support assistant. MedVault is a medical records management platform with features: document upload & AI extraction, WhatsApp integration, medication reminders, AI chat, diet analysis, prescription tracking, lab result trends, and emergency cards.\n\nConversation so far:\n${context}\n\nRespond helpfully and concisely. Use markdown bold (**text**) for emphasis. Keep responses under 150 words.`;
      reply = await queryText(prompt);
    } catch (err) {
      console.warn('AI scraper unavailable, using fallback:', err);
      reply = buildPlaceholderReply(content.trim());
    }

    const assistantMsg = { role: 'assistant' as const, content: reply, timestamp: new Date() };
    session.messages.push(assistantMsg);

    await session.save();

    res.json({ success: true, data: { userMessage: userMsg, assistantMessage: assistantMsg } });
  } catch (err) {
    console.error('postSupportMessage error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Placeholder reply logic (FAQ-based keyword matching) ────────────────────
// Replace this with Gemini scraper integration once ready.
function buildPlaceholderReply(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('upload') || lower.includes('document')) {
    return `📄 To upload a document, go to **Upload** in the sidebar. We accept PDF, JPEG, PNG, and WebP files up to 20MB. After uploading, AI will automatically extract key info like medications, lab values and generate a summary.`;
  }
  if (lower.includes('whatsapp') || lower.includes('connect')) {
    return `📱 To connect WhatsApp, navigate to **WhatsApp Connect** in the sidebar. Enter your phone number and we'll send a confirmation message. Once connected, you can query your records directly from WhatsApp!`;
  }
  if (lower.includes('remind') || lower.includes('notification')) {
    return `⏰ MedVault sends health reminders via WhatsApp. Go to **WA Reminders → Schedule** to set up automated reminders for medications, appointments, and more.`;
  }
  if (lower.includes('emergen')) {
    return `🆘 Your emergency card is accessible at any time. Go to **Emergency** in the sidebar or send "emergency" via WhatsApp if connected. It shows blood type, allergies, medications and emergency contacts.`;
  }
  if (lower.includes('prescription') || lower.includes('medication')) {
    return `💊 Visit the **Prescriptions** page to view all your medications. Prescriptions are automatically detected when you upload documents, or you can view them via WhatsApp by sending "medications".`;
  }
  if (lower.includes('lab') || lower.includes('result') || lower.includes('test')) {
    return `🧪 Your lab results are stored under **Records**. Any abnormal values are flagged on the **Alerts** page. You can also ask about results in the **AI Chat** page.`;
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('help')) {
    return `👋 Hi! I'm your MedVault support assistant. I can help you with:\n\n• 📄 Uploading documents\n• 📱 WhatsApp connection\n• 💊 Medications & prescriptions\n• 🆘 Emergency features\n• 🧪 Lab results\n\nWhat do you need help with?`;
  }

  return `🤔 I'm not sure about that specific question yet. Our AI assistant is being upgraded. In the meantime, try exploring:\n\n• **Dashboard** — your health overview\n• **Records** — all your documents\n• **AI Chat** — ask about your records\n• **Alerts** — health alerts\n\nOr reach us at support@medvault.app`;
}
