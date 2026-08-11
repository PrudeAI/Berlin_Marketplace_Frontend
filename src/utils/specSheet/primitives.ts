/**
 * Layout primitives. Every drawing operation in the sheet goes through one of
 * these so spacing, colour and pagination behave consistently.
 *
 * All synchronous — images are pre-resolved before drawing starts (see assets.ts).
 */

import type { jsPDF } from 'jspdf';
import autoTable, { type UserOptions } from 'jspdf-autotable';
import type { Geometry } from './geometry';
import type { SheetAssets } from './assets';
import {
  FONT, SIZE, SPACE, RED_50, RED_200, RED_600,
  GRAY_50, GRAY_200, GRAY_400, GRAY_600, GRAY_700, GRAY_900, WHITE,
  type RGB,
} from './theme';
import { txt } from './format';

export interface SheetCtx {
  doc: jsPDF;
  geo: Geometry;
  assets: SheetAssets;
  /** Current vertical cursor, in mm. */
  y: number;
}

export type Row = [label: string, value: string];

// ─── Cursor / pagination ──────────────────────────────────────────────────────

/** Start a new page if `needed` mm won't fit below the cursor. */
export function ensureSpace(ctx: SheetCtx, needed: number): void {
  if (ctx.y + needed > ctx.geo.contentBottom) {
    ctx.doc.addPage();
    ctx.y = ctx.geo.contentTop;
  }
}

// ─── Text ─────────────────────────────────────────────────────────────────────

export function setFont(doc: jsPDF, size: number, style: 'normal' | 'bold' = 'normal', color: RGB = GRAY_700) {
  doc.setFont(FONT, style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

/**
 * Draw wrapped text and advance the cursor by the MEASURED height.
 * Never advance by a constant — that's how long product names collide with
 * whatever comes next.
 */
export function paragraph(
  ctx: SheetCtx,
  text: string,
  opts: { size?: number; style?: 'normal' | 'bold'; color?: RGB; width?: number; gap?: number } = {}
): void {
  const body = txt(text);
  if (!body) return;

  const { doc, geo } = ctx;
  const size = opts.size ?? SIZE.body;
  const width = opts.width ?? geo.contentW;

  setFont(doc, size, opts.style ?? 'normal', opts.color ?? GRAY_700);
  doc.setLineHeightFactor(SPACE.line);

  const lines = doc.splitTextToSize(body, width) as string[];
  const lineH = (size * SPACE.line) / 2.83465; // pt → mm

  for (const line of lines) {
    ensureSpace(ctx, lineH);
    doc.text(line, geo.marginX, ctx.y + lineH * 0.75);
    ctx.y += lineH;
  }
  ctx.y += opts.gap ?? SPACE.paragraph;
}

/** Uppercase red section heading with a hairline rule beneath. */
export function sectionHeading(ctx: SheetCtx, label: string): void {
  const { doc, geo } = ctx;
  ensureSpace(ctx, 16);

  setFont(doc, SIZE.section, 'bold', RED_600);
  doc.text(txt(label).toUpperCase(), geo.marginX, ctx.y + 3.5);
  ctx.y += 5;

  doc.setDrawColor(...RED_200);
  doc.setLineWidth(0.3);
  doc.line(geo.marginX, ctx.y, geo.pageW - geo.marginX, ctx.y);
  ctx.y += SPACE.afterHeading;
}

// ─── Tables ───────────────────────────────────────────────────────────────────

/**
 * House-styled autoTable. Wraps the one un-typed v5 accessor
 * (`doc.lastAutoTable.finalY`) so a future API change breaks in one place, and
 * the `?? ctx.y` stops a zero-row table producing NaN and corrupting every
 * subsequent y position.
 */
export function runTable(ctx: SheetCtx, opts: UserOptions): number {
  const { doc, geo } = ctx;

  autoTable(doc, {
    theme: 'grid',
    startY: ctx.y,
    margin: {
      left: geo.marginX,
      right: geo.marginX,
      // Without margin.top a continuation page starts under the header band.
      top: geo.contentTop,
      bottom: geo.pageH - geo.contentBottom,
    },
    styles: {
      font: FONT,
      fontSize: SIZE.table,
      cellPadding: 2,
      textColor: GRAY_700,
      lineColor: GRAY_200,
      lineWidth: 0.1,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fillColor: GRAY_700,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: SIZE.table,
    },
    alternateRowStyles: { fillColor: GRAY_50 },
    rowPageBreak: 'avoid',
    ...opts,
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? ctx.y;
  ctx.y = finalY + SPACE.section;
  return finalY;
}

/** Key/value table. The label column width is pinned via geo.labelColW. */
export function kvTable(ctx: SheetCtx, rows: Row[], opts: UserOptions = {}): void {
  if (rows.length === 0) return;
  runTable(ctx, {
    body: rows,
    columnStyles: {
      0: { cellWidth: ctx.geo.labelColW, fontStyle: 'bold', textColor: GRAY_900, fillColor: GRAY_50 },
      1: { cellWidth: 'auto' },
    },
    ...opts,
  });
}

/**
 * Two side-by-side blocks as ONE table row with two cells.
 *
 * Deliberately not two independent tables sharing a startY: if one column
 * paginates and the other doesn't, they desynchronise across the break. As a
 * single row they're inherently top-aligned, the row height is the max of both,
 * and rowPageBreak:'auto' splits a tall row with both columns in step.
 */
export function twoColBlock(
  ctx: SheetCtx,
  left: { title: string; lines: string[] },
  right: { title: string; lines: string[] }
): void {
  const l = left.lines.filter(Boolean);
  const r = right.lines.filter(Boolean);
  if (l.length === 0 && r.length === 0) return;

  // Collapse to one full-width column when only one side has content.
  if (l.length === 0 || r.length === 0) {
    const only = l.length ? left : right;
    const lines = l.length ? l : r;
    sectionHeading(ctx, only.title);
    runTable(ctx, {
      body: [[lines.map(x => `• ${txt(x)}`).join('\n')]],
      theme: 'plain',
      styles: { font: FONT, fontSize: SIZE.body, textColor: GRAY_700, cellPadding: { top: 0, right: 0, bottom: 1.5, left: 0 }, valign: 'top' },
      columnStyles: { 0: { cellWidth: ctx.geo.contentW } },
      rowPageBreak: 'auto',
    });
    return;
  }

  // cellWidth INCLUDES cellPadding in autoTable v5, so the two halves must sum
  // to exactly contentW — anything less and it warns about leftover width. The
  // visual gutter comes from each cell's 6mm right padding, not from the width.
  const half = ctx.geo.contentW / 2;
  ensureSpace(ctx, 18);
  runTable(ctx, {
    head: [[txt(left.title).toUpperCase(), txt(right.title).toUpperCase()]],
    body: [[
      l.map(x => `• ${txt(x)}`).join('\n'),
      r.map(x => `• ${txt(x)}`).join('\n'),
    ]],
    theme: 'plain',
    styles: {
      font: FONT, fontSize: SIZE.body, textColor: GRAY_700,
      cellPadding: { top: 1.5, right: 6, bottom: 1.5, left: 0 }, valign: 'top',
    },
    headStyles: {
      font: FONT, fontSize: SIZE.section, fontStyle: 'bold',
      textColor: RED_600, fillColor: WHITE,
      cellPadding: { top: 0, right: 6, bottom: 2, left: 0 },
    },
    columnStyles: { 0: { cellWidth: half }, 1: { cellWidth: half } },
    // Bulleted prose reads better unbanded; the zebra inherited from runTable
    // would tint the whole block.
    alternateRowStyles: { fillColor: WHITE },
    rowPageBreak: 'auto',
  });
}

// ─── Decorative blocks ────────────────────────────────────────────────────────

/** Tinted callout with a red left rule — mirrors the page's "Why This Product". */
export function calloutBox(ctx: SheetCtx, label: string, body: string): void {
  const text = txt(body);
  if (!text) return;

  const { doc, geo } = ctx;
  setFont(doc, SIZE.body, 'normal', GRAY_700);
  doc.setLineHeightFactor(SPACE.line);

  const innerW = geo.contentW - 12;
  const lines = doc.splitTextToSize(text, innerW) as string[];
  const lineH = (SIZE.body * SPACE.line) / 2.83465;
  const boxH = lines.length * lineH + 12;

  ensureSpace(ctx, boxH + 2);

  doc.setFillColor(...RED_50);
  doc.roundedRect(geo.marginX, ctx.y, geo.contentW, boxH, 1.5, 1.5, 'F');
  doc.setFillColor(...RED_600);
  doc.rect(geo.marginX, ctx.y, 1.2, boxH, 'F');

  setFont(doc, SIZE.micro, 'bold', RED_600);
  doc.text(txt(label).toUpperCase(), geo.marginX + 6, ctx.y + 5);

  setFont(doc, SIZE.body, 'normal', GRAY_700);
  lines.forEach((line, i) => {
    doc.text(line, geo.marginX + 6, ctx.y + 9.5 + i * lineH);
  });

  ctx.y += boxH + SPACE.section;
}

/** Horizontal 0–100 bar used for the ecoScoreDetails breakdown. */
export function scoreBar(ctx: SheetCtx, label: string, value: number, color: RGB): void {
  const { doc, geo } = ctx;
  const rowH = 6;
  ensureSpace(ctx, rowH + 2);

  const labelW = 52;
  const barW = geo.contentW - labelW - 18;
  const pct = Math.max(0, Math.min(100, value));

  setFont(doc, SIZE.table, 'normal', GRAY_600);
  doc.text(txt(label), geo.marginX, ctx.y + 3.4);

  doc.setFillColor(...GRAY_200);
  doc.roundedRect(geo.marginX + labelW, ctx.y + 1, barW, 2.6, 1.3, 1.3, 'F');
  if (pct > 0) {
    doc.setFillColor(...color);
    doc.roundedRect(geo.marginX + labelW, ctx.y + 1, (barW * pct) / 100, 2.6, 1.3, 1.3, 'F');
  }

  setFont(doc, SIZE.table, 'bold', GRAY_900);
  doc.text(`${Math.round(pct)}`, geo.pageW - geo.marginX, ctx.y + 3.4, { align: 'right' });

  ctx.y += rowH;
}

/** Row of pill-style chips, wrapping across lines. */
export function chipRow(ctx: SheetCtx, labels: string[], fill: RGB = GRAY_50, color: RGB = GRAY_700): void {
  const items = labels.map(txt).filter(Boolean);
  if (items.length === 0) return;

  const { doc, geo } = ctx;
  const chipH = 5;
  let x = geo.marginX;

  setFont(doc, SIZE.micro, 'normal', color);
  ensureSpace(ctx, chipH + 2);

  for (const item of items) {
    const w = doc.getTextWidth(item) + 5;
    if (x + w > geo.pageW - geo.marginX) {
      x = geo.marginX;
      ctx.y += chipH + 1.5;
      ensureSpace(ctx, chipH + 2);
    }
    doc.setFillColor(...fill);
    doc.roundedRect(x, ctx.y, w, chipH, 1.2, 1.2, 'F');
    setFont(doc, SIZE.micro, 'normal', color);
    doc.text(item, x + 2.5, ctx.y + 3.4);
    x += w + 2;
  }

  ctx.y += chipH + SPACE.paragraph;
}

/**
 * Draw an image inside a fixed box, preserving aspect ratio.
 *
 * The box size is fixed whether or not the image loaded, so every downstream y
 * is identical — no layout shift on failure.
 */
export function imageBox(
  ctx: SheetCtx,
  image: SheetAssets['hero'],
  box: { x: number; y: number; w: number; h: number }
): void {
  const { doc } = ctx;

  doc.setFillColor(...GRAY_50);
  doc.setDrawColor(...GRAY_200);
  doc.setLineWidth(0.2);
  doc.roundedRect(box.x, box.y, box.w, box.h, 1.5, 1.5, 'FD');

  if (!image) {
    setFont(doc, SIZE.micro, 'normal', GRAY_400);
    doc.text('Image unavailable', box.x + box.w / 2, box.y + box.h / 2, { align: 'center' });
    return;
  }

  // Never pass the box's w AND h straight to addImage — that squashes bottles.
  const pad = 3;
  const scale = Math.min((box.w - pad * 2) / image.width, (box.h - pad * 2) / image.height);
  const w = image.width * scale;
  const h = image.height * scale;

  doc.addImage(
    image.dataUrl,
    image.format,
    box.x + (box.w - w) / 2,
    box.y + (box.h - h) / 2,
    w,
    h,
    undefined,
    'FAST'
  );
}
