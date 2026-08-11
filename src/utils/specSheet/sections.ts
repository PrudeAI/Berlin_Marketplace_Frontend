/**
 * Content sections. Each is a pure (ctx, product) => void.
 *
 * Governing rule: OMIT empty rows — never print "N/A" or a dash. A sparse
 * product must produce a short clean sheet, not a page of blanks, and a section
 * whose rows come back empty is skipped entirely, heading and rule included.
 */

import type { ProductData, DynamicSpec } from '../../types/product';
import { getSupplierDisplayName, hasSupplierOverride } from '../supplierDisplay';
import {
  getMaterials, getLocation, formatDimensions, formatMeasurement,
  sortDynamicSpecs, formatSpecValue, getSupplierEmail,
} from '../productDisplay';
import {
  isEmpty, txt, formatCurrency, formatDate, formatNumber, humanize, yesNo, truncate,
} from './format';
import {
  type SheetCtx, type Row,
  sectionHeading, paragraph, kvTable, twoColBlock, calloutBox,
  scoreBar, chipRow, imageBox, ensureSpace, setFont, runTable,
} from './primitives';
import {
  SIZE, RED_600, GRAY_50, GRAY_400, GRAY_600, GRAY_900, GREEN_600, WHITE, ecoColor,
} from './theme';

/**
 * Push a row only when the formatted value survives sanitising.
 *
 * The value must go through txt() too, not just the label — formatSpecValue is
 * shared with the product page and deliberately doesn't know about the PDF's
 * WinAnsi limitation, so unsanitised CJK would reach Helvetica and render as
 * mojibake. If nothing is left after sanitising, drop the row.
 */
function push(rows: Row[], label: string, value: unknown, unit?: string): void {
  if (isEmpty(value)) return;
  const s = txt(formatSpecValue(value, unit));
  const l = txt(label);
  if (s && l) rows.push([l, s]);
}

/** For fields where the negative is genuinely informative (compliance etc.). */
function pushBool(rows: Row[], label: string, value: boolean | undefined): void {
  if (value === undefined || value === null) return;
  rows.push([txt(label), yesNo(value)]);
}

const MAX_DESCRIPTION = 3000;

// ─── 1. Title ─────────────────────────────────────────────────────────────────

export function titleSection(ctx: SheetCtx, product: ProductData): void {
  const { doc, geo } = ctx;
  // Sanitise before deciding whether to draw the byline — a name that's entirely
  // non-cp1252 becomes empty and would otherwise leave a dangling "by".
  const supplierName = txt(getSupplierDisplayName(product, ''));

  // Eco disc, drawn first so the title can wrap beside it.
  const discR = 9;
  const discX = geo.pageW - geo.marginX - discR;
  const discY = ctx.y + discR;
  const hasEco = Number.isFinite(product.ecoScore) && product.ecoScore > 0;
  if (hasEco) {
    doc.setFillColor(...ecoColor(product.ecoScore));
    doc.circle(discX, discY, discR, 'F');
    setFont(doc, 13, 'bold', WHITE);
    doc.text(String(Math.round(product.ecoScore)), discX, discY + 1.2, { align: 'center' });
    setFont(doc, 5.5, 'normal', WHITE);
    doc.text('ECO SCORE', discX, discY + 5.2, { align: 'center' });
  }

  const titleW = geo.contentW - (hasEco ? discR * 2 + 6 : 0);

  // Drop a size if the name is long, and advance by MEASURED height.
  let size: number = SIZE.h1;
  setFont(doc, size, 'bold', GRAY_900);
  let lines = doc.splitTextToSize(txt(product.name), titleW) as string[];
  if (lines.length > 2) {
    size = SIZE.h1Small;
    setFont(doc, size, 'bold', GRAY_900);
    lines = doc.splitTextToSize(txt(product.name), titleW) as string[];
  }
  lines = lines.slice(0, 3);

  const lineH = (size * 1.2) / 2.83465;
  lines.forEach((line, i) => doc.text(line, geo.marginX, ctx.y + lineH * 0.8 + i * lineH));
  ctx.y += lines.length * lineH + 1.5;

  if (supplierName) {
    setFont(doc, SIZE.supplier, 'normal', GRAY_600);
    doc.text('by ', geo.marginX, ctx.y + 3);
    const byW = doc.getTextWidth('by ');
    setFont(doc, SIZE.supplier, 'bold', RED_600);
    doc.text(truncate(supplierName, 60), geo.marginX + byW, ctx.y + 3);
    ctx.y += 5.5;
  }

  const crumbs = [product.broaderCategory, product.category, product.subcategory]
    .map(txt).filter(Boolean).join('  ›  ');
  if (crumbs) {
    setFont(doc, SIZE.micro, 'normal', GRAY_400);
    doc.text(crumbs, geo.marginX, ctx.y + 2.5);
    ctx.y += 4;
  }

  ctx.y = Math.max(ctx.y, hasEco ? discY + discR + 2 : ctx.y) + 3;

  const chips: string[] = [];
  if (product.availability?.inStock === true) chips.push('In stock');
  if (product.availability?.discontinuing) chips.push('Discontinuing');
  if (product.productLifecycle && product.productLifecycle !== 'active') chips.push(humanize(product.productLifecycle));
  if (product.packagingType) chips.push(humanize(product.packagingType));
  if (chips.length) chipRow(ctx, chips);
}

// ─── 2. Hero + at a glance ────────────────────────────────────────────────────

export function heroSection(ctx: SheetCtx, product: ProductData): void {
  const { geo } = ctx;
  const boxSize = 62;

  ensureSpace(ctx, boxSize + 4);
  const top = ctx.y;

  imageBox(ctx, ctx.assets.hero, { x: geo.marginX, y: top, w: boxSize, h: boxSize });

  const rows: Row[] = [];
  const price = product.pricing?.basePrice;
  rows.push([
    'Unit price',
    Number.isFinite(price) && price > 0
      ? `${formatCurrency(price, product.pricing?.currency)} per piece`
      : 'On request',
  ]);
  push(rows, 'Minimum order', formatNumber(product.specifications?.minimumOrderQuantity), 'units');
  push(rows, 'Lead time', product.leadTime?.standard, 'days');
  push(rows, 'Material', getMaterials(product).join(', '));
  push(rows, 'Capacity', formatMeasurement(product.specifications?.capacity));
  push(rows, 'Dimensions', formatDimensions(product.specifications?.dimensions));
  push(rows, 'Weight', formatMeasurement(product.specifications?.weight));
  const location = getLocation(product, '');
  push(rows, 'Origin', location);

  // The image is drawn outside any table, so this one band uses a shifted
  // margin rather than the shared-row trick used elsewhere.
  const leftEdge = geo.marginX + boxSize + 8;
  runTable(ctx, {
    startY: top,
    body: rows,
    theme: 'plain',
    margin: { left: leftEdge, right: geo.marginX, top: geo.contentTop, bottom: geo.pageH - geo.contentBottom },
    styles: { fontSize: SIZE.table, cellPadding: { top: 1, right: 2, bottom: 1, left: 0 }, valign: 'top' },
    columnStyles: {
      0: { cellWidth: 32, textColor: GRAY_600 },
      1: { cellWidth: 'auto', fontStyle: 'bold', textColor: GRAY_900 },
    },
  });

  ctx.y = Math.max(ctx.y, top + boxSize + 6);
}

// ─── 3. Description ───────────────────────────────────────────────────────────

export function descriptionSection(ctx: SheetCtx, product: ProductData): void {
  const desc = txt(product.description).slice(0, MAX_DESCRIPTION);
  const highlights = txt(product.productHighlights);
  if (!desc && !highlights) return;

  sectionHeading(ctx, 'Product Overview');
  if (desc) paragraph(ctx, desc);
  if (highlights) calloutBox(ctx, 'Why this product', highlights);
}

// ─── 4. Features | Advantages ─────────────────────────────────────────────────

export function featuresSection(ctx: SheetCtx, product: ProductData): void {
  twoColBlock(
    ctx,
    { title: 'Key Features', lines: (product.features || []).map(txt).filter(Boolean) },
    { title: 'Key Advantages', lines: (product.keyAdvantages || []).map(txt).filter(Boolean) }
  );
}

// ─── 5. Technical specifications ──────────────────────────────────────────────

const CORE_SPEC_NAMES = new Set([
  'material', 'capacity', 'weight', 'color', 'colour', 'finish', 'closure', 'dimensions',
  'height', 'width', 'depth', 'diameter',
]);

const CATEGORY_LABELS: Record<string, string> = {
  physical: 'Physical properties',
  material: 'Material properties',
  technical: 'Technical properties',
  custom: 'Additional properties',
};

export function specificationsSection(ctx: SheetCtx, product: ProductData): void {
  const s = product.specifications || ({} as ProductData['specifications']);

  const core: Row[] = [];
  push(core, 'Material', getMaterials(product).join(', '));
  push(core, 'Capacity', formatMeasurement(s.capacity));
  push(core, 'Dimensions', formatDimensions(s.dimensions));
  push(core, 'Weight', formatMeasurement(s.weight));
  push(core, 'Colour', s.color);
  push(core, 'Finish', s.finish);
  push(core, 'Closure', s.closure);
  push(core, 'Available quantity', formatNumber(s.availableQuantity), 'units');

  const dynamic = sortDynamicSpecs(s.dynamicSpecs).filter(
    spec => !CORE_SPEC_NAMES.has(txt(spec?.name).toLowerCase())
  );

  if (core.length === 0 && dynamic.length === 0) return;

  sectionHeading(ctx, 'Technical Specifications');
  kvTable(ctx, core);

  // One table per category group. A single table with colSpan group-header rows
  // would orphan a header at a page foot, since autoTable has no keep-with-next.
  const groups = new Map<string, DynamicSpec[]>();
  for (const spec of dynamic) {
    const key = CATEGORY_LABELS[String(spec.category)] ? String(spec.category) : 'custom';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(spec);
  }

  for (const [key, specs] of groups) {
    const rows: Row[] = [];
    for (const spec of specs) {
      const value = txt(formatSpecValue(spec.value, spec.unit));
      // Cap the label: a garbage 300-character spec name would otherwise
      // stretch one row down most of a page.
      const label = truncate(spec.name, 60) + (spec.isRequired ? ' *' : '');
      if (!value || !label.trim()) continue;
      rows.push([label, value]);
    }
    if (rows.length === 0) continue;

    ensureSpace(ctx, 18);
    setFont(ctx.doc, SIZE.groupLabel, 'bold', GRAY_600);
    ctx.doc.text(txt(CATEGORY_LABELS[key] || 'Additional properties'), ctx.geo.marginX, ctx.y + 3);
    ctx.y += 5;
    kvTable(ctx, rows);
  }
}

// ─── 6. Format & closure ──────────────────────────────────────────────────────

export function formatSection(ctx: SheetCtx, product: ProductData): void {
  const rows: Row[] = [];
  push(rows, 'Packaging type', product.packagingType ? humanize(product.packagingType) : '');
  push(rows, 'Packaging function', product.packagingFunction ? humanize(product.packagingFunction) : '');
  push(rows, 'Shape', product.shape);
  push(rows, 'Wall type', product.wallType);
  push(rows, 'Neck diameter', product.neckFinish?.diameter, 'mm');
  push(rows, 'Neck finish', product.neckFinish?.finish);
  push(rows, 'Cap type', product.capType);
  push(rows, 'Dropper type', product.dropperType);
  push(rows, 'Tube type', product.tubeType);
  push(rows, 'Tube shape', product.tubeShape);
  push(rows, 'Tube head style', product.tubeHeadStyle);
  push(rows, 'Chambers', product.chambers);
  push(rows, 'Colours', product.color);

  if (rows.length === 0) return;
  sectionHeading(ctx, 'Format & Closure');
  kvTable(ctx, rows);
}

// ─── 7. Pricing ───────────────────────────────────────────────────────────────

export function pricingSection(ctx: SheetCtx, product: ProductData): void {
  const { doc, geo } = ctx;
  const currency = product.pricing?.currency || 'USD';
  const base = product.pricing?.basePrice;
  const breaks = [...(product.pricing?.priceBreaks || [])]
    .filter(b => b && Number.isFinite(b.price))
    .sort((a, b) => (a.minQuantity ?? 0) - (b.minQuantity ?? 0));

  const costs = product.pricing?.customizationCosts;
  const hasCosts = costs && !isEmpty(costs);

  sectionHeading(ctx, 'Pricing & Ordering');

  ensureSpace(ctx, 12);
  if (Number.isFinite(base) && base > 0) {
    setFont(doc, SIZE.price, 'bold', RED_600);
    doc.text(formatCurrency(base, currency), geo.marginX, ctx.y + 4);
    const w = doc.getTextWidth(formatCurrency(base, currency));
    setFont(doc, SIZE.body, 'normal', GRAY_600);
    doc.text('per piece', geo.marginX + w + 2.5, ctx.y + 4);
  } else {
    setFont(doc, SIZE.price, 'bold', RED_600);
    doc.text('Price on request', geo.marginX, ctx.y + 4);
  }

  const moq = product.specifications?.minimumOrderQuantity;
  if (Number.isFinite(moq)) {
    setFont(doc, SIZE.body, 'normal', GRAY_600);
    doc.text(`Minimum order ${formatNumber(moq)} units`, geo.pageW - geo.marginX, ctx.y + 4, { align: 'right' });
  }
  ctx.y += 9;

  if (breaks.length > 0) {
    const baseline = Number.isFinite(base) && base > 0 ? base : null;
    runTable(ctx, {
      head: [['Minimum quantity', 'Unit price', baseline ? 'Saving vs base' : '']],
      body: breaks.map(b => {
        // Only show a saving when there actually is one — "0%" against the base
        // tier is noise.
        const saving = baseline ? Math.round(((baseline - b.price) / baseline) * 100) : 0;
        return [
          `${formatNumber(b.minQuantity)}+`,
          formatCurrency(b.price, currency),
          saving > 0 ? `save ${saving}%` : '',
        ];
      }),
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 40, fontStyle: 'bold', textColor: GRAY_900 },
        2: { cellWidth: 'auto', textColor: GREEN_600 },
      },
    });
  }

  if (hasCosts) {
    const rows: Row[] = [];
    push(rows, 'Printing', costs?.printing != null ? formatCurrency(costs.printing, currency) : '');
    push(rows, 'Labeling', costs?.labeling != null ? formatCurrency(costs.labeling, currency) : '');
    push(rows, 'Packaging', costs?.packaging != null ? formatCurrency(costs.packaging, currency) : '');
    if (rows.length) {
      ensureSpace(ctx, 14);
      setFont(doc, SIZE.groupLabel, 'bold', GRAY_600);
      doc.text('Customisation costs', geo.marginX, ctx.y + 3);
      ctx.y += 5;
      kvTable(ctx, rows);
    }
  }
}

// ─── 8. Customisation & decoration ────────────────────────────────────────────

export function customizationSection(ctx: SheetCtx, product: ProductData): void {
  const c = product.customization;
  const rows: Row[] = [];
  pushBool(rows, 'Printing available', c?.printingAvailable);
  pushBool(rows, 'Labeling available', c?.labelingAvailable);
  pushBool(rows, 'Custom sizes', c?.customSizes);
  push(rows, 'Colour options', c?.colorOptions);
  push(rows, 'Printing methods', c?.printingMethods);
  push(rows, 'Decoration methods', product.decoMethods);

  if (rows.length === 0) return;
  sectionHeading(ctx, 'Customisation & Decoration');
  kvTable(ctx, rows);
}

// ─── 9. Sustainability ────────────────────────────────────────────────────────

export function sustainabilitySection(ctx: SheetCtx, product: ProductData): void {
  const d = product.ecoScoreDetails;
  const s = product.sustainability || {};
  const hasDetails = d && Object.values(d).some(v => Number.isFinite(v) && (v as number) > 0);
  const hasFlags = Object.values(s).some(v => v !== undefined && v !== null && v !== false && v !== 0);
  const hasScore = Number.isFinite(product.ecoScore) && product.ecoScore > 0;

  if (!hasDetails && !hasFlags && !hasScore) return;

  sectionHeading(ctx, 'Sustainability');

  if (hasScore) {
    setFont(ctx.doc, SIZE.body, 'normal', GRAY_600);
    ctx.doc.text(`Overall eco score: `, ctx.geo.marginX, ctx.y + 3);
    const w = ctx.doc.getTextWidth('Overall eco score: ');
    setFont(ctx.doc, SIZE.body, 'bold', ecoColor(product.ecoScore));
    ctx.doc.text(`${Math.round(product.ecoScore)}/100`, ctx.geo.marginX + w, ctx.y + 3);
    ctx.y += 6;
  }

  if (hasDetails) {
    scoreBar(ctx, 'Recyclability', d?.recyclability ?? 0, GREEN_600);
    scoreBar(ctx, 'Carbon footprint', d?.carbonFootprint ?? 0, GREEN_600);
    scoreBar(ctx, 'Sustainable materials', d?.sustainableMaterials ?? 0, GREEN_600);
    scoreBar(ctx, 'Local sourcing', d?.localSourcing ?? 0, GREEN_600);
    ctx.y += 3;
  }

  const rows: Row[] = [];
  if (Number.isFinite(s.recycledContent) && (s.recycledContent as number) > 0) {
    rows.push(['Recycled content', `${s.recycledContent}%`]);
  }
  pushBool(rows, 'Biodegradable', s.biodegradable);
  pushBool(rows, 'Compostable', s.compostable);
  pushBool(rows, 'Refillable', s.refillable);
  pushBool(rows, 'Sustainably sourced', s.sustainableSourcing);
  pushBool(rows, 'Carbon neutral', s.carbonNeutral);
  kvTable(ctx, rows);
}

// ─── 10. Compliance | Certifications ──────────────────────────────────────────

export function complianceSection(ctx: SheetCtx, product: ProductData): void {
  const c = product.compliance;
  const complianceLines: string[] = [];
  if (c?.fdaApproved) complianceLines.push('FDA approved');
  if (c?.euCompliant) complianceLines.push('EU compliant');
  if (c?.reach) complianceLines.push('REACH');
  if (c?.rohs) complianceLines.push('RoHS');

  const certs = (product.certifications || []).filter(x => x && txt(x.name));

  if (complianceLines.length === 0 && certs.length === 0) return;

  if (certs.length === 0) {
    twoColBlock(ctx, { title: 'Compliance', lines: complianceLines }, { title: '', lines: [] });
    return;
  }

  if (complianceLines.length > 0) {
    twoColBlock(
      ctx,
      { title: 'Compliance', lines: complianceLines },
      {
        title: 'Certifications',
        lines: certs.map(x =>
          [txt(x.name), txt(x.certificationBody)].filter(Boolean).join(' — ')
        ),
      }
    );
  } else {
    sectionHeading(ctx, 'Certifications');
  }

  const detailed = certs.filter(x => x.certificateNumber || x.validUntil);
  if (detailed.length > 0) {
    runTable(ctx, {
      head: [['Certification', 'Body', 'Certificate no.', 'Valid until']],
      body: detailed.map(x => [
        txt(x.name), txt(x.certificationBody), txt(x.certificateNumber), formatDate(x.validUntil),
      ]),
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 45 }, 2: { cellWidth: 40 }, 3: { cellWidth: 'auto' } },
    });
  }
}

// ─── 11. Applications ─────────────────────────────────────────────────────────

export function applicationsSection(ctx: SheetCtx, product: ProductData): void {
  const rows: Row[] = [];
  push(rows, 'Target industries', (product.targetIndustries || []).map(humanize));
  push(rows, 'Use cases', product.useCases);
  push(rows, 'End use', product.endUse);
  push(rows, 'Tags', product.tags);

  if (rows.length === 0) return;
  sectionHeading(ctx, 'Applications');
  kvTable(ctx, rows);
}

// ─── 12. Availability ─────────────────────────────────────────────────────────

export function availabilitySection(ctx: SheetCtx, product: ProductData): void {
  const rows: Row[] = [];
  push(rows, 'Standard lead time', product.leadTime?.standard, 'days');
  push(rows, 'Custom order lead time', product.leadTime?.custom, 'days');
  push(rows, 'Rush lead time', product.leadTime?.rush, 'days');
  pushBool(rows, 'In stock', product.availability?.inStock);
  push(rows, 'Estimated restock', formatDate(product.availability?.estimatedRestockDate));
  push(rows, 'Available quantity', formatNumber(product.specifications?.availableQuantity), 'units');
  push(rows, 'Lifecycle', product.productLifecycle ? humanize(product.productLifecycle) : '');

  if (rows.length === 0) return;
  sectionHeading(ctx, 'Availability & Lead Times');
  kvTable(ctx, rows);
}

// ─── 13. Supplier ─────────────────────────────────────────────────────────────

export function supplierSection(ctx: SheetCtx, product: ProductData): void {
  const supplier = product.supplier;
  const displayName = getSupplierDisplayName(product, '');
  const rows: Row[] = [];

  push(rows, 'Supplier', displayName);
  // Only worth showing when the two genuinely differ.
  if (hasSupplierOverride(product) && supplier?.companyName) {
    push(rows, 'Listed by', supplier.companyName);
  }
  push(rows, 'Location', getLocation(product, ''));
  push(rows, 'Contact', getSupplierEmail(supplier));
  if (Number.isFinite(supplier?.averageRating) && (supplier?.averageRating as number) > 0) {
    rows.push([
      'Rating',
      `${(supplier!.averageRating as number).toFixed(1)}/5${supplier?.totalReviews ? ` (${supplier.totalReviews} reviews)` : ''}`,
    ]);
  }
  push(rows, 'Certifications', (supplier?.certifications || []).map(c => txt(c?.name)).filter(Boolean));

  if (rows.length === 0) return;

  sectionHeading(ctx, 'Supplier');
  kvTable(ctx, rows);

  const about = txt(supplier?.companyDescription);
  if (about) paragraph(ctx, about.slice(0, 800), { size: SIZE.table, color: GRAY_600 });
}

// ─── 14. Disclaimer ───────────────────────────────────────────────────────────

export function disclaimerSection(ctx: SheetCtx, product: ProductData, generatedOn: string): void {
  const { doc, geo } = ctx;
  ensureSpace(ctx, 16);

  doc.setFillColor(...GRAY_50);
  const lines = [
    'Specifications are indicative and provided by the supplier. Confirm all dimensions, tolerances and',
    'compliance requirements with the supplier before ordering. Pricing excludes tooling, freight and duties.',
    `Generated ${generatedOn}${product.sourceUrl ? ` · Source: ${truncate(product.sourceUrl, 60)}` : ''}`,
  ];

  const boxH = lines.length * 3.6 + 5;
  doc.roundedRect(geo.marginX, ctx.y, geo.contentW, boxH, 1.2, 1.2, 'F');
  setFont(doc, SIZE.micro, 'normal', GRAY_400);
  lines.forEach((line, i) => doc.text(txt(line), geo.marginX + 3, ctx.y + 4.5 + i * 3.6));
  ctx.y += boxH + 4;
}
