/**
 * API hook factory — swaps between mock data and real API based on VITE_USE_MOCK.
 *
 * Usage in components:
 *   import { useDashboardSummary } from '../api/records';
 *   const { data, loading, error } = useDashboardSummary();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { auth } from '../config/firebase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const IS_DEV   = import.meta.env.DEV;

// ─── Auth token helper ────────────────────────────────────────────────────────
/**
 * Always fetches a fresh Firebase ID token via the SDK.
 * Firebase auto-refreshes expired tokens transparently — no manual caching needed.
 * Falls back to the dev-bypass token when there's no logged-in user in local dev.
 */
export async function getAuthToken(): Promise<string> {
  // Mock mode: bypass Firebase entirely
  if (import.meta.env.VITE_USE_MOCK === 'true') return 'dev-bypass-token';

  const currentUser = auth.currentUser;
  if (currentUser) {
    // forceRefresh=false: returns cached token if still valid, refreshes if expired
    return currentUser.getIdToken(false);
  }

  // No Firebase user — use dev bypass only in development
  if (IS_DEV) return 'dev-bypass-token';

  return '';
}

// ─── Base fetch with auth header ─────────────────────────────────────────────
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
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

// ─── Generic data fetching hook ───────────────────────────────────────────────
export function useApiData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data,    setData]    = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Track mount state to avoid setState after unmount
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    if (isMounted.current) setLoading(true);
    if (isMounted.current) setError(null);
    try {
      const result = await fetcher();
      if (isMounted.current) setData(result);
    } catch (err) {
      if (isMounted.current) setError((err as Error).message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refetch: load };
}
