import { Request, Response } from 'express';
import DocumentModel from '../models/Document.js';
import ChatSessionModel from '../models/ChatSession.js';
import { generateEmbedding, streamChatResponse } from '../services/geminiService.js';
import { findTopK } from '../services/vectorService.js';

const SYSTEM_PROMPT = `
You are MedVault AI, a helpful medical companion. You have access to the patient's medical records below.
Rules:
- Answer questions only based on the provided context documents.
- Never diagnose conditions.
- Always recommend consulting a real physician for clinical decisions.
- Be empathetic and clear. Use plain language unless the patient asks for clinical detail.
- Cite which document your information comes from using [Doc: type, date] format.
`.trim();

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  const { sessionId, message } = req.body;
  const userId = req.user!.uid;

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    // 1. Generate query embedding
    let queryVec: number[] = [];
    try {
      queryVec = await generateEmbedding(message);
    } catch { /* fallback: return all docs */ }

    // 2. Fetch embeddings and find top-3 relevant docs
    const allDocs = await DocumentModel.find(
      { userId, status: 'done' },
      { embedding: 1, summaryPlain: 1, summaryClinical: 1, documentType: 1, documentDate: 1, _id: 1 }
    );

    const topDocs = queryVec.length > 0
      ? findTopK(queryVec, allDocs as unknown as Array<{ embedding: number[]; [key: string]: unknown }>, 3)
      : allDocs.slice(0, 3);

    // 3. Build context
    const contextBlocks = topDocs.map((doc: any, i: number) => {
      const d = doc as { documentType: string; documentDate?: Date; summaryPlain: string; summaryClinical: string; _id: { toString(): string } };
      return `[Context ${i + 1} — ${d.documentType}, ${d.documentDate?.toDateString() || 'Unknown date'}]\n${d.summaryPlain}\n${d.summaryClinical}`;
    }).join('\n\n');

    const fullContext = `${SYSTEM_PROMPT}\n\nPatient Records:\n${contextBlocks}`;
    const sourceDocIds = topDocs.map((d: any) => (d as { _id: { toString(): string } })._id.toString());

    // 4. Stream response
    let fullResponse = '';
    for await (const chunk of streamChatResponse(fullContext, message)) {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    // Send source doc IDs after stream
    res.write(`data: ${JSON.stringify({ done: true, sourceDocIds })}\n\n`);
    res.end();

    // 5. Persist to DB
    if (sessionId) {
      await ChatSessionModel.findByIdAndUpdate(sessionId, {
        $push: {
          messages: {
            $each: [
              { role: 'user', content: message, sourceDocIds: [], timestamp: new Date() },
              { role: 'assistant', content: fullResponse, sourceDocIds, timestamp: new Date() },
            ],
          },
        },
      });
    } else {
      await ChatSessionModel.create({
        userId,
        title: message.slice(0, 60),
        messages: [
          { role: 'user', content: message, sourceDocIds: [], timestamp: new Date() },
          { role: 'assistant', content: fullResponse, sourceDocIds, timestamp: new Date() },
        ],
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

export const uploadChatMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No file provided' });
      return;
    }

    // Upload to Cloudinary
    const { uploadBufferToCloudinary } = await import('../services/cloudinaryService.js');
    const fs = (await import('fs')).default;
    const buffer = await fs.promises.readFile(file.path);
    const cloudResult = await uploadBufferToCloudinary(
      buffer,
      file.mimetype,
      'medvault/chat',
      `chat_${req.user!.uid}`
    );
    // Remove local temp file
    fs.unlink(file.path, () => {});

    res.json({
      success: true,
      data: {
        url: cloudResult.url,
        publicId: cloudResult.publicId,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    });
  } catch (err) {
    console.error('uploadChatMedia error:', err);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
};

