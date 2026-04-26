import { apiFetch, useApiData, getAuthToken } from './base';
import type { MedDocument, TimelineMonth, Anomaly, DashboardSummary, HealthAlert } from '../types/api';

// ─── Alerts ────────────────────────────────────────────────────────────────
export function useAlerts() {
  return useApiData<HealthAlert[]>(
    () => apiFetch('/api/records/alerts'),
    []
  );
}

// ─── Dashboard Summary ─────────────────────────────────────────────────────
export function useDashboardSummary() {
  return useApiData<DashboardSummary>(
    () => apiFetch('/api/records/dashboard-summary'),
    []
  );
}

// ─── Timeline ──────────────────────────────────────────────────────────────
export function useTimeline(months = 36) {
  return useApiData<TimelineMonth[]>(
    () => apiFetch(`/api/records/timeline?months=${months}`),
    [months]
  );
}

// ─── Anomalies ─────────────────────────────────────────────────────────────
export function useAnomalies() {
  return useApiData<Anomaly[]>(
    () => apiFetch('/api/records/anomalies'),
    []
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
    () => apiFetch(`/api/records/documents?${qs.toString()}`),
    [params?.page, params?.type, params?.search]
  );
}

// ─── Single Document ───────────────────────────────────────────────────────
export function useDocument(id: string) {
  return useApiData<MedDocument>(
    () => apiFetch(`/api/records/documents/${id}`),
    [id]
  );
}

// ─── Upload ────────────────────────────────────────────────────────────────
export async function uploadFiles(files: File[]): Promise<Array<{ docId: string; filename: string }>> {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  const token = await getAuthToken();
  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const json = await res.json();
  return json.data;
}
