import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import DocumentModel from '../models/Document.js';
import { io } from '../index.js';
import { extractDocumentQueued, generateEmbedding, extractPrescriptionWithBBoxes } from '../services/geminiService.js';
import { extractDocumentQueued, generateEmbedding } from '../services/geminiService.js';
import { uploadBufferToCloudinary } from '../services/cloudinaryService.js';

export const handleUpload = async (req: Request, res: Response): Promise<void> => {
  const files = req.files as Express.Multer.File[];
  const userId = req.user!.uid;

  if (!files || files.length === 0) {
    res.status(400).json({ success: false, error: 'No files uploaded' });
    return;
  }

  const results = await Promise.all(
    files.map(async (file) => {
      // Upload to Cloudinary
      let cloudinaryUrl = file.path; // fallback to local path
      try {
        const buffer = await fs.promises.readFile(file.path);
        const cloudResult = await uploadBufferToCloudinary(
          buffer,
          file.mimetype,
          'medvault/documents',
          userId
        );
        cloudinaryUrl = cloudResult.url;
        // Remove local temp file
        fs.unlink(file.path, () => {});
      } catch (err) {
        console.warn('Cloudinary upload failed, falling back to local path:', err);
      }

      const doc = await DocumentModel.create({
        userId,
        filename: file.originalname,
        filePath: cloudinaryUrl,
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
      setImmediate(() => processDocument(doc._id.toString(), file.path, cloudinaryUrl, file.mimetype, userId));

      return { docId: doc._id.toString(), filename: file.originalname, status: 'processing' };
    })
  );

  res.json({ success: true, data: results });
};

async function processDocument(
  docId: string,
  localPath: string,
  cloudinaryUrl: string,
  mimeType: string,
  userId: string
): Promise<void> {
  try {
    io.to(userId).emit('document:status', { docId, status: 'processing', step: 'analyzing' });

    // Try to read from local path first (if file still exists), else re-download from Cloudinary
    let buffer: Buffer;
    try {
      buffer = await fs.promises.readFile(localPath);
    } catch {
      const axios = (await import('axios')).default;
      const resp = await axios.get<ArrayBuffer>(cloudinaryUrl, { responseType: 'arraybuffer' });
      buffer = Buffer.from(resp.data);
    }

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
          filePath: cloudinaryUrl, // ensure Cloudinary URL is saved
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

      // ── Prescription: second-pass bbox extraction ─────────────────────────────
      // Only runs for image-type prescriptions; PDFs are skipped gracefully.
      if (
        extracted.document_type === 'prescription' &&
        (mimeType.startsWith('image/'))
      ) {
        try {
          const bboxData = await extractPrescriptionWithBBoxes(buffer, mimeType);
          if (bboxData) {
            await DocumentModel.findByIdAndUpdate(docId, { prescriptionExtraction: bboxData });
          }
        } catch (e) {
          console.warn('Prescription bbox extraction failed (non-blocking):', e);
        }
      }

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
    { status: 1, documentType: 1, criticalityScore: 1, summaryPlain: 1, filePath: 1 }
  );

  if (!doc) {
    res.status(404).json({ success: false, error: 'Document not found' });
    return;
  }

  res.json({ success: true, data: doc });
};
