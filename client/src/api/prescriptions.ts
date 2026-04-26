import { apiFetch, useApiData } from './base';
import type { Prescription, InteractionGraph, PrescriptionExtractionResponse } from '../types/api';

export function usePrescriptions() {
  return useApiData<Prescription[]>(
    () => apiFetch('/api/prescriptions'),
    []
  );
}

export function useInteractionGraph() {
  return useApiData<InteractionGraph>(
    () => apiFetch('/api/prescriptions/interaction-graph'),
    []
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
      return apiFetch(`/api/prescriptions/extraction/${docId}`);
    },
    [docId]
  );
}

export async function confirmExtraction(
  docId: string,
  manualCorrections: Record<string, string>
): Promise<{ confirmed: boolean }> {
  return apiFetch(`/api/prescriptions/confirm/${docId}`, {
    method: 'POST',
    body: JSON.stringify({ manualCorrections }),
  });
}
