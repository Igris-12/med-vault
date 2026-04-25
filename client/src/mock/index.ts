// ─── Central mock data re-export ─────────────────────────────────────────────
// All components import from here. Swap real API calls by toggling USE_MOCK_DATA.

export { MOCK_USER } from './mockUser';
export { MOCK_DOCUMENTS } from './mockDocuments';
export { MOCK_TIMELINE } from './mockTimeline';
export { MOCK_PRESCRIPTIONS, MOCK_INTERACTION_GRAPH } from './mockPrescriptions';
export { MOCK_ANOMALIES } from './mockAnomalies';
export { MOCK_CHAT_HISTORY, MOCK_SUGGESTED_QUESTIONS } from './mockChat';
export { MOCK_DASHBOARD_SUMMARY } from './mockDashboard';
export { MOCK_PRESCRIPTION_EXTRACTION } from './mockPrescriptionExtraction';
export { MOCK_ALERTS } from './mockAlerts';

// ─── Global mock flag ─────────────────────────────────────────────────────────
// Set VITE_USE_MOCK=true in client/.env to use mock data everywhere.
// Set VITE_USE_MOCK=false to use the real Express API.
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK === 'true';

