/**
 * Page geometry. Everything derives from the actual page size so switching
 * format ('a4' → 'letter') needs no other change.
 */

import type { jsPDF } from 'jspdf';

export interface Geometry {
  pageW: number;
  pageH: number;
  marginX: number;
  contentW: number;
  /** Reserved header height — identical on EVERY page so autoTable needs
   *  only one margin.top for continuation pages. */
  headerBand: number;
  accentBarY: number;
  accentBarH: number;
  contentTop: number;
  contentBottom: number;
  footerRuleY: number;
  footerTextY: number;
  /** Pinned label-column width. Every key/value table shares it, otherwise
   *  sections visibly jitter against each other. */
  labelColW: number;
}

export function makeGeometry(doc: jsPDF): Geometry {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 14;

  return {
    pageW,
    pageH,
    marginX,
    contentW: pageW - marginX * 2,
    headerBand: 20,
    accentBarY: 20,
    accentBarH: 1.5,
    contentTop: 26,
    contentBottom: pageH - 18,
    footerRuleY: pageH - 14,
    footerTextY: pageH - 9,
    labelColW: 58,
  };
}
