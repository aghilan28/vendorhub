import { describe, expect, it } from "vitest";
import {
  COMMERCE_FOUNDATION,
  buildSearchRepresentation,
  buildVariantCode,
  generateCatalogSku,
  isLooseUnitVariant,
  normalizeCommerceText,
  requiresColdChain,
} from "@/lib/commerce-foundation";
import type { CatalogVariant, MasterProduct } from "@/types/commerce-foundation";

const baseVariant: CatalogVariant = {
  variantId: "variant-1",
  productId: "product-1",
  variantType: "WEIGHT",
  variantName: "500 g packet",
  quantity: 500,
  unitSlug: "gram",
  normalizedMetricValue: 500,
  normalizedMetricUnit: "g",
  packagingType: "packet",
  storageRequirement: "ambient",
  fragileFlag: false,
  coldChainRequired: false,
  skuTemplate: "TN-RICE-PONNI-500G",
};

const coriander: MasterProduct = {
  productId: "product-coriander",
  canonicalName: "Coriander Leaves",
  normalizedName: "coriander leaves",
  slug: "coriander-leaves",
  shortDescription: "Fresh coriander leaves for chutney, sambar, and garnish.",
  departmentId: "dept-produce",
  categoryId: "cat-greens",
  productType: "LOOSE",
  internalSku: "TN-GREENS-CORIANDER",
  sellerVisibility: "PUBLIC",
  activeStatus: "ACTIVE",
  englishName: "Coriander Leaves",
  tamilName: "கொத்தமல்லி",
  tamilTransliteration: "kothamalli",
  teluguName: "కొత్తిమీర",
  kannadaName: "ಕೊತ್ತಂಬರಿ",
  malayalamName: "മല്ലിയില",
  hindiName: "धनिया",
  romanizedVariants: ["kothamalli", "malli", "dhania", "kottambari", "kothimeera"],
  aliases: [
    {
      alias: "Malli",
      normalizedAlias: "malli",
      aliasType: "COLLOQUIAL",
      language: "roman",
      regionCodes: ["TN", "KL"],
      confidence: 0.95,
    },
    {
      alias: "Kothimeera",
      normalizedAlias: "kothimeera",
      aliasType: "VOICE",
      language: "roman",
      regionCodes: ["AP", "TS"],
      confidence: 0.9,
    },
  ],
  discoveryTags: ["breakfast", "lunch", "dinner", "quick-cook"],
};

describe("tier-1 commerce foundation", () => {
  it("keeps the mandatory MVP department and regional coverage explicit", () => {
    expect(COMMERCE_FOUNDATION.supportedRegions).toEqual(["TN", "KL", "KA", "AP", "TS"]);
    expect(COMMERCE_FOUNDATION.departments).toHaveLength(23);
    expect(COMMERCE_FOUNDATION.departments).toContain("pooja-religious-essentials");
    expect(COMMERCE_FOUNDATION.departments).toContain("tiffin-batter-products");
    expect(COMMERCE_FOUNDATION.departments).not.toContain("gold");
  });

  it("generates region-category-product-variant SKUs for master and seller catalogs", () => {
    expect(generateCatalogSku({ region: "TN", category: "RICE", product: "PONNI", variant: "5KG" })).toBe("TN-RICE-PONNI-5KG");
    expect(generateCatalogSku({ region: "CHN", category: "FLOWER", product: "MALLI", variant: "LOOSE" })).toBe("CHN-FLOWER-MALLI-LOOSE");
    expect(generateCatalogSku({ region: "BLR", category: "MILK", product: "AAVIN", variant: "500ML" })).toBe("BLR-MILK-AAVIN-500ML");
  });

  it("derives variant codes for metric and traditional loose-unit commerce", () => {
    expect(buildVariantCode(baseVariant)).toBe("500g");
    expect(buildVariantCode({ ...baseVariant, quantity: undefined, normalizedMetricUnit: undefined, traditionalUnitSlug: "kattu" })).toBe("kattu");
  });

  it("identifies loose and cold-chain variants from commerce semantics", () => {
    expect(isLooseUnitVariant(baseVariant)).toBe(false);
    expect(isLooseUnitVariant({ ...baseVariant, variantType: "LOOSE", traditionalUnitSlug: "kattu", packagingType: "tied-bundle" })).toBe(true);
    expect(requiresColdChain(baseVariant)).toBe(false);
    expect(requiresColdChain({ ...baseVariant, storageRequirement: "iced_insulated" })).toBe(true);
  });

  it("builds multilingual and alias-rich search representations", () => {
    const representation = buildSearchRepresentation(coriander);
    expect(representation.searchTokens).toContain("coriander leaves");
    expect(representation.searchTokens).toContain("கொத்தமல்லி");
    expect(representation.transliterationTokens).toContain("kothamalli");
    expect(representation.transliterationTokens).toContain("kothimeera");
    expect(representation.recipeAssociations).toEqual(["breakfast", "lunch", "dinner", "quick-cook"]);
  });

  it("normalizes roman, Indic, OCR, and voice-commerce tokens without losing script", () => {
    expect(normalizeCommerceText("  Kothamalli!! / Malli  ")).toBe("kothamalli malli");
    expect(normalizeCommerceText("கொத்தமல்லி  Fresh")).toBe("கொத்தமல்லி fresh");
  });
});
