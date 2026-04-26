import { apiFetch, useApiData, getAuthToken } from './base';
import type { ChatSession } from '../types/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useChatSessions() {
  return useApiData<ChatSession[]>(
    () => apiFetch('/api/chat/sessions'),
    []
  );
}

export function useChatSession(sessionId: string) {
  return useApiData<ChatSession>(
    () => apiFetch(`/api/chat/sessions/${sessionId}`),
    [sessionId]
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
