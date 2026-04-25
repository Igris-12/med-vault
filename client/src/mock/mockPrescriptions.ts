import type { Prescription, InteractionGraph } from '../types/api';

export const MOCK_PRESCRIPTIONS: Prescription[] = [
  {
    _id: 'rx-001',
    userId: 'dev-user-001',
    drugName: 'Metformin',
    dosage: '1000mg',
    frequency: 'twice daily with meals',
    prescribingDoctor: 'Dr. Arjun Rao',
    startDate: '2023-08-01T00:00:00.000Z',
    status: 'active',
    sourceDocumentId: 'doc-006',
    interactionWarnings: [
      'Interaction with Lisinopril: May enhance hypoglycemic effect, increasing risk of low blood sugar episodes, particularly during illness or dehydration.',
    ],
    interactionSeverity: 'mild',
    createdAt: '2023-08-05T11:00:00.000Z',
  },
  {
    _id: 'rx-002',
    userId: 'dev-user-001',
    drugName: 'Lisinopril',
    dosage: '10mg',
    frequency: 'once daily in morning',
    prescribingDoctor: 'Dr. Arjun Rao',
    startDate: '2023-07-28T00:00:00.000Z',
    status: 'active',
    sourceDocumentId: 'doc-005',
    interactionWarnings: [
      'Interaction with Metformin: May enhance hypoglycemic effect, increasing risk of low blood sugar episodes, particularly during illness or dehydration.',
    ],
    interactionSeverity: 'mild',
    createdAt: '2023-07-28T14:00:00.000Z',
  },
  {
    _id: 'rx-003',
    userId: 'dev-user-001',
    drugName: 'Amlodipine',
    dosage: '5mg',
    frequency: 'once daily in morning',
    prescribingDoctor: 'Dr. Arjun Rao',
    startDate: '2023-07-28T00:00:00.000Z',
    endDate: '2023-10-28T00:00:00.000Z',
    status: 'discontinued',
    sourceDocumentId: 'doc-005',
    interactionWarnings: [],
    interactionSeverity: 'none',
    createdAt: '2023-07-28T14:00:00.000Z',
  },
];

export const MOCK_INTERACTION_GRAPH: InteractionGraph = {
  nodes: [
    { id: 'rx-001', label: 'Metformin 1000mg', status: 'active' },
    { id: 'rx-002', label: 'Lisinopril 10mg', status: 'active' },
    { id: 'rx-003', label: 'Amlodipine 5mg', status: 'discontinued' },
  ],
  edges: [
    {
      source: 'rx-001',
      target: 'rx-002',
      severity: 'mild',
      description: 'Metformin + Lisinopril: May enhance hypoglycemic effect. Monitor blood glucose during illness.',
    },
  ],
};
