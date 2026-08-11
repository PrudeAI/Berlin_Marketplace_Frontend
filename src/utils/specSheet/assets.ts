/**
 * Image loading — the ONLY async, DOM-touching module in the spec sheet.
 *
 * jsPDF drawing is synchronous and addImage needs a data URL in hand, so every
 * image is resolved up front and handed to a pure, synchronous buildDoc(). That
 * split is also what lets buildDoc run under Node for testing.
 *
 * Nothing here ever rejects. A missing image must never cost the user their PDF.
 */

import type { ProductData } from '../../types/product';

export interface LoadedImage {
  dataUrl: string;
  format: 'PNG' | 'JPEG';
  width: number;
  height: number;
}

export interface SheetAssets {
  logo: LoadedImage | null;
  hero: LoadedImage | null;
}

const LOAD_TIMEOUT_MS = 6000;

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Required for a canvas we intend to read back. A host that doesn't send
    // ACAO fails here at onerror, before the canvas is ever tainted.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Image load timed out')), ms)),
  ]);
}

async function loadImage(
  url: string,
  opts: { maxEdge: number; output: 'PNG' | 'JPEG' }
): Promise<LoadedImage | null> {
  try {
    const img = await withTimeout(loadImageElement(url), LOAD_TIMEOUT_MS);
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;
    if (!natW || !natH) return null;

    const scale = Math.min(1, opts.maxEdge / Math.max(natW, natH));
    const w = Math.max(1, Math.round(natW * scale));
    const h = Math.max(1, Math.round(natH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const cx = canvas.getContext('2d');
    if (!cx) return null;

    // JPEG has no alpha — without this, transparent PNGs come out black.
    if (opts.output === 'JPEG') {
      cx.fillStyle = '#ffffff';
      cx.fillRect(0, 0, w, h);
    }
    cx.drawImage(img, 0, 0, w, h);

    // Throws SecurityError if the canvas got tainted — the contingency for a
    // CDN that stops sending CORS headers.
    const dataUrl =
      opts.output === 'JPEG' ? canvas.toDataURL('image/jpeg', 0.82) : canvas.toDataURL('image/png');

    return { dataUrl, format: opts.output, width: natW, height: natH };
  } catch {
    return null;
  }
}

/** Resolve every image the sheet needs. Never throws. */
export async function loadSheetAssets(product: ProductData): Promise<SheetAssets> {
  const logoUrl = `${import.meta.env.BASE_URL || '/'}Berlin_Logo.png`;

  const heroCandidates = [...new Set([product.primaryImage, product.images?.[0]].filter(Boolean))] as string[];

  const [logo, hero] = await Promise.all([
    // Same-origin, so no CORS path at all. Loaded once and reused on every page.
    loadImage(logoUrl, { maxEdge: 200, output: 'PNG' }),
    (async () => {
      for (const url of heroCandidates.slice(0, 2)) {
        const img = await loadImage(url, { maxEdge: 1000, output: 'JPEG' });
        if (img) return img;
      }
      return null;
    })(),
  ]);

  return { logo, hero };
}
