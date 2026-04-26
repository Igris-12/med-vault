import { Request, Response } from 'express';
import JSZip from 'jszip';
import DocumentModel from '../models/Document.js';
import PrescriptionModel from '../models/Prescription.js';

const DOC_TYPE_FOLDER: Record<string, string> = {
  lab_report: 'Records/Lab_Reports',
  prescription: 'Records/Prescriptions',
  discharge_summary: 'Records/Discharge_Summaries',
  imaging: 'Records/Imaging',
  vaccination: 'Records/Vaccinations',
  consultation: 'Records/Consultations',
  other: 'Records/Other',
};

function sanitise(name: string) {
  return name.replace(/[^a-zA-Z0-9._\- ]/g, '_').trim() || 'untitled';
}

function formatDate(d?: string | Date | null) {
  if (!d) return 'unknown';
  return new Date(d).toISOString().split('T')[0];
}

export const exportData = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.uid;
  const format = ((req.query.format as string) || 'json').toLowerCase();
  const dateStr = new Date().toISOString().split('T')[0];

  const [documents, prescriptions] = await Promise.all([
    DocumentModel.find({ userId }, { embedding: 0 }).lean(),
    PrescriptionModel.find({ userId }).lean(),
  ]);

  const mapPrescription = (p: any) => ({
    drugName: p.drugName,
    dosage: p.dosage,
    frequency: p.frequency,
    prescribingDoctor: p.prescribingDoctor || null,
    startDate: formatDate(p.startDate),
    endDate: formatDate(p.endDate),
    status: p.status,
    interactionSeverity: p.interactionSeverity || 'none',
    interactionWarnings: p.interactionWarnings || [],
  });

  // ── JSON export ──────────────────────────────────────────────────────────────
  if (format === 'json') {
    const active = prescriptions.filter((p: any) => p.status === 'active');

    const payload = {
      exportedAt: new Date().toISOString(),
      totalDocuments: documents.length,
      totalPrescriptions: prescriptions.length,
      activePrescriptions: active.length,
      conditions: [...new Set(documents.flatMap((d: any) => d.conditionsMentioned || []))].sort(),
      doctors: [...new Set(documents.map((d: any) => d.doctorName).filter(Boolean))].sort(),
      hospitals: [...new Set(documents.map((d: any) => d.sourceHospital).filter(Boolean))].sort(),
      documents: documents.map((d: any) => ({
        id: d._id.toString(),
        filename: d.filename,
        documentType: d.documentType,
        documentDate: formatDate(d.documentDate),
        sourceHospital: d.sourceHospital || null,
        doctorName: d.doctorName || null,
        status: d.status,
        criticalityScore: d.criticalityScore,
        summaryPlain: d.summaryPlain,
        summaryClinical: d.summaryClinical,
        keyFindings: d.keyFindings || [],
        conditionsMentioned: d.conditionsMentioned || [],
        tags: d.tags || [],
        medications: d.medications || [],
        labValues: d.labValues || [],
      })),
      prescriptions: prescriptions.map(mapPrescription),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="MedVault_Export_${dateStr}.json"`);
    res.json(payload);
    return;
  }

  // ── CSV export ───────────────────────────────────────────────────────────────
  if (format === 'csv') {
    const csvEscape = (v: any): string => {
      if (v === null || v === undefined) return '';
      const s = Array.isArray(v) ? v.join('; ') : String(v);
      if (s.includes(',') || s.includes('\n') || s.includes('"')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const headers = [
      'ID', 'Filename', 'Document Type', 'Document Date', 'Source Hospital',
      'Doctor Name', 'Status', 'Criticality Score', 'Summary (Plain)',
      'Summary (Clinical)', 'Key Findings', 'Conditions Mentioned',
      'Tags', 'Uploaded At',
    ];

    const rows = documents.map((d: any) =>
      [
        d._id.toString(),
        d.filename,
        d.documentType,
        formatDate(d.documentDate),
        d.sourceHospital || '',
        d.doctorName || '',
        d.status,
        d.criticalityScore,
        d.summaryPlain || '',
        d.summaryClinical || '',
        (d.keyFindings || []).join('; '),
        (d.conditionsMentioned || []).join('; '),
        (d.tags || []).join('; '),
        formatDate(d.uploadedAt as any),
      ].map(csvEscape).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="MedVault_Export_${dateStr}.csv"`);
    res.send(csv);
    return;
  }

  // ── ZIP export (default / legacy) ───────────────────────────────────────────
  const zip = new JSZip();

  zip.file(
    'README.txt',
    [
      'MedVault Health Data Export',
      '============================',
      `Exported: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      `Total documents: ${documents.length}`,
      `Total prescriptions: ${prescriptions.length}`,
      '',
      'Folder Structure:',
      '  Records/           — all uploaded medical documents grouped by type',
      '  Prescriptions/     — active and discontinued medication records',
      '  summary.json       — full health summary (all data in one file)',
      '',
      'Each document folder contains:',
      '  <filename>.json    — extracted medical data (summary, lab values, etc.)',
    ].join('\n')
  );

  const docsByType: Record<string, any[]> = {};

  for (const doc of documents) {
    const folder = DOC_TYPE_FOLDER[doc.documentType as string] || 'Records/Other';
    if (!docsByType[folder]) docsByType[folder] = [];
    docsByType[folder].push(doc);

    const baseName = sanitise(
      doc.filename?.replace(/\.[^/.]+$/, '') ||
      `${doc.documentType}_${formatDate(doc.documentDate)}`
    );

    const payload = {
      filename: doc.filename,
      documentType: doc.documentType,
      documentDate: formatDate(doc.documentDate),
      sourceHospital: doc.sourceHospital || null,
      doctorName: doc.doctorName || null,
      status: doc.status,
      uploadedAt: formatDate(doc.uploadedAt as any),
      criticalityScore: doc.criticalityScore,
      summaryPlain: doc.summaryPlain,
      summaryClinical: doc.summaryClinical,
      keyFindings: doc.keyFindings || [],
      conditionsMentioned: doc.conditionsMentioned || [],
      tags: doc.tags || [],
      medications: doc.medications || [],
      labValues: doc.labValues || [],
    };

    zip.file(`${folder}/${baseName}.json`, JSON.stringify(payload, null, 2));
  }

  for (const [folder, docs] of Object.entries(docsByType)) {
    const index = docs.map((d) => ({
      id: d._id.toString(),
      filename: d.filename,
      date: formatDate(d.documentDate),
      hospital: d.sourceHospital || null,
      doctor: d.doctorName || null,
      criticality: d.criticalityScore,
      summary: d.summaryPlain,
    }));
    zip.file(`${folder}/_index.json`, JSON.stringify(index, null, 2));
  }

  const active = prescriptions.filter((p: any) => p.status === 'active');
  const discontinued = prescriptions.filter((p: any) => p.status !== 'active');

  zip.file(
    'Prescriptions/active_medications.json',
    JSON.stringify({ count: active.length, medications: active.map(mapPrescription) }, null, 2)
  );

  if (discontinued.length > 0) {
    zip.file(
      'Prescriptions/discontinued_medications.json',
      JSON.stringify({ count: discontinued.length, medications: discontinued.map(mapPrescription) }, null, 2)
    );
  }

  for (const p of prescriptions as any[]) {
    const subFolder = p.status === 'active' ? 'Prescriptions/Active' : 'Prescriptions/Discontinued';
    const name = sanitise(p.drugName || 'medication');
    zip.file(
      `${subFolder}/${name}_${formatDate(p.startDate)}.json`,
      JSON.stringify(mapPrescription(p), null, 2)
    );
  }

  zip.file(
    'summary.json',
    JSON.stringify({
      exportedAt: new Date().toISOString(),
      userId,
      totalDocuments: documents.length,
      totalPrescriptions: prescriptions.length,
      activePrescriptions: active.length,
      conditions: [...new Set(documents.flatMap((d: any) => d.conditionsMentioned || []))].sort(),
      doctors: [...new Set(documents.map((d: any) => d.doctorName).filter(Boolean))].sort(),
      hospitals: [...new Set(documents.map((d: any) => d.sourceHospital).filter(Boolean))].sort(),
      documents: documents.map((d: any) => ({
        id: d._id.toString(),
        filename: d.filename,
        type: d.documentType,
        date: formatDate(d.documentDate),
        criticality: d.criticalityScore,
        summary: d.summaryPlain,
      })),
      prescriptions: prescriptions.map(mapPrescription),
    }, null, 2)
  );

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="MedVault_Export_${dateStr}.zip"`);
  res.setHeader('Content-Length', buffer.length);
  res.end(buffer);
};
