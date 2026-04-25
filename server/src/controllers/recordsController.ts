import { Request, Response } from 'express';
import DocumentModel from '../models/Document.js';
import PrescriptionModel from '../models/Prescription.js';

export const getTimeline = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.uid;
  const months = parseInt(req.query.months as string) || 36;

  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const pipeline: any[] = [
    { $match: { userId, status: 'done', documentDate: { $gte: since } } },
    {
      $group: {
        _id: {
          year: { $year: '$documentDate' },
          month: { $month: '$documentDate' },
        },
        criticalityMax: { $max: '$criticalityScore' },
        criticalityAvg: { $avg: '$criticalityScore' },
        eventCount: { $sum: 1 },
        types: { $addToSet: '$documentType' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ];

  const raw = await DocumentModel.aggregate(pipeline);
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const data = raw.map((r: any) => ({
    month: `${monthNames[r._id.month - 1]} ${r._id.year}`,
    criticalityMax: Math.round(r.criticalityMax),
    criticalityAvg: parseFloat(r.criticalityAvg.toFixed(1)),
    eventCount: r.eventCount,
    types: r.types,
  }));

  res.json({ success: true, data });
};

export const getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.uid;

  const [docs, activePrescriptions] = await Promise.all([
    DocumentModel.find({ userId, status: 'done' }, { criticalityScore: 1, processedAt: 1, uploadedAt: 1 }),
    PrescriptionModel.countDocuments({ userId, status: 'active' }),
  ]);

  const totalDocuments = docs.length;
  const avgCriticality = totalDocuments > 0
    ? docs.reduce((sum: number, d: any) => sum + (d.criticalityScore || 1), 0) / totalDocuments
    : 5;

  const anomalyCount = docs.filter((d: any) => d.criticalityScore >= 7).length;

  const dates = docs.map((d: any) => d.processedAt || d.uploadedAt).filter(Boolean) as Date[];
  const lastProcessedDate = dates.length > 0
    ? new Date(Math.max(...dates.map((d: Date) => d.getTime()))).toISOString()
    : undefined;

  const earliest = dates.length > 0
    ? new Date(Math.min(...dates.map((d: Date) => d.getTime())))
    : new Date();
  const daysTracked = Math.floor((Date.now() - earliest.getTime()) / (1000 * 60 * 60 * 24));

  res.json({
    success: true,
    data: {
      totalDocuments,
      lastProcessedDate,
      overallHealthScore: parseFloat((10 - avgCriticality + 1).toFixed(1)),
      anomalyCount,
      activePrescriptionCount: activePrescriptions,
      daysTracked,
    },
  });
};

export const getAnomalies = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.uid;

  const docs = await DocumentModel.find(
    { userId, status: 'done' },
    { labValues: 1, documentDate: 1 }
  ).sort({ documentDate: 1 });

  // Group lab values by test name across documents
  const grouped: Record<string, Array<{ value: number; unit: string; date: string; docId: string; isAbnormal: boolean }>> = {};

  for (const doc of docs) {
    for (const lv of doc.labValues) {
      const numVal = parseFloat(lv.value);
      if (isNaN(numVal)) continue;
      if (!grouped[lv.test_name]) grouped[lv.test_name] = [];
      grouped[lv.test_name].push({
        value: numVal,
        unit: lv.unit,
        date: doc.documentDate?.toISOString() || '',
        docId: doc._id.toString(),
        isAbnormal: lv.is_abnormal,
      });
    }
  }

  const anomalies = [];

  for (const [testName, readings] of Object.entries(grouped)) {
    if (readings.length < 2) continue;
    const lastReading = readings[readings.length - 1];
    const isAbnormal = lastReading.isAbnormal;
    const isIncreasing = readings.length >= 3 &&
      readings[readings.length - 1].value > readings[readings.length - 2].value &&
      readings[readings.length - 2].value > readings[readings.length - 3].value;

    if (!isAbnormal && !isIncreasing) continue;

    anomalies.push({
      _id: testName.replace(/\s+/g, '_'),
      testName,
      readings: readings.map((r) => ({ value: r.value, unit: r.unit, date: r.date, documentId: r.docId })),
      direction: isIncreasing ? 'increasing' : 'stable',
      severity: isAbnormal ? 'moderate' : 'mild',
      plainExplanation: `Your ${testName} readings show a concerning trend over your last ${readings.length} tests.`,
      clinicalExplanation: `${testName} values demonstrate ${isIncreasing ? 'monotonically increasing' : 'abnormal'} pattern across ${readings.length} sequential measurements.`,
    });
  }

  res.json({ success: true, data: anomalies });
};

export const getDocuments = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.uid;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const type = req.query.type as string;
  const search = req.query.search as string;
  const dateFrom = req.query.dateFrom as string;
  const dateTo = req.query.dateTo as string;

  const filter: Record<string, unknown> = { userId, status: 'done' };
  if (type) filter.documentType = type;
  if (dateFrom || dateTo) {
    filter.documentDate = {};
    if (dateFrom) (filter.documentDate as Record<string, Date>).$gte = new Date(dateFrom);
    if (dateTo) (filter.documentDate as Record<string, Date>).$lte = new Date(dateTo);
  }
  if (search) {
    filter.$text = { $search: search };
  }

  const [docs, total] = await Promise.all([
    DocumentModel.find(filter, { embedding: 0 })
      .sort({ documentDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    DocumentModel.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { docs, total, page, limit, totalPages: Math.ceil(total / limit) },
  });
};

export const getDocumentById = async (req: Request, res: Response): Promise<void> => {
  const doc = await DocumentModel.findOne(
    { _id: req.params.id, userId: req.user!.uid },
    { embedding: 0 }
  );

  if (!doc) {
    res.status(404).json({ success: false, error: 'Document not found' });
    return;
  }

  res.json({ success: true, data: doc });
};
