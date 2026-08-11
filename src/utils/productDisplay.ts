/**
 * Product presentation helpers shared by the product page and the spec-sheet PDF.
 *
 * These used to live as module-scoped, unexported functions inside
 * ProductDetailPage.tsx. They're extracted here so there is exactly ONE
 * implementation — a PDF that formats dimensions differently from the page it
 * was generated from is worse than no PDF.
 *
 * Parameters are structural (a minimal shape) rather than the full ProductData,
 * matching the convention in supplierDisplay.ts, so these stay usable from
 * cards, grids and dashboard rows where the payload is projected.
 */

import type { Dimensions, DynamicSpec, Measurement } from '../types/product';

// ─── Materials ────────────────────────────────────────────────────────────────

export interface FilterSource {
  commonFilters?: { [key: string]: any };
  categoryFilters?: { [key: string]: any };
}

const asArray = (v: unknown): string[] => (Array.isArray(v) ? v : v == null ? [] : [v as string]);

/** Materials come from either filter bag, falling back to the legacy spec field. */
export function getMaterials(
  product: FilterSource & { specifications?: { material?: string } }
): string[] {
  const materials: string[] = [
    ...asArray(product.commonFilters?.Material),
    ...asArray(product.categoryFilters?.Material),
  ];

  if (materials.length === 0 && product.specifications?.material) {
    materials.push(product.specifications.material);
  }

  return [...new Set(materials)].filter(m => typeof m === 'string' && m.trim() !== '');
}

// ─── Location ─────────────────────────────────────────────────────────────────

export interface LocationSource extends FilterSource {
  supplier?: unknown;
}

export function getLocation(product: LocationSource, fallback = 'Location not specified'): string {
  const fromCommon = asArray(product.commonFilters?.Location)[0];
  if (fromCommon) return fromCommon;

  const fromCategory = asArray(product.categoryFilters?.Location)[0];
  if (fromCategory) return fromCategory;

  // `supplier` is a populated object on the marketplace/detail routes but a bare
  // ObjectId string on dashboard routes — guard before reaching into it.
  const supplier = product.supplier;
  if (supplier && typeof supplier === 'object') {
    const country = (supplier as { address?: { country?: string } }).address?.country;
    if (country?.trim()) return country;
  }

  return fallback;
}

// ─── Dimensions ───────────────────────────────────────────────────────────────

/**
 * Returns '' when nothing is known, so the caller decides the fallback:
 * the page shows "Contact supplier for dimensions", the PDF omits the row.
 */
export function formatDimensions(d?: Dimensions): string {
  if (!d) return '';
  const unit = d.unit || 'mm';

  // Rectangular
  if (d.height && d.width && d.depth) return `${d.height}x${d.width}x${d.depth} ${unit}`;
  // Cylindrical — bottles, jars, tubes
  if (d.height && d.diameter) return `H: ${d.height} ${unit} × Ø: ${d.diameter} ${unit}`;
  if (d.height) return `Height: ${d.height} ${unit}`;
  if (d.diameter) return `Ø: ${d.diameter} ${unit}`;

  return '';
}

/** "500 ml" from { value, unit }. */
export function formatMeasurement(m?: Measurement): string {
  if (!m || m.value == null || !Number.isFinite(m.value)) return '';
  return m.unit ? `${m.value} ${m.unit}` : String(m.value);
}

// ─── Dynamic specs ────────────────────────────────────────────────────────────

const CATEGORY_ORDER: Record<string, number> = {
  physical: 1,
  material: 2,
  technical: 3,
  custom: 4,
};

/**
 * Sorted copy, grouped by category then display order.
 *
 * Returns a NEW array — the previous in-place `.sort()` mutated React state
 * during render. The `?? 99` / `?? 0` fallbacks matter too: an off-enum or
 * missing category produced `undefined - undefined = NaN`, which makes the
 * comparator return NaN and the sort order implementation-defined.
 */
export function sortDynamicSpecs(specs?: DynamicSpec[]): DynamicSpec[] {
  if (!Array.isArray(specs)) return [];
  return [...specs].sort((a, b) => {
    const catA = CATEGORY_ORDER[a?.category as string] ?? 99;
    const catB = CATEGORY_ORDER[b?.category as string] ?? 99;
    if (catA !== catB) return catA - catB;

    const orderA = a?.displayOrder ?? 0;
    const orderB = b?.displayOrder ?? 0;
    if (orderA !== orderB) return orderA - orderB;

    return String(a?.name ?? '').localeCompare(String(b?.name ?? ''));
  });
}

// ─── Mixed-value formatting ───────────────────────────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T|$)/;

function formatMaybeDate(s: string): string {
  if (!ISO_DATE.test(s)) return s;
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? s
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Render a `Mixed` spec value as human text.
 *
 * dynamicSpecs[].value is mongoose Mixed, so it can be a string, number,
 * boolean, array, or a nested object. Interpolating it directly is what
 * produces "[object Object]" on the product page today.
 */
export function formatSpecValue(value: unknown, unit?: string, depth = 0): string {
  let out: string;

  if (value == null) {
    out = '';
  } else if (typeof value === 'string') {
    out = formatMaybeDate(value.trim());
  } else if (typeof value === 'number') {
    out = Number.isFinite(value) ? value.toLocaleString() : '';
  } else if (typeof value === 'boolean') {
    out = value ? 'Yes' : 'No';
  } else if (Array.isArray(value)) {
    out = value
      .map(v => formatSpecValue(v, undefined, depth + 1))
      .filter(Boolean)
      .join(', ');
  } else if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    // Common shapes worth rendering nicely rather than as key/value soup.
    if ('value' in obj && (typeof obj.value === 'number' || typeof obj.value === 'string')) {
      out = formatSpecValue(obj.value, obj.unit as string | undefined, depth + 1);
    } else if ('min' in obj && 'max' in obj) {
      out = `${formatSpecValue(obj.min, undefined, depth + 1)}–${formatSpecValue(obj.max, undefined, depth + 1)}`;
    } else if (depth === 0) {
      out = Object.entries(obj)
        .map(([k, v]) => {
          const rendered = formatSpecValue(v, undefined, depth + 1);
          return rendered ? `${k}: ${rendered}` : '';
        })
        .filter(Boolean)
        .join('; ');
    } else {
      // Deeper than one level — don't recurse forever, just show something sane.
      try {
        out = JSON.stringify(value).slice(0, 120);
      } catch {
        out = '';
      }
    }
  } else {
    out = String(value);
  }

  out = out.trim();
  if (!out) return '';

  if (unit && !out.toLowerCase().endsWith(unit.toLowerCase())) {
    out = `${out} ${unit}`;
  }
  return out;
}

// ─── Supplier contact ─────────────────────────────────────────────────────────

interface ContactSource {
  contactInfo?: {
    primaryContact?: { email?: string };
    salesContact?: { email?: string };
    supportContact?: { email?: string };
  };
}

/**
 * NewSupplier nests contacts by role; there is no top-level `.email`.
 * Sales first — that's who a buyer wants for a product enquiry.
 */
export function getSupplierEmail(supplier?: unknown): string | undefined {
  if (!supplier || typeof supplier !== 'object') return undefined;
  const c = (supplier as ContactSource).contactInfo;
  return (
    c?.salesContact?.email?.trim() ||
    c?.primaryContact?.email?.trim() ||
    c?.supportContact?.email?.trim() ||
    undefined
  );
}
