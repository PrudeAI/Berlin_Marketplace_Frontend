import type { AIExtractedProduct, SSEStartEvent, SSEDoneEvent, SSEErrorEvent } from '../utils/aiTypes';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export type ExtractionCallbacks = {
  onStart?: (data: SSEStartEvent) => void;
  onProduct?: (product: AIExtractedProduct) => void;
  onDone?: (data: SSEDoneEvent) => void;
  onError?: (data: SSEErrorEvent) => void;
};

/**
 * Upload a file to the v2 extraction endpoint and stream products via SSE.
 * Calls the appropriate callback for each SSE event type.
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

  // Use fetch with ReadableStream to handle SSE
  const response = await fetch(`${API_URL}/api/ai/v2/extract-products`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    callbacks.onError?.({ message: `Server error ${response.status}: ${err}` });
    return;
  }

  if (!response.body) {
    callbacks.onError?.({ message: 'No response body (SSE not supported)' });
    return;
  }

  // Parse SSE stream
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
          case 'start':
            callbacks.onStart?.(data as SSEStartEvent);
            break;
          case 'product':
            callbacks.onProduct?.(data as AIExtractedProduct);
            break;
          case 'done':
            callbacks.onDone?.(data as SSEDoneEvent);
            break;
          case 'error':
            callbacks.onError?.(data as SSEErrorEvent);
            break;
        }
      } catch (parseErr) {
        console.warn('[aiExtractionService] Failed to parse SSE data:', dataStr);
      }
    }
  }
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
