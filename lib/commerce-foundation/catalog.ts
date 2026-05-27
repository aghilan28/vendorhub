import {
  COMMERCE_REGIONS,
  DISCOVERY_TAGS,
  MASTER_DEPARTMENTS,
  PACKAGING_TYPE_SLUGS,
  PERISHABILITY_CLASSES,
  PRODUCT_IMAGE_KINDS,
  SEARCH_TOKEN_TYPES,
  TRADITIONAL_UNIT_SLUGS,
  VARIANT_TYPES,
  type CatalogVariant,
  type CommerceRegion,
  type MasterProduct,
  type ProductSearchRepresentation,
} from "@/types/commerce-foundation";

const skuPartPattern = /[^a-z0-9]+/gi;

export const COMMERCE_FOUNDATION = {
  supportedRegions: COMMERCE_REGIONS,
  departments: MASTER_DEPARTMENTS,
  perishabilityClasses: PERISHABILITY_CLASSES,
  variantTypes: VARIANT_TYPES,
  packagingTypes: PACKAGING_TYPE_SLUGS,
  traditionalUnits: TRADITIONAL_UNIT_SLUGS,
  imageKinds: PRODUCT_IMAGE_KINDS,
  searchTokenTypes: SEARCH_TOKEN_TYPES,
  discoveryTags: DISCOVERY_TAGS,
} as const;

export function normalizeCommerceText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9\u0b80-\u0bff\u0c00-\u0c7f\u0c80-\u0cff\u0d00-\u0d7f\u0900-\u097f]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function generateCatalogSku(input: {
  region: CommerceRegion | string;
  category: string;
  product: string;
  variant: string;
}): string {
  return [input.region, input.category, input.product, input.variant]
    .map((part) => {
      const normalized = part.normalize("NFKD").replace(skuPartPattern, "").toUpperCase();
      return normalized || "NA";
    })
    .join("-");
}

export function buildVariantCode(variant: Pick<CatalogVariant, "variantName" | "quantity" | "normalizedMetricUnit" | "traditionalUnitSlug">): string {
  if (variant.quantity && variant.normalizedMetricUnit) {
    return `${variant.quantity}${variant.normalizedMetricUnit}`;
  }

  if (variant.traditionalUnitSlug) {
    return variant.traditionalUnitSlug;
  }

  return variant.variantName;
}

export function buildSearchRepresentation(product: MasterProduct): ProductSearchRepresentation {
  const aliasTokens = product.aliases.map((alias) => alias.normalizedAlias);
  const transliterationTokens = [
    product.tamilTransliteration,
    ...product.romanizedVariants,
    ...product.aliases.filter((alias) => alias.aliasType === "PHONETIC" || alias.aliasType === "VOICE").map((alias) => alias.alias),
  ].filter((token): token is string => Boolean(token));

  const searchTokens = [
    product.canonicalName,
    product.englishName,
    product.tamilName,
    product.teluguName,
    product.kannadaName,
    product.malayalamName,
    product.hindiName,
    ...product.romanizedVariants,
    ...product.discoveryTags,
    ...aliasTokens,
  ]
    .filter((token): token is string => Boolean(token))
    .map(normalizeCommerceText);

  return {
    productId: product.productId,
    semanticText: [
      product.canonicalName,
      product.shortDescription,
      product.description,
      product.discoveryTags.join(" "),
      product.romanizedVariants.join(" "),
      product.aliases.map((alias) => alias.alias).join(" "),
    ]
      .filter(Boolean)
      .join("\n"),
    searchTokens: Array.from(new Set(searchTokens)),
    fuzzyTokens: Array.from(new Set(searchTokens.flatMap((token) => token.split(" ")))),
    transliterationTokens: Array.from(new Set(transliterationTokens.map(normalizeCommerceText))),
    phoneticTokens: Array.from(
      new Set(product.aliases.filter((alias) => alias.aliasType === "PHONETIC").map((alias) => normalizeCommerceText(alias.alias))),
    ),
    autocompleteTokens: Array.from(new Set([product.canonicalName, product.englishName, ...product.romanizedVariants].map(normalizeCommerceText))),
    recipeAssociations: product.discoveryTags.filter((tag) => tag === "breakfast" || tag === "lunch" || tag === "dinner" || tag === "quick-cook"),
    coPurchaseTags: product.discoveryTags.filter((tag) => tag === "pooja" || tag === "tea-time" || tag === "rainy-day" || tag === "hostel"),
  };
}

export function isLooseUnitVariant(variant: CatalogVariant): boolean {
  return variant.variantType === "LOOSE" || Boolean(variant.traditionalUnitSlug) || variant.packagingType === "loose";
}

export function requiresColdChain(variant: Pick<CatalogVariant, "coldChainRequired" | "storageRequirement">): boolean {
  return variant.coldChainRequired || variant.storageRequirement === "refrigerated" || variant.storageRequirement === "frozen" || variant.storageRequirement === "iced_insulated";
}
