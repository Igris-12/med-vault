import type { PrescriptionExtractionResponse } from '../types/api';

/**
 * Mock prescription extraction for dev mode (VITE_USE_MOCK=true).
 * Simulates what Gemini returns for doc-006 (prescription_metformin.jpg).
 */
export const MOCK_PRESCRIPTION_EXTRACTION: PrescriptionExtractionResponse = {
  filename: 'prescription_metformin.jpg',
  status: 'done',
  imageUrl: '/api/uploads/file/doc-006',
  extraction: {
    patient_name: {
      value: 'Rajesh Kumar',
      bounding_box: [0.05, 0.35, 0.10, 0.75],
      confidence_score: 88,
      confidence_reason: 'printed clearly in block letters',
    },
    doctor_name: {
      value: 'Dr. Arjun Rao',
      bounding_box: [0.02, 0.50, 0.06, 0.88],
      confidence_score: 95,
      confidence_reason: 'rubber stamp + signature legible',
    },
    date: {
      value: '01-Aug-2023',
      bounding_box: [0.02, 0.05, 0.06, 0.30],
      confidence_score: 91,
      confidence_reason: 'printed numerals, unambiguous',
    },
    medications: [
      {
        medication_name: {
          value: 'Metformin HCl',
          bounding_box: [0.25, 0.08, 0.31, 0.45],
          confidence_score: 82,
          confidence_reason: 'cursive script, standard abbreviation',
        },
        dosage: {
          value: '1000mg',
          bounding_box: [0.25, 0.46, 0.31, 0.60],
          confidence_score: 90,
          confidence_reason: 'printed numerals',
        },
        frequency: {
          value: 'BD (twice daily with meals)',
          bounding_box: [0.25, 0.61, 0.31, 0.85],
          confidence_score: 78,
          confidence_reason: 'abbreviation partially ambiguous',
        },
        duration: {
          value: '3 months',
          bounding_box: [0.32, 0.08, 0.37, 0.30],
          confidence_score: 85,
          confidence_reason: 'clear numeral, word legible',
        },
        instructions: {
          value: 'Take after food. Avoid alcohol.',
          bounding_box: [0.37, 0.08, 0.43, 0.70],
          confidence_score: 65,
          confidence_reason: 'small cursive, partially cramped',
        },
      },
      {
        medication_name: {
          value: 'ILLEGIBLE',
          bounding_box: [0.46, 0.08, 0.52, 0.45],
          confidence_score: 32,
          confidence_reason: 'heavily cursive, ink smudge obscures name',
        },
        dosage: {
          value: '10mg',
          bounding_box: [0.46, 0.46, 0.52, 0.60],
          confidence_score: 72,
          confidence_reason: 'numeral legible, unit inferred',
        },
        frequency: {
          value: 'OD (once daily, morning)',
          bounding_box: [0.46, 0.61, 0.52, 0.85],
          confidence_score: 80,
          confidence_reason: 'standard OD abbreviation',
        },
        duration: {
          value: '3 months',
          bounding_box: [0.53, 0.08, 0.58, 0.30],
          confidence_score: 85,
          confidence_reason: 'matches first medication duration',
        },
        instructions: {
          value: null,
          bounding_box: [0, 0, 0, 0],
          confidence_score: 0,
          confidence_reason: 'not present',
        },
      },
    ],
    diagnosis: {
      value: 'T2DM + HTN',
      bounding_box: [0.14, 0.08, 0.20, 0.50],
      confidence_score: 60,
      confidence_reason: 'medical abbreviations, partially legible',
    },
    overall_legibility: 74,
  },
};
