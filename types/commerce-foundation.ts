export const COMMERCE_REGIONS = ["TN", "KL", "KA", "AP", "TS"] as const;
export const COMMERCE_LANGUAGES = ["en", "ta", "te", "kn", "ml", "hi", "roman"] as const;

export const TAXONOMY_LEVELS = [
  "DEPARTMENT",
  "CATEGORY",
  "SUBCATEGORY",
  "PRODUCT_FAMILY",
  "PRODUCT_GROUP",
  "PRODUCT",
  "VARIANT",
  "SKU",
] as const;

export const PERISHABILITY_CLASSES = [
  "ULTRA_FRESH",
  "SAME_DAY_FRESH",
  "SHORT_SHELF",
  "MEDIUM_SHELF",
  "LONG_SHELF",
  "FROZEN",
  "DRY_STABLE",
] as const;

export const VARIANT_TYPES = [
  "LOOSE",
  "WEIGHT",
  "VOLUME",
  "SACHET",
  "BOTTLE",
  "BOX",
  "TRAY",
  "BUNDLE",
  "COMBO",
  "PACKET",
  "PIECE",
  "SUBSCRIPTION",
  "REFILL",
  "SEASONAL_PACK",
] as const;

export const PACKAGING_TYPE_SLUGS = [
  "sachet",
  "pouch",
  "packet",
  "tetra-pack",
  "loose",
  "tied-bundle",
  "newspaper-wrap",
  "tray",
  "bottle",
  "tin",
  "jar",
  "carton",
  "cloth-bag",
  "banana-leaf-wrap",
] as const;

export const TRADITIONAL_UNIT_SLUGS = [
  "kattu",
  "padi",
  "marakkal",
  "loose",
  "bunch",
  "bundle",
  "packet",
  "half-kg",
  "quarter-kg",
  "piece",
] as const;

export const PRODUCT_IMAGE_KINDS = [
  "HERO",
  "TRANSPARENT_PNG",
  "PACKAGING",
  "SHELF",
  "MULTI_ANGLE",
  "MOBILE_THUMBNAIL",
  "SQUARE_CROP",
  "LOW_BANDWIDTH",
  "SELLER_UPLOADED",
  "AI_NORMALIZED",
] as const;

export const SEARCH_TOKEN_TYPES = [
  "SEMANTIC",
  "FUZZY",
  "TRANSLITERATION",
  "PHONETIC",
  "AUTOCOMPLETE",
  "RECIPE",
  "CO_PURCHASE",
  "INTENT",
] as const;

export const DISCOVERY_TAGS = [
  "breakfast",
  "lunch",
  "dinner",
  "pooja",
  "festival",
  "hostel",
  "rainy-day",
  "tea-time",
  "diabetic",
  "protein-rich",
  "kids",
  "spicy",
  "quick-cook",
] as const;

export const MASTER_DEPARTMENTS = [
  "grocery",
  "fruits-vegetables",
  "dairy-breakfast",
  "bakery",
  "snacks-packaged-foods",
  "beverages",
  "frozen-foods",
  "meat-seafood",
  "household-essentials",
  "cleaning-supplies",
  "personal-care",
  "baby-care",
  "health-otc",
  "pooja-religious-essentials",
  "pet-supplies",
  "kitchen-utility",
  "stationery-school-supplies",
  "home-utility",
  "local-foods",
  "ready-to-eat",
  "tiffin-batter-products",
  "flowers-garlands",
  "local-seasonal-products",
] as const;

export type CommerceRegion = (typeof COMMERCE_REGIONS)[number];
export type CommerceLanguage = (typeof COMMERCE_LANGUAGES)[number];
export type TaxonomyLevel = (typeof TAXONOMY_LEVELS)[number];
export type PerishabilityClass = (typeof PERISHABILITY_CLASSES)[number];
export type VariantType = (typeof VARIANT_TYPES)[number];
export type PackagingTypeSlug = (typeof PACKAGING_TYPE_SLUGS)[number];
export type TraditionalUnitSlug = (typeof TRADITIONAL_UNIT_SLUGS)[number];
export type ProductImageKind = (typeof PRODUCT_IMAGE_KINDS)[number];
export type SearchTokenType = (typeof SEARCH_TOKEN_TYPES)[number];
export type DiscoveryTag = (typeof DISCOVERY_TAGS)[number];
export type MasterDepartmentSlug = (typeof MASTER_DEPARTMENTS)[number];

export type MultilingualNames = Partial<Record<CommerceLanguage, string>>;
export type RegionalPriority = Partial<Record<CommerceRegion, number>>;

export interface ImageRequirements {
  required: ProductImageKind[];
  background: "white";
  supportsAspectRatios: Array<"1:1" | "4:5">;
  webpRequired: boolean;
  watermarkAllowed: false;
  mobileOptimized: boolean;
  lazyLoadingReady: boolean;
}

export interface FulfillmentConstraints {
  maxTransitMinutes?: number;
  maxDeliveryRadiusKm?: number;
  coldChainRequired?: boolean;
  insulatedDeliveryRequired?: boolean;
  iceRequired?: boolean;
  crushSensitive?: boolean;
  humiditySensitive?: boolean;
  odorIsolation?: boolean;
  separateFromFood?: boolean;
  expiryRequired?: boolean;
  routeBatchingAllowed?: boolean;
  morningPriority?: boolean;
}

export interface TaxonomyNode {
  id: string;
  slug: string;
  canonicalName: string;
  multilingualNames: MultilingualNames;
  aliases: string[];
  searchTerms: string[];
  parentCategoryId: string | null;
  regionalPriority: RegionalPriority;
  seasonality: Record<string, unknown>;
  perishabilityClass: PerishabilityClass;
  imageRequirements: ImageRequirements;
  packagingDefaults: PackagingTypeSlug[];
  fulfillmentConstraints: FulfillmentConstraints;
  dietaryClassification: Record<string, unknown>;
  discoveryTags: DiscoveryTag[];
}

export interface ProductAlias {
  alias: string;
  normalizedAlias: string;
  aliasType: "COLLOQUIAL" | "SLANG" | "OCR" | "PHONETIC" | "VOICE" | "MISSPELLING" | "SHORTHAND" | "REGIONAL";
  language: CommerceLanguage;
  regionCodes: CommerceRegion[];
  confidence: number;
}

export interface MasterProduct {
  productId: string;
  canonicalName: string;
  normalizedName: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  departmentId: string;
  categoryId: string;
  subcategoryId?: string;
  productFamilyId?: string;
  productType: "BRANDED" | "UNBRANDED" | "LOOSE" | "LOCAL" | "SEASONAL" | "HANDMADE" | "BUNDLE" | "COMBO";
  brandId?: string;
  manufacturer?: string;
  originRegion?: CommerceRegion;
  hsnCode?: string;
  barcode?: string;
  internalSku: string;
  externalSku?: string;
  sellerVisibility: "PUBLIC" | "SELLER_ONLY" | "ADMIN_ONLY";
  activeStatus: "ACTIVE" | "DRAFT" | "ARCHIVED" | "SUSPENDED";
  englishName: string;
  tamilName?: string;
  tamilTransliteration?: string;
  teluguName?: string;
  kannadaName?: string;
  malayalamName?: string;
  hindiName?: string;
  romanizedVariants: string[];
  aliases: ProductAlias[];
  discoveryTags: DiscoveryTag[];
}

export interface CatalogVariant {
  variantId: string;
  productId: string;
  variantType: VariantType;
  variantName: string;
  quantity?: number;
  unitSlug?: string;
  traditionalUnitSlug?: TraditionalUnitSlug;
  normalizedMetricValue?: number;
  normalizedMetricUnit?: "g" | "ml" | "pc";
  minMetricValue?: number;
  maxMetricValue?: number;
  packagingType: PackagingTypeSlug;
  shelfLifeHours?: number;
  storageRequirement: "ambient" | "cool_ventilated" | "refrigerated" | "frozen" | "iced_insulated";
  fragileFlag: boolean;
  coldChainRequired: boolean;
  estimatedWeightGrams?: number;
  dimensionalWeightGrams?: number;
  maxDeliveryRadiusKm?: number;
  freshnessWindowMinutes?: number;
  reorderThreshold?: number;
  skuTemplate: string;
}

export interface ProductImageStandard {
  imageKind: ProductImageKind;
  aspectRatio: "1:1" | "4:5";
  mimeType: "image/webp" | "image/png" | "image/jpeg";
  whiteBackground: boolean;
  mobileOptimized: boolean;
  noWatermark: boolean;
  lazyLoadingReady: boolean;
  brightnessScore?: number;
  blurScore?: number;
  packagingVisibility?: number;
  ocrReadability?: number;
  duplicateHash?: string;
  dominantColors: string[];
  visualEmbeddingId?: string;
}

export interface ProductSearchRepresentation {
  productId: string;
  semanticText: string;
  searchTokens: string[];
  fuzzyTokens: string[];
  transliterationTokens: string[];
  phoneticTokens: string[];
  vectorSearchId?: string;
  autocompleteTokens: string[];
  recipeAssociations: string[];
  coPurchaseTags: string[];
}

export interface SellerProductMapping {
  sellerProductId: string;
  vendorId: string;
  masterProductId: string;
  catalogVariantId?: string;
  sellerSku: string;
  price: number;
  mrp?: number;
  stockQuantity: number;
  deliveryRadiusKm?: number;
  freshnessMinutes?: number;
  titleOverride?: string;
  localAliases: string[];
  sellerImagePath?: string;
}
