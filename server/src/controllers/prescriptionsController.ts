import { Request, Response } from 'express';
import PrescriptionModel from '../models/Prescription.js';
import DocumentModel from '../models/Document.js';
import { checkInteractions } from '../services/geminiService.js';

export const getPrescriptions = async (req: Request, res: Response): Promise<void> => {
  const prescriptions = await PrescriptionModel.find({ userId: req.user!.uid })
    .populate('sourceDocumentId', 'filename documentDate')
    .sort({ status: 1, createdAt: -1 });
  res.json({ success: true, data: prescriptions });
};

export const addPrescription = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.uid;
  const prescription = await PrescriptionModel.create({ ...req.body, userId });

  // Check interactions if 2+ active prescriptions
  const actives = await PrescriptionModel.find({ userId, status: 'active' });
  if (actives.length >= 2) {
    const drugNames = actives.map((p: any) => p.drugName);
    try {
      const interactions = await checkInteractions(drugNames);
      for (const interaction of interactions) {
        const affected = actives.filter(
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
    } catch (e) {
      console.warn('Interaction check failed (non-blocking):', e);
    }
  }

  res.status(201).json({ success: true, data: prescription });
};

export const updatePrescription = async (req: Request, res: Response): Promise<void> => {
  const prescription = await PrescriptionModel.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.uid },
    req.body,
    { new: true }
  );
  if (!prescription) {
    res.status(404).json({ success: false, error: 'Prescription not found' });
    return;
  }
  res.json({ success: true, data: prescription });
};

export const getInteractionGraph = async (req: Request, res: Response): Promise<void> => {
  const prescriptions = await PrescriptionModel.find({ userId: req.user!.uid });

  const nodes = prescriptions.map((p: any) => ({
    id: p._id.toString(),
    label: p.drugName,
    status: p.status,
  }));

  const edges: Array<{ source: string; target: string; severity: string; description: string }> = [];
  for (const p of prescriptions) {
    for (const warning of p.interactionWarnings) {
      const match = warning.match(/Interaction with (.+?):/);
      if (match) {
        const targetDrug = prescriptions.find((x: any) => x.drugName === match[1]);
        if (targetDrug) {
          edges.push({
            source: p._id.toString(),
            target: targetDrug._id.toString(),
            severity: p.interactionSeverity,
            description: warning,
          });
        }
      }
    }
  }

  res.json({ success: true, data: { nodes, edges } });
};

// ─── Prescription Viewer: fetch bbox extraction ───────────────────────────────
// Returns the stored PrescriptionExtraction JSON + a URL to serve the image.
export const getPrescriptionExtraction = async (req: Request, res: Response): Promise<void> => {
  const doc = await DocumentModel.findOne(
    { _id: req.params.docId, userId: req.user!.uid, documentType: 'prescription' },
    { prescriptionExtraction: 1, filePath: 1, mimeType: 1, filename: 1, status: 1 }
  );

  if (!doc) {
    res.status(404).json({ success: false, error: 'Prescription document not found' });
    return;
  }

  if (!doc.prescriptionExtraction) {
    res.status(202).json({ success: false, error: 'Extraction still processing or unavailable' });
    return;
  }

  res.json({
    success: true,
    data: {
      extraction: doc.prescriptionExtraction,
      imageUrl: `/api/uploads/file/${req.params.docId}`,
      filename: doc.filename,
      status: doc.status,
    },
  });
};

// ─── Prescription Viewer: save confirmed / corrected data ─────────────────────
// Persists manualCorrections (keyed by field path) onto the document record.
export const confirmPrescriptionExtraction = async (req: Request, res: Response): Promise<void> => {
  const { manualCorrections } = req.body as { manualCorrections: Record<string, string> };

  const doc = await DocumentModel.findOne({
    _id: req.params.docId,
    userId: req.user!.uid,
    documentType: 'prescription',
  });

  if (!doc) {
    res.status(404).json({ success: false, error: 'Prescription document not found' });
    return;
  }

  await DocumentModel.findByIdAndUpdate(req.params.docId, {
    'prescriptionExtraction.manualCorrections': manualCorrections,
    'prescriptionExtraction.confirmedAt': new Date().toISOString(),
  });

  res.json({ success: true, data: { confirmed: true, corrections: manualCorrections } });
};
