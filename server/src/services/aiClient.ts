/**
 * aiClient.ts
 *
 * Thin HTTP adapter for the ai/server.py Playwright-Gemini proxy.
 *
 * The Python Flask server (ai/server.py) exposes two endpoints:
 *   POST /receive  — text-only queries
 *   POST /img      — multimodal queries (base64 image + text)
 *
 * All Gemini *generation* calls are routed here.
 * Text embeddings (text-embedding-004) still use the Google SDK directly
 * because the web UI does not expose an embeddings API.
 */

import https from 'https';
import http from 'http';

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:5000';

// ─── Shared request helper ─────────────────────────────────────────────────────
function postJSON<T>(url: string, body: object, timeoutMs = 600_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';

    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: timeoutMs,
    };

    const transport = isHttps ? https : http;

    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data) as T);
        } catch {
          reject(new Error(`aiClient: invalid JSON from server — ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`aiClient: request timed out after ${timeoutMs}ms`));
    });

    req.on('error', (err) => {
      reject(new Error(`aiClient: connection failed — is ai/server.py running? ${err.message}`));
    });

    req.write(payload);
    req.end();
  });
}

// ─── Response shape from ai/server.py ─────────────────────────────────────────
interface AiServerResponse {
  status: 'success' | 'error';
  response?: string;
  message?: string;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Send a text-only prompt to Gemini via the Playwright proxy.
 * Returns the raw text response.
 */
export async function queryText(prompt: string): Promise<string> {
  const result = await postJSON<AiServerResponse>(
    `${AI_SERVER_URL}/receive`,
    { query: prompt },
  );

  if (result.status !== 'success' || !result.response) {
    throw new Error(`aiClient text query failed: ${result.message ?? 'unknown error'}`);
  }

  return result.response;
}

/**
 * Send an image (as a Buffer) + text prompt to Gemini via the Playwright proxy.
 * The image is base64-encoded and sent as a data URI.
 * Returns the raw text response.
 */
export async function queryImage(
  prompt: string,
  imageBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  const base64 = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

  const result = await postJSON<AiServerResponse>(
    `${AI_SERVER_URL}/img`,
    { query: prompt, image: base64, mime_type: mimeType },
  );

  if (result.status !== 'success' || !result.response) {
    throw new Error(`aiClient image query failed: ${result.message ?? 'unknown error'}`);
  }

  return result.response;
}

/**
 * Health check — returns true if ai/server.py is reachable.
 * Can be called at server startup to emit a warning rather than failing silently.
 */
export async function isAiServerHealthy(): Promise<boolean> {
  try {
    // The /receive endpoint with a trivial query is the lightest check we have.
    // We use a short timeout so the Node server starts quickly either way.
    await postJSON<AiServerResponse>(
      `${AI_SERVER_URL}/receive`,
      { query: 'ping' },
      5_000,
    );
    return true;
  } catch {
    return false;
  }
}
