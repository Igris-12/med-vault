import type { Anomaly } from '../types/api';

export const MOCK_ANOMALIES: Anomaly[] = [
  {
    _id: 'anomaly-hba1c',
    testName: 'HbA1c',
    readings: [
      { value: 6.8, unit: '%', date: '2022-03-01T00:00:00.000Z', documentId: 'doc-001' },
      { value: 7.1, unit: '%', date: '2022-09-01T00:00:00.000Z', documentId: 'doc-002' },
      { value: 7.4, unit: '%', date: '2023-03-01T00:00:00.000Z', documentId: 'doc-003' },
      { value: 7.9, unit: '%', date: '2024-03-01T00:00:00.000Z', documentId: 'doc-004' },
    ],
    direction: 'increasing',
    severity: 'moderate',
    plainExplanation:
      'Your blood sugar control has been declining over the past 2 years — four consecutive HbA1c increases from 6.8% to 7.9%. This means your current medication may need adjustment. Please discuss this trend with your doctor at your next appointment.',
    clinicalExplanation:
      'HbA1c demonstrates monotonic increase over 4 sequential measurements (6.8→7.1→7.4→7.9%) spanning 24 months, despite documented pharmacotherapy (Metformin HCl 1000mg BID). Pattern consistent with progressive beta-cell dysfunction or medication non-compliance. Clinical reassessment and therapeutic modification strongly indicated.',
  },
  {
    _id: 'anomaly-creatinine',
    testName: 'Creatinine',
    readings: [
      { value: 0.9, unit: 'mg/dL', date: '2022-03-01T00:00:00.000Z', documentId: 'doc-001' },
      { value: 1.0, unit: 'mg/dL', date: '2022-09-01T00:00:00.000Z', documentId: 'doc-002' },
      { value: 1.1, unit: 'mg/dL', date: '2023-03-01T00:00:00.000Z', documentId: 'doc-003' },
      { value: 1.2, unit: 'mg/dL', date: '2024-03-01T00:00:00.000Z', documentId: 'doc-004' },
    ],
    direction: 'increasing',
    severity: 'mild',
    plainExplanation:
      'Your kidney marker (creatinine) has been slowly creeping upward over the last 2 years, crossing the upper normal limit in your most recent test. This may be related to long-term diabetes effects on the kidneys. Your doctor should monitor this closely.',
    clinicalExplanation:
      'Creatinine trending from 0.9 to 1.2 mg/dL over 24 months with concurrent microalbuminuria (ACR 42 mg/g) on most recent assessment. Pattern consistent with early diabetic nephropathy (CKD Stage G2A2). Optimize glycemic and BP control. Consider nephrology referral if trend continues.',
  },
];
