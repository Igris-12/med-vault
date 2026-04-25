import { apiFetch, useApiData } from './base';
import { USE_MOCK_DATA, MOCK_PRESCRIPTIONS, MOCK_INTERACTION_GRAPH, MOCK_PRESCRIPTION_EXTRACTION } from '../mock';
import type { Prescription, InteractionGraph, PrescriptionExtractionResponse } from '../types/api';

export function usePrescriptions() {
  return useApiData<Prescription[]>(
    () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_PRESCRIPTIONS)
      : apiFetch('/api/prescriptions'),
    [USE_MOCK_DATA]
  );
}

export function useInteractionGraph() {
  return useApiData<InteractionGraph>(
    () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_INTERACTION_GRAPH)
      : apiFetch('/api/prescriptions/interaction-graph'),
    [USE_MOCK_DATA]
  );
}

export async function addPrescription(data: Partial<Prescription>): Promise<Prescription> {
  return apiFetch('/api/prescriptions', { method: 'POST', body: JSON.stringify(data) });
}

// ─── Prescription Viewer API ─────────────────────────────────────────────────

export function usePrescriptionExtraction(docId: string | null) {
  return useApiData<PrescriptionExtractionResponse>(
    () => {
      if (!docId) return Promise.reject(new Error('No docId'));
      if (USE_MOCK_DATA) return Promise.resolve(MOCK_PRESCRIPTION_EXTRACTION);
      return apiFetch(`/api/prescriptions/extraction/${docId}`);
    },
    [docId, USE_MOCK_DATA]
  );
}

export async function confirmExtraction(
  docId: string,
  manualCorrections: Record<string, string>
): Promise<{ confirmed: boolean }> {
  if (USE_MOCK_DATA) {
    console.log('[Mock] Confirmed extraction for', docId, 'corrections:', manualCorrections);
    return Promise.resolve({ confirmed: true });
  }
  return apiFetch(`/api/prescriptions/confirm/${docId}`, {
    method: 'POST',
    body: JSON.stringify({ manualCorrections }),
  });
}
