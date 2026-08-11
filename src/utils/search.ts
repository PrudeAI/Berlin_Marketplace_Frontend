/**
 * Where a product search goes.
 *
 * Kept in one place so every search entry point (home hero, products page,
 * header) lands on the same route — they were previously wired to nothing at
 * all, and the easiest way to regress that is for each caller to build its own
 * URL slightly differently.
 *
 * Results are served by ProductFilterPage via /products/search/<term>, which
 * hands the term to the backend's GET /api/products?search= regex matcher
 * (name, description, productHighlights, tags, useCases, material, supplierName).
 */

export const PRODUCT_SEARCH_BASE = '/products/search';

/**
 * @returns the path to navigate to, or null when the term is empty/whitespace
 *          (so callers can simply do nothing rather than route to a blank search).
 */
export function productSearchPath(term: string): string | null {
  const trimmed = (term || '').trim();
  if (!trimmed) return null;
  // encodeURIComponent so slashes, #, ? and spaces in a query can't break the route.
  return `${PRODUCT_SEARCH_BASE}/${encodeURIComponent(trimmed)}`;
}
