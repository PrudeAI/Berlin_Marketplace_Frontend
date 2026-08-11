/**
 * Shape of a product as returned by GET /api/products/:id.
 *
 * That route returns the entire unprojected Mongo document plus a populated
 * supplier, so this mirrors Packgine_Backend/models/Product.js. Kept in its own
 * module (rather than exported from ProductDetailPage) so the lazily-loaded
 * spec-sheet generator can import the type without dragging the page — and all
 * its component dependencies — into the lazy chunk.
 *
 * Note every Date in Mongo arrives here as an ISO *string* after res.json().
 */

export interface SupplierContact {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
}

export interface Certification {
  name?: string;
  certificationBody?: string;
  validUntil?: string;
  certificateNumber?: string;
  documentUrl?: string;
}

export interface Dimensions {
  height?: number;
  width?: number;
  depth?: number;
  diameter?: number; // For cylindrical containers
  unit?: string;
}

export interface Measurement {
  value?: number;
  unit?: string;
}

export interface DynamicSpec {
  name: string;
  /**
   * Mongoose `Mixed` — genuinely unknown on the wire. Typed `unknown` on
   * purpose so every consumer is forced through formatSpecValue() instead of
   * interpolating an object straight into JSX and rendering "[object Object]".
   */
  value: unknown;
  unit?: string;
  /** Enum in the schema, but legacy documents predate the default. */
  category?: 'physical' | 'material' | 'technical' | 'custom' | (string & {});
  displayOrder?: number;
  isRequired?: boolean;
}

export interface PriceBreak {
  minQuantity: number;
  price: number;
}

export interface ProductSupplier {
  _id: string;
  companyName: string;
  companyDescription?: string;
  companyLogo?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  /**
   * NOT { email, phone } — NewSupplier nests contacts by role. The old flat
   * shape meant the product page's contact line silently always fell back.
   */
  contactInfo?: {
    primaryContact?: SupplierContact;
    salesContact?: SupplierContact;
    supportContact?: SupplierContact;
  };
  /** Objects, not strings — rendering these raw yields "[object Object]". */
  certifications?: Certification[];
  averageRating?: number;
  totalReviews?: number;
}

export interface ProductData {
  _id: string;
  name: string;
  description: string;
  images: string[];
  primaryImage?: string;
  broaderCategory: string;
  category: string;
  subcategory?: string;

  /** Optional brand override; falls back to supplier.companyName on display. */
  supplierName?: string | null;

  specifications: {
    material?: string;
    capacity?: Measurement;
    dimensions?: Dimensions;
    weight?: Measurement;
    color?: string;
    finish?: string;
    closure?: string;
    minimumOrderQuantity: number;
    availableQuantity?: number;
    dynamicSpecs?: DynamicSpec[];
  };

  pricing: {
    basePrice: number;
    currency: string;
    priceBreaks?: PriceBreak[];
    customizationCosts?: {
      printing?: number;
      labeling?: number;
      packaging?: number;
    };
  };

  ecoScore: number;
  /** All four default to 0 in the schema — 0 is a real value, not "missing". */
  ecoScoreDetails?: {
    recyclability?: number;
    carbonFootprint?: number;
    sustainableMaterials?: number;
    localSourcing?: number;
  };
  sustainability: {
    recycledContent?: number;
    biodegradable?: boolean;
    compostable?: boolean;
    refillable?: boolean;
    sustainableSourcing?: boolean;
    carbonNeutral?: boolean;
  };

  certifications: Certification[];
  compliance?: {
    fdaApproved?: boolean;
    euCompliant?: boolean;
    reach?: boolean;
    rohs?: boolean;
  };

  customization?: {
    printingAvailable?: boolean;
    labelingAvailable?: boolean;
    colorOptions?: string[];
    printingMethods?: string[];
    customSizes?: boolean;
  };

  leadTime?: {
    standard?: number;
    custom?: number;
    rush?: number;
  };
  availability?: {
    inStock?: boolean;
    estimatedRestockDate?: string;
    discontinuing?: boolean;
  };

  features?: string[];
  // Filter fields for multiple materials and locations
  categoryFilters?: { [key: string]: any };
  commonFilters?: { [key: string]: any };

  // ── Classification / format fields (stored, previously never rendered) ──
  packagingType?: string | null;
  packagingFunction?: string | null;
  targetIndustries?: string[];
  useCases?: string[];
  endUse?: string[];
  tags?: string[];
  shape?: string | null;
  wallType?: string | null;
  color?: string[];
  neckFinish?: {
    diameter?: number | null;
    finish?: string | null;
  };
  decoMethods?: string[];
  capType?: string | null;
  dropperType?: string | null;
  tubeType?: string | null;
  tubeShape?: string | null;
  chambers?: string | null;
  tubeHeadStyle?: string | null;

  // AI-generated selling content
  productHighlights?: string | null;
  keyAdvantages?: string[];

  productLifecycle?: string;
  sourceUrl?: string | null;
  sourceType?: 'manual' | 'ai-document' | 'ai-url';

  supplier: ProductSupplier;
  averageRating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt?: string;
  status: string;
}
