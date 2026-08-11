/**
 * Value formatting for the spec sheet.
 *
 * formatSpecValue lives in ../productDisplay so the product page uses the exact
 * same Mixed-value handling; it's re-exported here for convenience.
 */

export { formatSpecValue, formatDimensions, formatMeasurement } from '../productDisplay';

/**
 * Emptiness test used to decide whether a row is emitted at all.
 *
 * NOT truthiness — 0 is a real, meaningful value for basePrice, ecoScore,
 * recycledContent, neckFinish.diameter and all four ecoScoreDetails fields,
 * every one of which defaults to 0 in the Mongo schema.
 */
export function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (typeof v === 'number') return !Number.isFinite(v);
  if (Array.isArray(v)) return v.filter(x => !isEmpty(x)).length === 0;
  if (typeof v === 'object') return Object.values(v as object).every(isEmpty);
  return false;
}

/**
 * Map a string into WinAnsi (cp1252), the only encoding jsPDF's standard fonts
 * support. Most of what a packaging spec sheet needs — × Ø ° € – — • ™ — is in
 * cp1252 already; what breaks is CJK and a handful of maths/typographic marks.
 * Unsupported code points are dropped rather than rendered as garbage.
 */
const SUBSTITUTIONS: Record<string, string> = {
  '→': '->', '←': '<-', '≤': '<=', '≥': '>=',
  '≈': '~', '≠': '!=', '±': '+/-',
  '′': "'", '″': '"', '⁄': '/', '−': '-',
  ' ': ' ', ' ': ' ', ' ': ' ',
};

export function toWinAnsi(input: string): string {
  if (!input) return '';
  let s = input.normalize('NFC');
  for (const [from, to] of Object.entries(SUBSTITUTIONS)) {
    if (s.includes(from)) s = s.split(from).join(to);
  }
  // Keep ASCII plus the cp1252 high range; drop anything else.
  return s
    .split('')
    .filter(ch => {
      const c = ch.codePointAt(0) ?? 0;
      return c === 9 || c === 10 || (c >= 32 && c <= 126) || (c >= 160 && c <= 255) ||
        // cp1252 specials that live in the 0x80–0x9F window in Unicode terms
        '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.includes(ch);
    })
    .join('');
}

/** Sanitised, whitespace-collapsed text ready to hand to jsPDF. */
export function txt(v: unknown): string {
  if (v == null) return '';
  return toWinAnsi(String(v)).replace(/[ \t]+/g, ' ').trim();
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  if (!Number.isFinite(amount)) return '';
  try {
    return toWinAnsi(
      new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
    );
  } catch {
    // Intl throws RangeError on an unrecognised currency code.
    return toWinAnsi(`${currency} ${amount.toFixed(2)}`);
  }
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatNumber(n?: number | null): string {
  return typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString() : '';
}

/** "cosmetics-beauty" → "Cosmetics Beauty" — matches the page's de-slugging. */
export function humanize(s: string): string {
  return txt(s).replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function yesNo(v?: boolean): string {
  return v ? 'Yes' : 'No';
}

export function slugify(name: string, fallback = 'product'): string {
  const slug = (name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug || fallback;
}

export function truncate(s: string, max: number): string {
  const t = txt(s);
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}
