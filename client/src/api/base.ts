/**
 * API hook factory — swaps between mock data and real API based on VITE_USE_MOCK.
 *
 * Usage in components:
 *   import { useDashboardSummary } from '../api/records';
 *   const { data, loading, error } = useDashboardSummary();
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const IS_DEV = import.meta.env.DEV;
const DEV_BYPASS_TOKEN = 'dev-bypass-token';

// ─── Auth token helper (supports dev-bypass mode) ────────────────────────────
export function getAuthToken(): string {
  // In mock mode, return the dev bypass token — no Firebase needed
  if (import.meta.env.VITE_USE_MOCK === 'true') return DEV_BYPASS_TOKEN;

  // In real mode, prefer a Firebase token but fall back to the existing
  // development bypass path so protected routes still work in local dev.
  const firebaseToken = localStorage.getItem('firebase_token');
  if (firebaseToken) return firebaseToken;
  if (IS_DEV) return DEV_BYPASS_TOKEN;

  return '';
}

// ─── Base fetch with auth header ─────────────────────────────────────────────
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }

  const json = await res.json();
  return json.data as T;
}

// ─── Generic data fetching hook ────────────────────────────────────────────────
export function useApiData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
