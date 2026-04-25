import { apiFetch, useApiData } from './base';
import { USE_MOCK_DATA, MOCK_PRESCRIPTIONS, MOCK_INTERACTION_GRAPH } from '../mock';
import type { Prescription, InteractionGraph } from '../types/api';

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
