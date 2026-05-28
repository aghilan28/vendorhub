import { describe, expect, it } from "vitest";
import {
  buildBulkNormalizationPlan,
  calculateCatalogQuality,
  detectDuplicateCandidate,
  validateImageAudit,
  validateVariantIntegrity,
  visibilityForQuality,
} from "@/lib/catalog-governance";
import type { CatalogVariant, MasterProduct } from "@/types";

const completeProduct: MasterProduct = {
  productId: "product-aavin-milk",
  canonicalName: "Aavin Milk 500ml",
  normalizedName: "aavin milk 500ml",
  slug: "aavin-milk-500ml",
  description: "Fresh toned packet milk for morning delivery.",
  shortDescription: "Fresh 500ml packet milk.",
  departmentId: "dept-dairy",
  categoryId: "cat-milk",
  productType: "BRANDED",
  brandId: "brand-aavin",
  manufacturer: "Aavin",
  originRegion: "TN",
  hsnCode: "0401",
  barcode: "890000000001",
  internalSku: "TN-MILK-AAVIN-500ML",
  sellerVisibility: "PUBLIC",
  activeStatus: "ACTIVE",
  englishName: "Aavin Milk 500ml",
  tamilName: "ஆவின் பால்",
  tamilTransliteration: "aavin paal",
  teluguName: "ఆవిన్ పాలు",
  kannadaName: "ಆವಿನ್ ಹಾಲು",
  malayalamName: "ആവിൻ പാൽ",
  hindiName: "आविन दूध",
  romanizedVariants: ["aavin milk", "aavin paal", "packet milk"],
  aliases: [
    {
      alias: "Aavin blue milk",
      normalizedAlias: "aavin blue milk",
      aliasType: "COLLOQUIAL",
      language: "roman",
      regionCodes: ["TN"],
      confidence: 0.9,
    },
  ],
  discoveryTags: ["breakfast", "kids", "protein-rich"],
};

const completeVariant: CatalogVariant = {
  variantId: "variant-aavin-500ml",
  productId: completeProduct.productId,
  variantType: "VOLUME",
  variantName: "500ml pouch",
  quantity: 500,
  unitSlug: "milliliter",
  normalizedMetricValue: 500,
  normalizedMetricUnit: "ml",
  packagingType: "pouch",
  shelfLifeHours: 24,
  storageRequirement: "refrigerated",
  fragileFlag: false,
  coldChainRequired: true,
  maxDeliveryRadiusKm: 5,
  freshnessWindowMinutes: 120,
  skuTemplate: "TN-MILK-AAVIN-500ML",
};

describe("tier-1.5 catalog governance", () => {
  it("scores production-grade catalog entries as AI-safe and active", () => {
    const score = calculateCatalogQuality({
      product: { ...completeProduct, status: "pending_review" },
      variants: [completeVariant],
      images: [
        {
          imageKind: "HERO",
          width: 1200,
          height: 1200,
          blurScore: 0.05,
          backgroundQualityScore: 0.95,
          brightnessScore: 0.85,
          packagingVisibility: 0.9,
          ocrReadability: 0.9,
        },
        {
          imageKind: "PACKAGING",
          width: 1000,
          height: 1000,
          blurScore: 0.05,
          backgroundQualityScore: 0.9,
          packagingVisibility: 0.9,
          ocrReadability: 0.95,
        },
      ],
      searchTokenCount: 10,
      sellerUsage: { sellerCount: 4, successfulSales: 20, reorderFrequency: 2 },
    });

    expect(score.score).toBeGreaterThanOrEqual(90);
    expect(score.grade).toBe("production_grade");
    expect(score.autoVisibility).toBe("active");
    expect(score.aiSafeDatasetEligible).toBe(true);
  });

  it("hides weak products automatically without hard-delete behavior", () => {
    const score = calculateCatalogQuality({
      product: {
        ...completeProduct,
        status: "pending_review",
        description: undefined,
        shortDescription: undefined,
        tamilName: undefined,
        teluguName: undefined,
        kannadaName: undefined,
        malayalamName: undefined,
        hindiName: undefined,
        romanizedVariants: [],
        aliases: [],
        discoveryTags: [],
      },
      variants: [],
      images: [],
      searchTokenCount: 0,
      duplicateSignals: { likelyDuplicate: true, confidence: 0.92 },
      moderationSignals: { aiGeneratedSuspicion: 0.7, policyRisk: 0.5, malformedDescription: true, openIssueCount: 2 },
    });

    expect(score.score).toBeLessThan(50);
    expect(score.autoVisibility).toBe("hidden");
    expect(score.issues.map((item) => item.issueCode)).toContain("duplicate_candidate");
    expect(score.issues.every((item) => item.reversible)).toBe(true);
  });

  it("does not resurrect archived, deprecated, or blocked products through scoring", () => {
    expect(visibilityForQuality(98, "archived")).toBe("archived");
    expect(visibilityForQuality(98, "deprecated")).toBe("deprecated");
    expect(visibilityForQuality(98, "blocked")).toBe("blocked");
  });

  it("validates image trust thresholds", () => {
    const issues = validateImageAudit({
      imageKind: "PACKAGING",
      width: 500,
      height: 500,
      blurScore: 0.7,
      backgroundQualityScore: 0.4,
      watermarkDetected: true,
      packagingVisibility: 0.2,
      aiGeneratedSuspicion: 0.9,
    });

    expect(issues.map((item) => item.issueCode)).toEqual(
      expect.arrayContaining(["image_resolution_below_minimum", "image_blurry", "watermark_detected", "packaging_visibility_low", "ai_generated_image_suspicious"]),
    );
  });

  it("validates loose-unit and cold-chain variant integrity", () => {
    const issues = validateVariantIntegrity({
      ...completeVariant,
      variantType: "LOOSE",
      quantity: 0,
      unitSlug: undefined,
      traditionalUnitSlug: "kattu",
      minMetricValue: 50,
      maxMetricValue: 1000,
      maxDeliveryRadiusKm: 20,
    });

    expect(issues.map((item) => item.issueCode)).toEqual(
      expect.arrayContaining(["impossible_quantity", "traditional_unit_range_unrealistic", "cold_chain_radius_weak"]),
    );
  });

  it("flags duplicate candidates using barcode, image, variant, phonetic, and multilingual signals", () => {
    const candidate = detectDuplicateCandidate(
      {
        productId: "product-a",
        canonicalName: "Aavin Milk 500ml",
        normalizedName: "aavin milk 500ml",
        barcode: "890000000001",
        variantCodes: ["500ml"],
        aliases: ["aavin paal", "packet milk"],
        imageHashes: ["hash-a"],
        languages: { ta: "ஆவின் பால்" },
        regionCodes: ["TN"],
      },
      {
        productId: "product-b",
        canonicalName: "AAVIN blue milk",
        normalizedName: "aavin packet milk 500 ml",
        barcode: "890000000001",
        variantCodes: ["500ml"],
        aliases: ["aavin paal", "aavin milk"],
        imageHashes: ["hash-a"],
        languages: { ta: "ஆவின் பால்" },
        regionCodes: ["TN"],
      },
    );

    expect(candidate).not.toBeNull();
    expect(candidate?.recommendedAction).toBe("review_merge");
    expect(candidate?.methods).toEqual(expect.arrayContaining(["barcode_match", "image_hash_match", "variant_overlap", "phonetic_match", "multilingual_match"]));
  });

  it("builds reversible bulk normalization plans with rollback expectations", () => {
    const plan = buildBulkNormalizationPlan({ jobType: "bulk_duplicate_merging", targetCount: 120 });
    expect(plan.dryRun).toBe(true);
    expect(plan.reversible).toBe(true);
    expect(plan.rollbackRequired).toBe(true);
    expect(plan.expectedIssueDomains).toEqual(["duplicate", "seller_catalog"]);
  });
});
