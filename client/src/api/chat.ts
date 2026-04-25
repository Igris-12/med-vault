import { apiFetch, useApiData, getAuthToken } from './base';
import { USE_MOCK_DATA, MOCK_CHAT_HISTORY } from '../mock';
import type { ChatSession } from '../types/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useChatSessions() {
  return useApiData<ChatSession[]>(
    () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_CHAT_HISTORY)
      : apiFetch('/api/chat/sessions'),
    [USE_MOCK_DATA]
  );
}

export function useChatSession(sessionId: string) {
  return useApiData<ChatSession>(
    () => USE_MOCK_DATA
      ? Promise.resolve(MOCK_CHAT_HISTORY.find((s) => s._id === sessionId)!)
      : apiFetch(`/api/chat/sessions/${sessionId}`),
    [sessionId, USE_MOCK_DATA]
  );
}

/**
 * Streams a chat response via SSE.
 * onChunk is called for each text chunk.
 * onDone is called with source doc IDs when the stream ends.
 */
export async function streamChatMessage(
  message: string,
  sessionId: string | null,
  onChunk: (chunk: string) => void,
  onDone: (sourceDocIds: string[]) => void,
  onError: (err: string) => void
): Promise<void> {
  if (USE_MOCK_DATA) {
    // Simulate streaming a mock response
    const mockReply =
      "I'm analyzing your medical records... Based on your recent lab reports, your HbA1c has been showing a rising trend over the past 2 years. Your most recent reading of 7.9% in March 2024 is above target. I'd recommend discussing this with Dr. Meena Kapoor.";
    for (const char of mockReply) {
      await new Promise((r) => setTimeout(r, 15));
      onChunk(char);
    }
    onDone(['doc-004', 'doc-003']);
    return;
  }

  const url = `${API_BASE}/api/chat/message`;
  const token = await getAuthToken();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId, message }),
  });

  if (!res.ok || !res.body) {
    onError('Failed to connect to chat service');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const payload = JSON.parse(line.slice(6));
        if (payload.chunk) onChunk(payload.chunk);
        if (payload.done) onDone(payload.sourceDocIds || []);
        if (payload.error) onError(payload.error);
      } catch { /* skip malformed lines */ }
    }
  }
}
