import type {
  AIExtractedProduct, SSEStartEvent, SSEDoneEvent, SSEErrorEvent,
  SSEWarningEvent, SSEUrlEvent,
} from '../utils/aiTypes';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export type ExtractionCallbacks = {
  onStart?: (data: SSEStartEvent) => void;
  onProduct?: (product: AIExtractedProduct) => void;
  onDone?: (data: SSEDoneEvent) => void;
  onError?: (data: SSEErrorEvent) => void;
  /** Non-fatal: no thumbnail could be generated, an image upload failed, etc. */
  onWarning?: (data: SSEWarningEvent) => void;
  /** Per-URL progress, only emitted by the URL flow. */
  onUrlStart?: (data: SSEUrlEvent) => void;
  onUrlDone?: (data: SSEUrlEvent) => void;
  onUrlError?: (data: SSEUrlEvent) => void;
};

/**
 * Read an SSE response body and dispatch each frame to the matching callback.
 *
 * EventSource can't send an Authorization header, which is why this is built on
 * fetch + ReadableStream rather than the browser's SSE client.
 *
 * Shared by the file and URL flows so their stream handling can't drift.
 */
async function consumeSSE(response: Response, callbacks: ExtractionCallbacks): Promise<void> {
  if (!response.ok) {
    // The server validates before opening the stream, so failures arrive as JSON.
    let message = `Server error ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      const text = await response.text().catch(() => '');
      if (text) message = `${message}: ${text}`;
    }
    callbacks.onError?.({ message });
    return;
  }

  if (!response.body) {
    callbacks.onError?.({ message: 'No response body (SSE not supported)' });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE messages are separated by double newlines
    const messages = buffer.split('\n\n');
    buffer = messages.pop() ?? ''; // keep incomplete last chunk

    for (const message of messages) {
      const lines = message.trim().split('\n');
      let eventType = 'message';
      let dataStr = '';

      for (const line of lines) {
        if (line.startsWith(':')) continue; // heartbeat comment
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          dataStr = line.slice(6).trim();
        }
      }

      if (!dataStr) continue;

      try {
        const data = JSON.parse(dataStr);
        switch (eventType) {
          case 'start':     callbacks.onStart?.(data as SSEStartEvent); break;
          case 'product':   callbacks.onProduct?.(data as AIExtractedProduct); break;
          case 'done':      callbacks.onDone?.(data as SSEDoneEvent); break;
          case 'error':     callbacks.onError?.(data as SSEErrorEvent); break;
          case 'warning':   callbacks.onWarning?.(data as SSEWarningEvent); break;
          case 'url_start': callbacks.onUrlStart?.(data as SSEUrlEvent); break;
          case 'url_done':  callbacks.onUrlDone?.(data as SSEUrlEvent); break;
          case 'url_error': callbacks.onUrlError?.(data as SSEUrlEvent); break;
          // Unknown event types are ignored on purpose — the server can add more.
        }
      } catch (parseErr) {
        console.warn('[aiExtractionService] Failed to parse SSE data:', dataStr);
      }
    }
  }
}

/**
 * Upload a file to the v2 extraction endpoint and stream products via SSE.
 */
export async function extractProductsFromFile(
  file: File,
  callbacks: ExtractionCallbacks,
  batchSize: number = 3
): Promise<void> {
  const token = localStorage.getItem('supplier_token');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('batchSize', String(batchSize));

  const response = await fetch(`${API_URL}/api/ai/v2/extract-products`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  await consumeSSE(response, callbacks);
}

/**
 * Scrape several product URLs and stream the extracted products via SSE.
 *
 * Unlike the file flow (one request per file, fan-out in the browser), this
 * sends every URL in ONE request and the server runs a bounded worker pool —
 * one connection, one place to throttle scraping credits, one `done` event.
 */
export async function extractProductsFromUrls(
  urls: string[],
  callbacks: ExtractionCallbacks
): Promise<void> {
  const token = localStorage.getItem('supplier_token');

  const response = await fetch(`${API_URL}/api/ai/v2/extract-products-from-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ urls }),
  });

  await consumeSSE(response, callbacks);
}

/**
 * Upload a page image (base64) to Cloudinary via the backend.
 */
export async function uploadPageImage(
  imageBase64: string,
  productId: string,
  mimeType = 'image/png'
): Promise<string | null> {
  const token = localStorage.getItem('supplier_token');

  const response = await fetch(`${API_URL}/api/ai/v2/upload-page-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ imageBase64, productId, mimeType }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.url ?? null;
}

/**
 * Submit approved products to the database.
 */
export async function submitApprovedProducts(
  products: AIExtractedProduct[]
): Promise<{ submitted: number; failed: number; products: { id: string; name: string }[]; errors?: { name: string; error: string }[] }> {
  const token = localStorage.getItem('supplier_token');

  const response = await fetch(`${API_URL}/api/ai/v2/submit-products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ products }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Submission failed');
  }

  return response.json();
}
