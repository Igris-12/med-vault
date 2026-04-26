import { Request, Response } from 'express';
import UserModel from '../models/User.js';
import DocumentModel from '../models/Document.js';
import PrescriptionModel from '../models/Prescription.js';
import { queryText } from '../services/aiClient.js';

// ─── GET /api/doctor/patients ─────────────────────────────────────────────────
// Returns all patients with a summary of their records
export const listPatients = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = (req.query.search as string || '').trim().toLowerCase();

    const patients = await UserModel.find(
      search
        ? { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
        : {}
    ).select('_id name email photoUrl bloodType dateOfBirth allergies modePreference createdAt').lean();

    // Enrich with doc/rx counts in parallel
    const enriched = await Promise.all(patients.map(async (p) => {
      const [totalDocs, abnormal, activeRx, lastDoc] = await Promise.all([
        DocumentModel.countDocuments({ userId: p._id, status: 'done' }),
        DocumentModel.countDocuments({ userId: p._id, 'labValues.is_abnormal': true }),
        PrescriptionModel.countDocuments({ userId: p._id, status: 'active' }),
        DocumentModel.findOne({ userId: p._id, status: 'done' }).sort({ uploadedAt: -1 }).select('uploadedAt documentType').lean(),
      ]);
      return { ...p, totalDocs, abnormal, activeRx, lastVisit: lastDoc?.uploadedAt || null, lastDocType: lastDoc?.documentType };
    }));

    res.json({ success: true, data: enriched });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ─── GET /api/doctor/patients/:id ─────────────────────────────────────────────
// Full clinical profile for one patient
export const getPatientProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const [patient, docs, rxs] = await Promise.all([
      UserModel.findById(id).lean(),
      DocumentModel.find({ userId: id, status: 'done' }).sort({ documentDate: -1 }).lean(),
      PrescriptionModel.find({ userId: id }).lean(),
    ]);

    if (!patient) { res.status(404).json({ success: false, error: 'Patient not found' }); return; }

    // Build timeline
    const timeline = docs.map(d => ({
      id: d._id,
      date: d.documentDate || d.uploadedAt,
      type: d.documentType,
      title: d.filename,
      hospital: d.sourceHospital,
      doctor: d.doctorName,
      conditions: d.conditionsMentioned,
      criticalityScore: d.criticalityScore,
      summaryPlain: d.summaryPlain,
      summaryClinical: d.summaryClinical,
      labValues: d.labValues,
      keyFindings: d.keyFindings,
      tags: d.tags,
    }));

    // Aggregate all abnormal lab values
    const allLabValues = docs.flatMap(d =>
      (d.labValues || []).map(lv => ({ ...lv, documentDate: d.documentDate || d.uploadedAt, documentId: d._id }))
    );
    const abnormalLabs = allLabValues.filter(lv => lv.is_abnormal);

    // Aggregate all conditions
    const conditionFreq: Record<string, number> = {};
    docs.forEach(d => d.conditionsMentioned?.forEach(c => { conditionFreq[c] = (conditionFreq[c] || 0) + 1; }));
    const conditions = Object.entries(conditionFreq)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }));

    res.json({
      success: true,
      data: { patient, timeline, rxs, allLabValues, abnormalLabs, conditions },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ─── POST /api/doctor/patients/:id/nl-search ──────────────────────────────────
// Natural language search over a patient's records via Gemini Web
export const nlSearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { query } = req.body as { query: string };

    if (!query?.trim()) { res.status(400).json({ success: false, error: 'query is required' }); return; }

    // Fetch documents with summaries
    const docs = await DocumentModel.find({ userId: id, status: 'done' })
      .sort({ documentDate: -1 })
      .select('filename documentType documentDate sourceHospital summaryPlain labValues conditionsMentioned criticalityScore')
      .lean();

    // Build compressed context for Gemini
    const context = docs.slice(0, 20).map((d, i) =>
      `[${i + 1}] Type:${d.documentType} Date:${d.documentDate?.toISOString().split('T')[0] || 'unknown'} Hospital:${d.sourceHospital || 'N/A'} File:${d.filename}\nSummary: ${d.summaryPlain?.slice(0, 200) || 'no summary'}\nConditions: ${d.conditionsMentioned?.join(', ') || 'none'}\nLabs: ${d.labValues?.filter(l => l.is_abnormal).map(l => `${l.test_name}=${l.value}`).join(', ') || 'none abnormal'}`
    ).join('\n\n');

    const prompt = `You are a clinical AI assistant. A doctor is searching through a patient's medical records.

Patient query: "${query}"

Available records:
${context}

Instructions:
1. Identify which records [1], [2], etc. are relevant to the query
2. Extract the exact information requested
3. Present findings in a clean clinical format with bullet points
4. Note any abnormal values
5. If the query asks for a time range (e.g. "last year"), filter accordingly
6. If no relevant records found, say so clearly

Respond in 150-250 words maximum. Be precise and clinically useful.`;

    let answer: string;
    try {
      answer = await queryText(prompt);
    } catch {
      // Fallback: simple keyword search
      const kw = query.toLowerCase();
      const matched = docs.filter(d =>
        d.summaryPlain?.toLowerCase().includes(kw) ||
        d.conditionsMentioned?.some(c => c.toLowerCase().includes(kw)) ||
        d.documentType?.toLowerCase().includes(kw) ||
        d.filename?.toLowerCase().includes(kw)
      );
      answer = matched.length
        ? `Found ${matched.length} relevant record(s):\n${matched.map(d => `• ${d.filename} (${d.documentDate?.toISOString().split('T')[0]}): ${d.summaryPlain?.slice(0, 120)}`).join('\n')}`
        : `No records found matching "${query}".`;
    }

    res.json({ success: true, data: { answer, total: docs.length } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ─── POST /api/doctor/patients/:id/ai-summary ─────────────────────────────────
// Generate a comprehensive AI clinical summary via Gemini Web
export const generateAiSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const [patient, docs, rxs] = await Promise.all([
      UserModel.findById(id).select('name bloodType dateOfBirth allergies').lean(),
      DocumentModel.find({ userId: id, status: 'done' }).sort({ documentDate: -1 }).lean(),
      PrescriptionModel.find({ userId: id, status: 'active' }).lean(),
    ]);

    if (!patient) { res.status(404).json({ success: false, error: 'Patient not found' }); return; }

    const age = patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / 3.156e10) : 'unknown';

    const labSummary = docs.flatMap(d => d.labValues || [])
      .filter(l => l.is_abnormal)
      .slice(0, 10)
      .map(l => `${l.test_name}: ${l.value} ${l.unit} (ref: ${l.reference_range})`)
      .join('; ');

    const conditionFreq: Record<string, number> = {};
    docs.forEach(d => d.conditionsMentioned?.forEach(c => { conditionFreq[c] = (conditionFreq[c] || 0) + 1; }));
    const topConditions = Object.entries(conditionFreq).sort(([, a], [, b]) => b - a).slice(0, 8).map(([c]) => c);

    const prompt = `You are an expert clinician. Generate a structured clinical summary for a medical record handover.

Patient: ${patient.name}, Age: ${age}, Blood Type: ${patient.bloodType}
Allergies: ${patient.allergies?.join(', ') || 'none known'}
Active Medications (${rxs.length}): ${rxs.slice(0, 8).map(r => `${r.drugName} ${r.dosage} ${r.frequency}`).join('; ')}
Recurring Conditions: ${topConditions.join(', ')}
Abnormal Lab Values: ${labSummary || 'none'}
Total Records: ${docs.length} documents over ${docs.length ? Math.ceil((Date.now() - new Date(docs[docs.length - 1].uploadedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0} months

Generate a structured clinical summary with these sections:
1. **Chief Complaints & Active Problems**
2. **Medication Summary** (highlight interactions if any)
3. **Key Abnormal Findings** (flag critical values)
4. **Disease Trajectory** (improving/stable/worsening)
5. **Recommended Follow-up**

Be concise but clinically comprehensive. Use medical terminology appropriately.`;

    let summary: string;
    try {
      summary = await queryText(prompt);
    } catch {
      summary = `**Clinical Summary — ${patient.name}**\n\nAge: ${age} | Blood Type: ${patient.bloodType}\n\n**Active Medications:** ${rxs.map(r => r.drugName).join(', ') || 'none'}\n\n**Conditions:** ${topConditions.join(', ') || 'none documented'}\n\n**Abnormal Labs:** ${labSummary || 'none'}\n\n_AI scraper unavailable — manual review required._`;
    }

    res.json({ success: true, data: { summary, generatedAt: new Date() } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ─── GET /api/doctor/stats ────────────────────────────────────────────────────
export const getDoctorStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [totalPatients, totalDocs, abnormalDocs, recentUploads] = await Promise.all([
      UserModel.countDocuments(),
      DocumentModel.countDocuments({ status: 'done' }),
      DocumentModel.countDocuments({ 'labValues.is_abnormal': true }),
      DocumentModel.find({ status: 'done' })
        .sort({ uploadedAt: -1 }).limit(5)
        .select('userId filename uploadedAt documentType criticalityScore').lean(),
    ]);

    // Enrich with patient names
    const enrichedRecent = await Promise.all(recentUploads.map(async (d) => {
      const user = await UserModel.findById(d.userId).select('name').lean();
      return { ...d, patientName: user?.name || 'Unknown' };
    }));

    res.json({
      success: true,
      data: { totalPatients, totalDocs, abnormalDocs, recentUploads: enrichedRecent },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ─── GET /api/doctor/patients/:id/records ─────────────────────────────────────
// Flat list of docs for DoctorRecords folder view
export const getPatientRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const docs = await DocumentModel.find({ userId: id, status: 'done' })
      .sort({ uploadedAt: -1 })
      .select('_id filename documentType uploadedAt criticalityScore summaryPlain')
      .lean();
    res.json({ success: true, data: docs });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ─── GET /api/doctor/patients/:id/export ──────────────────────────────────────
// Returns full patient data as JSON (doctor can download as file)
export const exportPatientData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const format = (req.query.format as string) || 'json'; // 'json' | 'csv'

    const [patient, docs, rxs] = await Promise.all([
      UserModel.findById(id).lean(),
      DocumentModel.find({ userId: id, status: 'done' }).sort({ documentDate: -1 }).lean(),
      PrescriptionModel.find({ userId: id }).lean(),
    ]);

    if (!patient) { res.status(404).json({ success: false, error: 'Patient not found' }); return; }

    if (format === 'csv') {
      // Build CSV for documents
      const header = 'Date,Type,Filename,Criticality,Hospital,Doctor,Conditions,Summary\n';
      const rows = docs.map(d =>
        [
          (d.documentDate || d.uploadedAt)?.toISOString().split('T')[0] || '',
          d.documentType || '',
          `"${(d.filename || '').replace(/"/g, '""')}"`,
          d.criticalityScore ?? '',
          `"${(d.sourceHospital || '').replace(/"/g, '""')}"`,
          `"${(d.doctorName || '').replace(/"/g, '""')}"`,
          `"${(d.conditionsMentioned || []).join('; ').replace(/"/g, '""')}"`,
          `"${(d.summaryPlain || '').slice(0, 200).replace(/"/g, '""')}"`,
        ].join(',')
      ).join('\n');

      const csv = header + rows;
      const filename = `${patient.name.replace(/\s+/g, '_')}_records.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
      return;
    }

    // Default: JSON export
    const allLabValues = docs.flatMap(d =>
      (d.labValues || []).map(lv => ({ ...lv, documentDate: d.documentDate || d.uploadedAt, fileName: d.filename }))
    );

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: 'MedVault Doctor Portal',
      patient: {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        bloodType: patient.bloodType,
        dateOfBirth: patient.dateOfBirth,
        allergies: patient.allergies,
      },
      documents: docs.map(d => ({
        id: d._id,
        date: d.documentDate || d.uploadedAt,
        type: d.documentType,
        filename: d.filename,
        criticalityScore: d.criticalityScore,
        hospital: d.sourceHospital,
        doctor: d.doctorName,
        conditions: d.conditionsMentioned,
        summary: d.summaryPlain,
        labValues: d.labValues,
        keyFindings: d.keyFindings,
      })),
      prescriptions: rxs.map(r => ({
        drug: r.drugName,
        dosage: r.dosage,
        frequency: r.frequency,
        status: r.status,
        prescribingDoctor: r.prescribingDoctor,
      })),
      labValues: allLabValues,
      abnormalLabs: allLabValues.filter(l => l.is_abnormal),
    };

    const filename = `${patient.name.replace(/\s+/g, '_')}_MedVault_export.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

