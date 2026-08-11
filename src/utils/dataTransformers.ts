import type { AIExtractedProduct, ProductCompleteness, AICapacity, AIDimensions, AIWeight } from './aiTypes';

// ─── Required / optional fields ───────────────────────────────────────────────
const REQUIRED_FIELDS: (keyof AIExtractedProduct)[] = [
  'name', 'description', 'broaderCategory', 'category',
];

const OPTIONAL_FIELDS = [
  'specifications.material',
  'specifications.capacity',
  'specifications.minimumOrderQuantity',
  'pricing.basePrice',
  'ecoScore',
  'images',
  'features',
];

// ─── Calculate product completeness ──────────────────────────────────────────
export function calculateCompleteness(product: AIExtractedProduct): ProductCompleteness {
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  // Check required
  for (const field of REQUIRED_FIELDS) {
    const val = product[field];
    if (!val || (typeof val === 'string' && val.trim() === '')) {
      missingRequired.push(field as string);
    }
  }

  // Check optional
  if (!product.pricing?.basePrice) missingOptional.push('price');
  if (!product.specifications?.material) missingOptional.push('material');
  if (!product.specifications?.capacity) missingOptional.push('capacity');
  if (!product.ecoScore) missingOptional.push('ecoScore');
  if (product.images.length === 0) missingOptional.push('images');
  if (product.features.length === 0) missingOptional.push('features');

  const totalFields = REQUIRED_FIELDS.length + OPTIONAL_FIELDS.length;
  const filledRequired = REQUIRED_FIELDS.length - missingRequired.length;
  const filledOptional = OPTIONAL_FIELDS.length - missingOptional.length;
  const percent = Math.round(((filledRequired + filledOptional) / totalFields) * 100);

  let color: ProductCompleteness['color'] = 'green';
  if (missingRequired.length > 0) color = 'red';
  else if (percent < 70) color = 'yellow';

  return { percent, missingRequired, missingOptional, color };
}

// ─── Transform product into summary key/values for display ───────────────────
export function getProductDisplaySummary(product: AIExtractedProduct) {
  const specs = product.specifications;
  const items: { label: string; value: string }[] = [];

  if (specs?.material) items.push({ label: 'Material', value: specs.material });
  if (specs?.capacity)
    items.push({ label: 'Capacity', value: `${specs.capacity.value} ${specs.capacity.unit}` });
  if (specs?.color) items.push({ label: 'Color', value: specs.color });
  if (specs?.finish) items.push({ label: 'Finish', value: specs.finish });
  if (specs?.closure) items.push({ label: 'Closure', value: specs.closure });
  if (specs?.minimumOrderQuantity)
    items.push({ label: 'MOQ', value: `${specs.minimumOrderQuantity.toLocaleString()} units` });
  if (product.pricing?.basePrice)
    items.push({
      label: 'Price',
      value: `${product.pricing.currency} ${product.pricing.basePrice.toFixed(2)}`,
    });

  return items;
}

// ─── Convert AI product to the form state shape used by AddProductPage ────────
export function transformAIProductToFormData(product: AIExtractedProduct) {
  const specs = product.specifications;

  return {
    selectedBroaderCategory: product.broaderCategory || '',
    selectedCategory: product.category || '',
    selectedCategoryFilters: product.categoryFilters || {},
    selectedCommonFilters: product.commonFilters || {},
    ecoScore: product.ecoScore || 0,
    ecoScoreDetails: {
      recyclability: product.ecoScoreDetails?.recyclability || 0,
      carbonFootprint: product.ecoScoreDetails?.carbonFootprint || 0,
      sustainableMaterials: product.ecoScoreDetails?.sustainableMaterials || 0,
      localSourcing: product.ecoScoreDetails?.localSourcing || 0,
      certifications: [] as string[],
    },
    productInfo: {
      name: product.name || '',
      supplierName: product.supplierName || '',
      description: product.description || '',
      price: product.pricing?.basePrice ? String(product.pricing.basePrice) : '',
      minimumOrderQuantity: specs?.minimumOrderQuantity || 1,
      availableQuantity: specs?.availableQuantity || 100,
      features: product.features || [],
      capacity: specs?.capacity ? String(specs.capacity.value) : '',
      capacityUnit: specs?.capacity?.unit || 'ml',
      height: specs?.dimensions?.height ? String(specs.dimensions.height) : '',
      width: specs?.dimensions?.width ? String(specs.dimensions.width) : '',
      depth: specs?.dimensions?.depth ? String(specs.dimensions.depth) : '',
      diameter: specs?.dimensions?.diameter ? String(specs.dimensions.diameter) : '',
      dimensionUnit: specs?.dimensions?.unit || 'mm',
      weight: specs?.weight ? String(specs.weight.value) : '',
      weightUnit: specs?.weight?.unit || 'g',
      color: specs?.color || '',
      finish: specs?.finish || '',
      closure: specs?.closure || '',
      standardLeadTime: product.leadTime?.standard ? String(product.leadTime.standard) : '',
      customLeadTime: product.leadTime?.custom ? String(product.leadTime.custom) : '',
      rushLeadTime: product.leadTime?.rush ? String(product.leadTime.rush) : '',
      metaTitle: '',
      metaDescription: '',
      keywords: [] as string[],
    },
    dynamicSpecs: product.dynamicSpecs || [],
    sustainability: {
      recycledContent: product.sustainability?.recycledContent || 0,
      biodegradable: product.sustainability?.biodegradable || false,
      compostable: product.sustainability?.compostable || false,
      refillable: product.sustainability?.refillable || false,
      sustainableSourcing: product.sustainability?.sustainableSourcing || false,
      carbonNeutral: product.sustainability?.carbonNeutral || false,
    },
    certifications: (product.certifications || []).map(c => ({
      name: c.name || '',
      certificationBody: c.certificationBody || '',
      validUntil: c.validUntil || '',
      certificateNumber: c.certificateNumber || '',
    })),
    customization: product.customization || {
      printingAvailable: false,
      labelingAvailable: false,
      colorOptions: [],
      printingMethods: [],
      customSizes: false,
    },
    uploadedImages: product.images || [],
  };
}

// ─── Convert form state back to an AIExtractedProduct for submission  ─────────
export function transformFormDataToProduct(
  formData: ReturnType<typeof transformAIProductToFormData>,
  original: AIExtractedProduct
): AIExtractedProduct {
  const info = formData.productInfo;

  return {
    ...original,
    name: info.name,
    // Must be re-listed explicitly: this function spreads `original` first, so
    // any key not named here silently reverts to the pre-edit value on Save.
    supplierName: info.supplierName?.trim() || null,
    description: info.description,
    broaderCategory: formData.selectedBroaderCategory,
    category: formData.selectedCategory,
    categoryFilters: formData.selectedCategoryFilters,
    commonFilters: formData.selectedCommonFilters,
    ecoScore: formData.ecoScore,
    ecoScoreDetails: {
      recyclability: formData.ecoScoreDetails.recyclability,
      carbonFootprint: formData.ecoScoreDetails.carbonFootprint,
      sustainableMaterials: formData.ecoScoreDetails.sustainableMaterials,
      localSourcing: formData.ecoScoreDetails.localSourcing,
    },
    pricing: {
      basePrice: parseFloat(info.price) || 0,
      currency: original.pricing.currency || 'USD',
      priceBreaks: original.pricing.priceBreaks || [],
    },
    specifications: {
      material: (formData.selectedCategoryFilters['Material'] || formData.selectedCommonFilters['Material'] || []).join(', ') || null,
      capacity: info.capacity ? { value: parseFloat(info.capacity), unit: info.capacityUnit as AICapacity['unit'] } : null,
      dimensions: (info.height || info.diameter)
        ? {
            height: parseFloat(info.height) || undefined,
            width: parseFloat(info.width) || undefined,
            depth: parseFloat(info.depth) || undefined,
            diameter: parseFloat(info.diameter) || undefined,
            unit: info.dimensionUnit as AIDimensions['unit']
          }
        : null,
      weight: info.weight ? { value: parseFloat(info.weight), unit: info.weightUnit as AIWeight['unit'] } : null,
      color: info.color || null,
      finish: info.finish || null,
      closure: info.closure || null,
      minimumOrderQuantity: info.minimumOrderQuantity,
      availableQuantity: info.availableQuantity,
    },
    dynamicSpecs: formData.dynamicSpecs,
    sustainability: formData.sustainability,
    certifications: formData.certifications,
    customization: formData.customization,
    leadTime: {
      standard: info.standardLeadTime ? parseInt(info.standardLeadTime) : null,
      custom: info.customLeadTime ? parseInt(info.customLeadTime) : null,
      rush: info.rushLeadTime ? parseInt(info.rushLeadTime) : null,
    },
    images: formData.uploadedImages,
    features: info.features,
  };
}
