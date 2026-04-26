import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import DocumentModel from '../models/Document.js';
import PrescriptionModel from '../models/Prescription.js';
import { io } from '../index.js';
import { extractDocumentQueued, generateEmbedding, checkInteractions } from '../services/geminiService.js';
import { uploadBufferToCloudinary } from '../services/cloudinaryService.js';

/** Parse a duration string (e.g. "7 days", "2 weeks", "1 month") and compute an end date. */
function computeEndDate(startDateStr: string | null, duration: string): Date | undefined {
  const start = startDateStr ? new Date(startDateStr) : new Date();
  const lower = duration.toLowerCase();
  const num = parseInt(lower) || 1;

  if (lower.includes('day'))   { start.setDate(start.getDate() + num); return start; }
  if (lower.includes('week'))  { start.setDate(start.getDate() + num * 7); return start; }
  if (lower.includes('month')) { start.setMonth(start.getMonth() + num); return start; }
  if (lower.includes('year'))  { start.setFullYear(start.getFullYear() + num); return start; }

  return undefined;
}

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

      // Safe defaults — AI may return incomplete JSON
      const conditions = extracted.conditions_mentioned ?? [];
      const tags = extracted.tags ?? [];
      const meds = extracted.medications ?? [];
      const labs = extracted.lab_values ?? [];
      const findings = extracted.key_findings ?? [];

      const embeddingText = [
        extracted.summary_plain || '',
        extracted.summary_clinical || '',
        conditions.join(' '),
        tags.join(' '),
      ].filter(Boolean).join(' ');

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
          documentType: extracted.document_type || 'other',
          documentDate: extracted.document_date ? new Date(extracted.document_date) : undefined,
          sourceHospital: extracted.source_hospital || '',
          doctorName: extracted.doctor_name || '',
          conditionsMentioned: conditions,
          medications: meds,
          labValues: labs,
          summaryPlain: extracted.summary_plain || '',
          summaryClinical: extracted.summary_clinical || '',
          criticalityScore: extracted.criticality_score ?? 1,
          keyFindings: findings,
          tags,
          embedding,
        },
        { new: true, projection: { embedding: 0 } }
      );

      // ── Prescription: bbox extraction is done lazily when Prescription Viewer opens.
      // No second AI call needed here.


      // ── Auto-create Prescription records when document is a prescription ─────
      if ((extracted.document_type || 'other') === 'prescription' && meds.length > 0) {
        try {
          const createdPrescriptions = await Promise.all(
            meds.map((med) =>
              PrescriptionModel.create({
                userId,
                drugName: med.name,
                dosage: med.dosage || 'As directed',
                frequency: med.frequency || 'As directed',
                prescribingDoctor: extracted.doctor_name || 'Unknown',
                startDate: extracted.document_date ? new Date(extracted.document_date) : new Date(),
                endDate: med.duration ? computeEndDate(extracted.document_date, med.duration) : undefined,
                status: 'active',
                sourceDocumentId: docId,
                interactionWarnings: [],
                interactionSeverity: 'none',
              })
            )
          );
          console.log(`💊 Created ${createdPrescriptions.length} prescription records from document ${docId}`);

          // Check drug interactions across all active prescriptions
          const allActive = await PrescriptionModel.find({ userId, status: 'active' });
          if (allActive.length >= 2) {
            const drugNames = allActive.map((p: any) => p.drugName);
            try {
              const interactions = await checkInteractions(drugNames);
              for (const interaction of interactions) {
                const affected = allActive.filter(
                  (p: any) => p.drugName === interaction.drug1 || p.drugName === interaction.drug2
                );
                for (const p of affected) {
                  const warning = `Interaction with ${p.drugName === interaction.drug1 ? interaction.drug2 : interaction.drug1}: ${interaction.description}`;
                  await PrescriptionModel.findByIdAndUpdate(p._id, {
                    $addToSet: { interactionWarnings: warning },
                    interactionSeverity: interaction.severity,
                  });
                }
              }
            } catch (intErr) {
              console.warn('Drug interaction check failed (non-blocking):', intErr);
            }
          }
        } catch (prescErr) {
          console.warn('Prescription record creation failed (non-blocking):', prescErr);
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
