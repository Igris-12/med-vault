import { apiFetch, useApiData } from './base';
import {
  USE_MOCK_DATA, MOCK_DOCUMENTS, MOCK_TIMELINE, MOCK_ANOMALIES, MOCK_DASHBOARD_SUMMARY, MOCK_ALERTS
} from '../mock';
import type { MedDocument, TimelineMonth, Anomaly, DashboardSummary, HealthAlert } from '../types/api';

// ─── Alerts ────────────────────────────────────────────────────────────────
export function useAlerts() {
  return useApiData<HealthAlert[]>(
    () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_ALERTS)
      : apiFetch('/api/records/alerts'),
    [USE_MOCK_DATA]
  );
}


// ─── Dashboard Summary ─────────────────────────────────────────────────────
export function useDashboardSummary() {
  return useApiData<DashboardSummary>(
    () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_DASHBOARD_SUMMARY)
      : apiFetch('/api/records/dashboard-summary'),
    [USE_MOCK_DATA]
  );
}

// ─── Timeline ──────────────────────────────────────────────────────────────
export function useTimeline(months = 36) {
  return useApiData<TimelineMonth[]>(
    () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_TIMELINE)
      : apiFetch(`/api/records/timeline?months=${months}`),
    [months, USE_MOCK_DATA]
  );
}

// ─── Anomalies ─────────────────────────────────────────────────────────────
export function useAnomalies() {
  return useApiData<Anomaly[]>(
    () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_ANOMALIES)
      : apiFetch('/api/records/anomalies'),
    [USE_MOCK_DATA]
  );
}

// ─── Documents (paginated) ─────────────────────────────────────────────────
export function useDocuments(params?: {
  page?: number; limit?: number; type?: string; search?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.type) qs.set('type', params.type);
  if (params?.search) qs.set('search', params.search);

  return useApiData<{ docs: MedDocument[]; total: number; page: number; totalPages: number }>(
    () => {
      if (USE_MOCK_DATA) {
        let docs = [...MOCK_DOCUMENTS];
        if (params?.type) docs = docs.filter((d) => d.documentType === params.type);
        if (params?.search) {
          const q = params.search.toLowerCase();
          docs = docs.filter((d) =>
            d.summaryPlain.toLowerCase().includes(q) ||
            d.conditionsMentioned.some((c) => c.toLowerCase().includes(q))
          );
        }
        return Promise.resolve({ docs, total: docs.length, page: 1, totalPages: 1 });
      }
      return apiFetch(`/api/records/documents?${qs.toString()}`);
    },
    [params?.page, params?.type, params?.search, USE_MOCK_DATA]
  );
}

// ─── Single Document ───────────────────────────────────────────────────────
export function useDocument(id: string) {
  return useApiData<MedDocument>(
    () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_DOCUMENTS.find((d) => d._id === id)!)
      : apiFetch(`/api/records/documents/${id}`),
    [id, USE_MOCK_DATA]
  );
}

// ─── Upload ────────────────────────────────────────────────────────────────
export async function uploadFiles(files: File[]): Promise<Array<{ docId: string; filename: string }>> {
  if (USE_MOCK_DATA) {
    // Simulate a 2-second upload delay
    await new Promise((r) => setTimeout(r, 2000));
    return files.map((f, i) => ({ docId: `mock-${Date.now()}-${i}`, filename: f.name }));
  }
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('firebase_token') || 'dev-bypass-token'}` },
    body: formData,
  });
  const json = await res.json();
  return json.data;
}
