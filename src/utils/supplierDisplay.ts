/**
 * Which supplier name to show for a product.
 *
 * A distributor account (e.g. Berlin Packaging) often lists products that are
 * actually branded by someone else. `product.supplierName` is an optional
 * per-product override the lister can set; when it's blank we fall back to the
 * company name of the account that created the listing.
 *
 * This only affects what buyers see. `product.supplier` remains the owning
 * account for auth, dashboards, filtering and inquiries.
 */

type SupplierRef = { companyName?: string | null } | string | null | undefined;

export interface SupplierNameSource {
  supplierName?: string | null;
  supplier?: SupplierRef;
}

export function getSupplierDisplayName(
  product: SupplierNameSource,
  fallback = 'Unknown supplier'
): string {
  const override = product?.supplierName?.trim();
  if (override) return override;

  // `supplier` is populated on the marketplace/detail routes but is a bare
  // ObjectId string on the dashboard routes, so guard the shape.
  const supplier = product?.supplier;
  if (supplier && typeof supplier === 'object' && supplier.companyName?.trim()) {
    return supplier.companyName.trim();
  }

  return fallback;
}

/** True when the displayed name is a per-product override rather than the account. */
export function hasSupplierOverride(product: SupplierNameSource): boolean {
  return Boolean(product?.supplierName?.trim());
}
