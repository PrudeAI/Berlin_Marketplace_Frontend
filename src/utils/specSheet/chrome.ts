/**
 * Running header and footer.
 *
 * Drawn in a FINAL PASS over every page rather than in autoTable's
 * didDrawPage, for two reasons:
 *   1. didDrawPage fires once per table per page, so a page touched by three
 *      tables would get three headers unless guarded.
 *   2. The total page count isn't known while tables are still rendering, which
 *      makes "Page 3 of 7" impossible. This is the classic page-numbering bug.
 */

import type { jsPDF } from 'jspdf';
import type { Geometry } from './geometry';
import type { SheetAssets } from './assets';
import { FONT, SIZE, RED_600, GRAY_200, GRAY_400, GRAY_600, WHITE } from './theme';
import { txt, truncate } from './format';

export interface ChromeInfo {
  productName: string;
  supplierName: string;
  generatedOn: string;
  pageUrl?: string;
}

export function stampChrome(doc: jsPDF, geo: Geometry, assets: SheetAssets, info: ChromeInfo): void {
  const total = doc.getNumberOfPages();

  for (let page = 1; page <= total; page++) {
    doc.setPage(page);

    // Repaint the band white first: a stray descender from an overflowing
    // section can never smear into the header.
    doc.setFillColor(...WHITE);
    doc.rect(0, 0, geo.pageW, geo.accentBarY, 'F');

    let textLeft = geo.marginX;
    if (assets.logo) {
      const size = 11;
      doc.addImage(assets.logo.dataUrl, 'PNG', geo.marginX, 4.5, size, size, undefined, 'FAST');
      textLeft = geo.marginX + size + 4;
    }

    doc.setFont(FONT, 'bold');
    doc.setFontSize(SIZE.eyebrow);
    doc.setTextColor(...GRAY_400);
    doc.setCharSpace(0.4);
    doc.text('PRODUCT SPECIFICATION SHEET', textLeft, 11.5);
    doc.setCharSpace(0);

    // Right side: supplier on page 1, product name thereafter. Truncated to
    // whatever room is left after the logo — this is the collision that bites.
    const rightLabel = page === 1 ? info.supplierName : info.productName;
    if (rightLabel) {
      doc.setFont(FONT, 'normal');
      doc.setFontSize(SIZE.eyebrow);
      doc.setTextColor(...GRAY_600);
      const available = geo.pageW - geo.marginX - textLeft - 60;
      const maxChars = Math.max(12, Math.floor(available / 1.35));
      doc.text(truncate(rightLabel, maxChars), geo.pageW - geo.marginX, 11.5, { align: 'right' });
    }

    doc.setFillColor(...RED_600);
    doc.rect(0, geo.accentBarY, geo.pageW, geo.accentBarH, 'F');

    // ── Footer ──
    doc.setDrawColor(...GRAY_200);
    doc.setLineWidth(0.2);
    doc.line(geo.marginX, geo.footerRuleY, geo.pageW - geo.marginX, geo.footerRuleY);

    doc.setFont(FONT, 'normal');
    doc.setFontSize(SIZE.micro);
    doc.setTextColor(...GRAY_400);

    doc.text(`Generated ${info.generatedOn}`, geo.marginX, geo.footerTextY);

    if (info.pageUrl) {
      doc.text(truncate(info.pageUrl, 78), geo.pageW / 2, geo.footerTextY, { align: 'center' });
    }

    doc.text(`Page ${page} of ${total}`, geo.pageW - geo.marginX, geo.footerTextY, { align: 'right' });
  }
}

export function setDocumentProperties(doc: jsPDF, product: { name: string; category?: string; tags?: string[] }, supplierName: string): void {
  doc.setProperties({
    title: `${txt(product.name)} — Specification Sheet`,
    subject: txt(product.category || 'Packaging product specification'),
    author: txt(supplierName),
    creator: 'Berlin Packaging Marketplace',
    keywords: (product.tags || []).map(txt).filter(Boolean).join(', '),
  });
}
