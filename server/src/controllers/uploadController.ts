import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import DocumentModel from '../models/Document.js';
import { io } from '../index.js';
import { extractDocumentQueued, generateEmbedding } from '../services/geminiService.js';

export const handleUpload = async (req: Request, res: Response): Promise<void> => {
  const files = req.files as Express.Multer.File[];
  const userId = req.user!.uid;

  if (!files || files.length === 0) {
    res.status(400).json({ success: false, error: 'No files uploaded' });
    return;
  }

  const results = await Promise.all(
    files.map(async (file) => {
      const doc = await DocumentModel.create({
        userId,
        filename: file.originalname,
        filePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        status: 'processing',
        uploadedAt: new Date(),
      });

      io.to(userId).emit('document:status', {
        docId: doc._id.toString(),
        status: 'processing',
        step: 'saving',
      });

      // Non-blocking: respond immediately, process in background
      setImmediate(() => processDocument(doc._id.toString(), file.path, file.mimetype, userId));

      return { docId: doc._id.toString(), filename: file.originalname, status: 'processing' };
    })
  );

  res.json({ success: true, data: results });
};

async function processDocument(
  docId: string,
  filePath: string,
  mimeType: string,
  userId: string
): Promise<void> {
  try {
    io.to(userId).emit('document:status', { docId, status: 'processing', step: 'analyzing' });

    const buffer = await fs.promises.readFile(filePath); // async — non-blocking

    extractDocumentQueued(buffer, mimeType, async (extracted, rawResponse) => {
      if (!extracted) {
        await DocumentModel.findByIdAndUpdate(docId, {
          status: 'failed',
          rawGeminiResponse: rawResponse,
        });
        io.to(userId).emit('document:status', { docId, status: 'failed', step: 'failed' });
        return;
      }

      io.to(userId).emit('document:status', { docId, status: 'processing', step: 'embedding' });

      const embeddingText = [
        extracted.summary_plain,
        extracted.summary_clinical,
        extracted.conditions_mentioned.join(' '),
        extracted.tags.join(' '),
      ].join(' ');

      let embedding: number[] = [];
      try {
        embedding = await generateEmbedding(embeddingText);
      } catch (e) {
        console.warn('Embedding generation failed, storing without embedding:', e);
      }

      io.to(userId).emit('document:status', { docId, status: 'processing', step: 'storing' });

      const updated = await DocumentModel.findByIdAndUpdate(
        docId,
        {
          status: 'done',
          processedAt: new Date(),
          documentType: extracted.document_type,
          documentDate: extracted.document_date ? new Date(extracted.document_date) : undefined,
          sourceHospital: extracted.source_hospital,
          doctorName: extracted.doctor_name,
          conditionsMentioned: extracted.conditions_mentioned,
          medications: extracted.medications,
          labValues: extracted.lab_values,
          summaryPlain: extracted.summary_plain,
          summaryClinical: extracted.summary_clinical,
          criticalityScore: extracted.criticality_score,
          keyFindings: extracted.key_findings,
          tags: extracted.tags,
          embedding,
        },
        { new: true, projection: { embedding: 0 } }
      );

      io.to(userId).emit('document:status', {
        docId,
        status: 'done',
        step: 'done',
        data: updated,
      });
    });
  } catch (err) {
    console.error('processDocument error:', err);
    await DocumentModel.findByIdAndUpdate(docId, { status: 'failed' });
    io.to(userId).emit('document:status', { docId, status: 'failed', step: 'failed' });
  }
}

export const getStatus = async (req: Request, res: Response): Promise<void> => {
  const doc = await DocumentModel.findOne(
    { _id: req.params.docId, userId: req.user!.uid },
    { status: 1, documentType: 1, criticalityScore: 1, summaryPlain: 1 }
  );

  if (!doc) {
    res.status(404).json({ success: false, error: 'Document not found' });
    return;
  }

  res.json({ success: true, data: doc });
};
