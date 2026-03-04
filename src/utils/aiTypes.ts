// Types used by the AI product extraction flow (v2 – Gemini)

export interface AICapacity {
  value: number;
  unit: 'ml' | 'oz' | 'L' | 'g' | 'kg';
}

export interface AIDimensions {
  height?: number | null;
  width?: number | null;
  depth?: number | null;
  diameter?: number | null;  // For cylindrical containers
  unit: 'mm' | 'cm' | 'in';
}

export interface AIWeight {
  value: number;
  unit: 'g' | 'kg' | 'oz' | 'lb';
}

export interface AIPriceBreak {
  minQuantity: number;
  price: number;
}

export interface AIDynamicSpec {
  name: string;
  value: string;
  unit?: string;
  category: 'physical' | 'material' | 'technical' | 'custom';
}

export interface AIEcoScoreDetails {
  recyclability: number;
  carbonFootprint: number;
  sustainableMaterials: number;
  localSourcing: number;
}

export interface AISustainability {
  recycledContent: number;
  biodegradable: boolean;
  compostable: boolean;
  refillable: boolean;
  sustainableSourcing: boolean;
  carbonNeutral: boolean;
}

export interface AICertification {
  name: string;
  certificationBody?: string | null;
  validUntil?: string | null;
  certificateNumber?: string | null;
}

export interface AICustomization {
  printingAvailable: boolean;
  labelingAvailable: boolean;
  colorOptions: string[];
  printingMethods: string[];
  customSizes: boolean;
}

export interface AILeadTime {
  standard?: number | null;
  custom?: number | null;
  rush?: number | null;
}

// The main extracted product interface – matches what geminiService.js returns
export interface AIExtractedProduct {
  // Client-side tracking fields
  id: string;
  status: 'extracted' | 'reviewing' | 'approved' | 'rejected';
  pageNumber: number | null;
  pageImageUrl: string | null; // Cloudinary URL for the source page thumbnail

  // Core product data (matches Product model)
  name: string;
  description: string;
  broaderCategory: string;
  category: string;
  subcategory?: string | null;
  features: string[];

  pricing: {
    basePrice: number;
    currency: string;
    priceBreaks: AIPriceBreak[];
  };

  specifications: {
    material?: string | null;
    capacity?: AICapacity | null;
    dimensions?: AIDimensions | null;
    weight?: AIWeight | null;
    color?: string | null;
    finish?: string | null;
    closure?: string | null;
    minimumOrderQuantity: number;
    availableQuantity: number;
  };

  dynamicSpecs: AIDynamicSpec[];

  ecoScore: number;
  ecoScoreDetails: AIEcoScoreDetails;
  sustainability: AISustainability;
  certifications: AICertification[];
  categoryFilters: Record<string, string[]>;
  commonFilters: Record<string, string[]>;
  customization: AICustomization;
  leadTime: AILeadTime;

  images: string[]; // confirmed product images (Cloudinary URLs)

  // UI helper fields
  missingFields: string[];
  similarProducts: { id: string; name: string; similarity: number }[];
}

// SSE event types
export type SSEEventType = 'start' | 'product' | 'done' | 'error';

export interface SSEStartEvent {
  fileName: string;
  message: string;
}

export interface SSEDoneEvent {
  totalProducts: number;
  message: string;
}

export interface SSEErrorEvent {
  message: string;
}

// Completeness calculation result
export interface ProductCompleteness {
  percent: number;
  missingRequired: string[];
  missingOptional: string[];
  color: 'green' | 'yellow' | 'red';
}
