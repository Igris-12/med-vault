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

  // Aggregate top conditions from all patient documents
  const conditionDocs = await DocumentModel.find(
    { userId, status: 'done' },
    { conditionsMentioned: 1, summaryClinical: 1, filename: 1, documentDate: 1, documentType: 1 }
  ).sort({ documentDate: -1 }).limit(30).lean();

  // Flatten and count condition occurrences
  const conditionMap: Record<string, number> = {};
  conditionDocs.forEach((d: any) => {
    (d.conditionsMentioned || []).forEach((c: string) => {
      const key = c.toLowerCase().trim();
      conditionMap[key] = (conditionMap[key] || 0) + 1;
    });
  });
  const topConditions = Object.entries(conditionMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([condition, count]) => ({ condition, count }));

  res.json({
    success: true,
    data: {
      totalDocuments,
      lastProcessedDate,
      overallHealthScore: parseFloat((10 - avgCriticality + 1).toFixed(1)),
      anomalyCount,
      activePrescriptionCount: activePrescriptions,
      daysTracked,
      topConditions,
      recentDocs: conditionDocs.slice(0, 10).map((d: any) => ({
        conditionsMentioned: d.conditionsMentioned || [],
        filename: d.filename,
        documentType: d.documentType,
        documentDate: d.documentDate,
      })),
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

export const getAlerts = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.uid;
  const docs = await DocumentModel.find({ userId, status: 'done' }).sort({ documentDate: -1 });

  const alerts: any[] = [];
  const processedTests = new Set<string>();

  for (const doc of docs) {
    // 1. Abnormal lab values
    if (doc.labValues) {
      for (const lab of doc.labValues) {
        if (lab.is_abnormal && !processedTests.has(lab.test_name)) {
          processedTests.add(lab.test_name);
          alerts.push({
            _id: `alert-abnormal-${lab.test_name}-${doc._id}`,
            category: 'abnormal',
            severity: 'warning',
            title: `Abnormal ${lab.test_name}`,
            description: `Your recent test showed ${lab.test_name} at ${lab.value} ${lab.unit}, which is outside the normal range (${lab.reference_range}).`,
            action: 'Discuss these results with your primary care physician.',
            relatedTest: lab.test_name,
            relatedDocumentId: doc._id.toString(),
            createdAt: doc.documentDate || doc.uploadedAt,
            dismissed: false,
          });
        }
      }
    }

    // 2. High criticality insights
    if (doc.criticalityScore >= 8) {
      alerts.push({
        _id: `alert-crit-${doc._id}`,
        category: 'sudden_change',
        severity: 'critical',
        title: 'Critical Health Event Detected',
        description: `A recent record (${doc.documentType}) was flagged with a high criticality score. ${doc.summaryPlain}`,
        action: 'Ensure follow-up appointments are scheduled.',
        relatedDocumentId: doc._id.toString(),
        createdAt: doc.documentDate || doc.uploadedAt,
        dismissed: false,
      });
    }

    // 3. Specialist suggestions based on conditions
    if (doc.conditionsMentioned && doc.conditionsMentioned.length > 0) {
      for (const condition of doc.conditionsMentioned) {
        let specialist = '';
        const lowerCond = condition.toLowerCase();
        if (lowerCond.includes('heart') || lowerCond.includes('hypertension')) specialist = 'Cardiology';
        else if (lowerCond.includes('diabetes') || lowerCond.includes('thyroid')) specialist = 'Endocrinology';
        else if (lowerCond.includes('kidney') || lowerCond.includes('renal')) specialist = 'Nephrology';
        else if (lowerCond.includes('asthma') || lowerCond.includes('lung')) specialist = 'Pulmonology';
        
        if (specialist) {
          alerts.push({
            _id: `alert-spec-${specialist}-${doc._id}`,
            category: 'suggestion',
            severity: 'info',
            title: `Recommended: ${specialist} Consult`,
            description: `Based on your recent record mentioning ${condition}, a routine checkup with a specialist might be beneficial.`,
            action: 'Use the Locator to find a recommended specialist near you.',
            specialist,
            relatedDocumentId: doc._id.toString(),
            createdAt: doc.documentDate || doc.uploadedAt,
            dismissed: false,
          });
        }
      }
    }
  }

  // Deduplicate suggestions by specialist
  const seenSpec = new Set();
  const finalAlerts = alerts.filter(a => {
    if (a.category === 'suggestion') {
      if (seenSpec.has(a.specialist)) return false;
      seenSpec.add(a.specialist);
    }
    return true;
  });

  res.json({ success: true, data: finalAlerts });
};

