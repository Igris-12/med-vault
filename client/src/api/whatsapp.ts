import { apiFetch } from './base';

export interface WAMessage {
  _id: string;
  userId: string | null;
  phoneNumber: string;
  direction: 'in' | 'out';
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  timestamp: string;
}

export interface WAStatus {
  connected: boolean;
  phone: string | null;
}

export interface WAStats {
  sentToday: number;
  total: number;
  connected: boolean;
  phone?: string;
}

export async function getWhatsAppMessages(limit = 50): Promise<{ data: WAMessage[]; connected: boolean; phone?: string }> {
  const { getAuthToken } = await import('./base');
  const token = await getAuthToken();
  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/whatsapp/messages?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return json;
}

export async function getWhatsAppStatus(): Promise<WAStatus> {
  return apiFetch<WAStatus>('/api/whatsapp/status');
}

export async function getWhatsAppStats(): Promise<WAStats> {
  return apiFetch<WAStats>('/api/whatsapp/stats');
}

// Support bot
export async function getSupportSession(sessionId: string): Promise<any> {
  return apiFetch(`/api/support/session/${sessionId}`);
}

export async function postSupportMessage(sessionId: string, content: string): Promise<{
  userMessage: { role: string; content: string; timestamp: string };
  assistantMessage: { role: string; content: string; timestamp: string };
}> {
  return apiFetch(`/api/support/session/${sessionId}/message`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}
