/**
 * Public API for the product spec sheet.
 *
 * IMPORTANT: this module (and everything under specSheet/) must only ever be
 * reached through a dynamic `import()`. jsPDF + autoTable are ~145 kB gzip; a
 * static import anywhere in the main graph makes Rollup hoist them back into
 * the main bundle and the code split silently disappears.
 */

import type { ProductData } from '../../types/product';
import { loadSheetAssets } from './assets';
import { buildSpecSheetDoc, createDoc, type BuildOptions } from './buildDoc';
import { slugify } from './format';

export type { BuildOptions };

async function build(product: ProductData, opts: BuildOptions = {}) {
  // Images resolve first so the drawing pass stays synchronous. Never rejects.
  const assets = await loadSheetAssets(product);
  const doc = createDoc(opts.format);
  return buildSpecSheetDoc(doc, product, assets, opts);
}

export function specSheetFilename(product: ProductData): string {
  return `${slugify(product.name, product._id || 'product')}-spec-sheet.pdf`;
}

/** Generate and trigger a download. */
export async function downloadSpecSheet(product: ProductData, opts: BuildOptions = {}): Promise<void> {
  const doc = await build(product, opts);
  doc.save(specSheetFilename(product));
}

/** Same document as a Blob — for a future "attach to quote request" flow. */
export async function buildSpecSheetBlob(product: ProductData, opts: BuildOptions = {}): Promise<Blob> {
  const doc = await build(product, opts);
  return doc.output('blob');
}
