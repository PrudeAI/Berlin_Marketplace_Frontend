/**
 * Spec-sheet orchestrator.
 *
 * PURE and SYNCHRONOUS by design — every image is already resolved into
 * `assets` before this runs. That's what lets the whole layout be exercised
 * under Node with `assets = {logo:null, hero:null}`, no browser required.
 */

import { jsPDF } from 'jspdf';
import type { ProductData } from '../../types/product';
import { getSupplierDisplayName } from '../supplierDisplay';
import type { SheetAssets } from './assets';
import { makeGeometry } from './geometry';
import { type SheetCtx } from './primitives';
import { stampChrome, setDocumentProperties } from './chrome';
import { txt } from './format';
import {
  titleSection, heroSection, descriptionSection, featuresSection,
  specificationsSection, formatSection, pricingSection, customizationSection,
  sustainabilitySection, complianceSection, applicationsSection,
  availabilitySection, supplierSection, disclaimerSection,
} from './sections';

export interface BuildOptions {
  /** Canonical URL of the product page, printed in the footer. */
  pageUrl?: string;
  /** Injectable so the Node harness produces byte-stable output. */
  generatedOn?: string;
  format?: 'a4' | 'letter';
}

export function createDoc(format: 'a4' | 'letter' = 'a4'): jsPDF {
  return new jsPDF({ unit: 'mm', format, orientation: 'portrait', compress: true });
}

/** Draw the whole sheet into `doc`. Synchronous; never touches the DOM. */
export function buildSpecSheetDoc(
  doc: jsPDF,
  product: ProductData,
  assets: SheetAssets,
  opts: BuildOptions = {}
): jsPDF {
  const geo = makeGeometry(doc);
  const ctx: SheetCtx = { doc, geo, assets, y: geo.contentTop };

  const generatedOn =
    opts.generatedOn ??
    new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  titleSection(ctx, product);
  heroSection(ctx, product);
  descriptionSection(ctx, product);
  featuresSection(ctx, product);
  specificationsSection(ctx, product);
  formatSection(ctx, product);
  pricingSection(ctx, product);
  customizationSection(ctx, product);
  sustainabilitySection(ctx, product);
  complianceSection(ctx, product);
  applicationsSection(ctx, product);
  availabilitySection(ctx, product);
  supplierSection(ctx, product);
  disclaimerSection(ctx, product, generatedOn);

  // Chrome LAST — the page count isn't known until every section has rendered.
  setDocumentProperties(doc, product, getSupplierDisplayName(product, 'Berlin Packaging'));
  stampChrome(doc, geo, assets, {
    productName: txt(product.name),
    supplierName: getSupplierDisplayName(product, ''),
    generatedOn,
    pageUrl: opts.pageUrl,
  });

  return doc;
}
