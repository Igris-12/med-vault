/**
 * API hook factory — swaps between mock data and real API based on VITE_USE_MOCK.
 *
 * Usage in components:
 *   import { useDashboardSummary } from '../api/records';
 *   const { data, loading, error } = useDashboardSummary();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─── Auth-ready promise ───────────────────────────────────────────────────────
// Firebase auth state is async. On page load, auth.currentUser is null for
// a brief moment before the persisted session is restored. All API hooks
// call getAuthToken() immediately, so without this guard they fire with an
// empty token and get 401'd. This promise resolves once auth state is known.
let _authReadyResolve: (() => void) | null = null;
const _authReady = new Promise<void>((resolve) => { _authReadyResolve = resolve; });
onAuthStateChanged(auth, () => { _authReadyResolve?.(); });

// ─── Auth token helper ────────────────────────────────────────────────────────
export async function getAuthToken(): Promise<string> {


  // Wait until Firebase has restored the persisted session (max ~2s on cold load)
  await _authReady;

  const currentUser = auth.currentUser;
  if (currentUser) {
    return currentUser.getIdToken(false);
  }

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

// ─── Raw fetch with auth (returns Response, not parsed data) ──────────────────
// Use this when you need to inspect the full response or handle errors manually
export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
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
