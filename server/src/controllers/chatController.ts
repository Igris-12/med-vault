import { Request, Response } from 'express';
import DocumentModel from '../models/Document.js';
import ChatSessionModel from '../models/ChatSession.js';
import { streamContextualChat } from '../services/geminiService.js';

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  const { sessionId, message } = req.body;
  const userId = req.user!.uid;

  // ── Set up SSE ───────────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    // Load conversation history for multi-turn context
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (sessionId) {
      const session = await ChatSessionModel.findById(sessionId).lean();
      if (session?.messages) {
        conversationHistory = (session.messages as any[])
          .slice(-10) // last 5 turns
          .map((m: any) => ({ role: m.role, content: m.content }));
      }
    }

    // Stream via the context-aware pipeline (MongoDB → contextBuilder → Gemini)
    let fullResponse = '';
    for await (const chunk of streamContextualChat(userId, message, conversationHistory)) {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    // Gather source doc IDs for UI citation (top 3 by recency)
    const recentDocs = await DocumentModel.find(
      { userId, status: 'done' },
      { _id: 1 }
    ).sort({ documentDate: -1 }).limit(3).lean();
    const sourceDocIds = recentDocs.map((d: any) => d._id.toString());

    res.write(`data: ${JSON.stringify({ done: true, sourceDocIds })}\n\n`);
    res.end();

    // ── Persist to DB ──────────────────────────────────────────────────────────
    const newMessages = [
      { role: 'user',      content: message,      sourceDocIds: [],       timestamp: new Date() },
      { role: 'assistant', content: fullResponse,  sourceDocIds,           timestamp: new Date() },
    ];

    if (sessionId) {
      await ChatSessionModel.findByIdAndUpdate(sessionId, {
        $push: { messages: { $each: newMessages } },
      });
    } else {
      await ChatSessionModel.create({
        userId,
        title: message.slice(0, 60),
        messages: newMessages,
      });
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    res.end();
  }
};

export const getSessions = async (req: Request, res: Response): Promise<void> => {
  const sessions = await ChatSessionModel.find(
    { userId: req.user!.uid },
    { title: 1, createdAt: 1, 'messages.timestamp': 1 }
  ).sort({ createdAt: -1 });
  res.json({ success: true, data: sessions });
};

export const getSession = async (req: Request, res: Response): Promise<void> => {
  const session = await ChatSessionModel.findOne({
    _id: req.params.sessionId,
    userId: req.user!.uid,
  });
  if (!session) {
    res.status(404).json({ success: false, error: 'Session not found' });
    return;
  }
  res.json({ success: true, data: session });
};
