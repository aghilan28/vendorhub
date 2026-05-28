import { buildSearchRepresentation, isLooseUnitVariant, normalizeCommerceText, requiresColdChain } from "@/lib/commerce-foundation";
import type {
  BulkNormalizationJobType,
  BulkNormalizationPlan,
  CatalogImageAuditInput,
  CatalogQualityInput,
  CatalogQualityScore,
  CatalogValidationIssue,
  DuplicateCandidate,
  DuplicateDetectionInput,
} from "@/types/catalog-governance";
import type { CatalogVariant, CommerceLanguage, MasterProduct } from "@/types/commerce-foundation";

const requiredLanguages: CommerceLanguage[] = ["ta", "te", "kn", "ml", "hi"];

function boundedScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function issue(input: CatalogValidationIssue): CatalogValidationIssue {
  return input;
}

export function qualityGrade(score: number): CatalogQualityScore["grade"] {
  if (score >= 90) return "production_grade";
  if (score >= 70) return "good_improvable";
  if (score >= 50) return "needs_review";
  return "auto_hidden";
}

export function visibilityForQuality(score: number, currentStatus: CatalogQualityInput["product"]["status"] = "pending_review") {
  if (currentStatus === "archived" || currentStatus === "deprecated" || currentStatus === "blocked") return currentStatus;
  if (score < 50) return "hidden";
  if (score < 70) return "pending_review";
  return "active";
}

export function validateImageAudit(image: CatalogImageAuditInput): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];
  const width = image.width ?? 0;
  const height = image.height ?? 0;

  if (width < 800 || height < 800) {
    issues.push(
      issue({
        domain: "image",
        severity: "major",
        issueCode: "image_resolution_below_minimum",
        title: "Image resolution below 800x800",
        detail: "Catalog images must support clean mobile thumbnails, square crops, and AI-safe visual indexing.",
        reversible: true,
        autoFixable: false,
      }),
    );
  }

  if ((image.blurScore ?? 0) > 0.45) {
    issues.push(issue({ domain: "image", severity: "major", issueCode: "image_blurry", title: "Image is blurry", detail: "Blur score exceeds the marketplace trust threshold.", reversible: true, autoFixable: false }));
  }

  if (image.watermarkDetected) {
    issues.push(issue({ domain: "image", severity: "major", issueCode: "watermark_detected", title: "Watermark detected", detail: "Product images must not contain watermarks.", reversible: true, autoFixable: false }));
  }

  if ((image.backgroundQualityScore ?? 1) < 0.55) {
    issues.push(issue({ domain: "image", severity: "warning", issueCode: "background_quality_low", title: "Background quality is weak", detail: "Image background may be cluttered, shadowed, or not clean enough for marketplace use.", reversible: true, autoFixable: false }));
  }

  if ((image.packagingVisibility ?? 1) < 0.45 && image.imageKind === "PACKAGING") {
    issues.push(issue({ domain: "image", severity: "warning", issueCode: "packaging_visibility_low", title: "Packaging label is hard to inspect", detail: "Packaging images should show readable labels and proper framing.", reversible: true, autoFixable: false }));
  }

  if ((image.aiGeneratedSuspicion ?? 0) >= 0.7) {
    issues.push(issue({ domain: "image", severity: "critical", issueCode: "ai_generated_image_suspicious", title: "AI-generated image suspicion", detail: "Image may contain unrealistic product or hallucinated packaging details.", reversible: true, autoFixable: false }));
  }

  return issues;
}

export function validateVariantIntegrity(variant: CatalogVariant): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];
  const quantity = variant.quantity ?? variant.normalizedMetricValue ?? variant.minMetricValue ?? 1;

  if (quantity <= 0) {
    issues.push(issue({ domain: "variant", severity: "critical", issueCode: "impossible_quantity", title: "Impossible variant quantity", detail: "Variant quantity cannot be zero or negative.", reversible: true, autoFixable: true }));
  }

  if ((variant.variantType === "WEIGHT" || variant.variantType === "VOLUME") && !variant.unitSlug) {
    issues.push(issue({ domain: "variant", severity: "major", issueCode: "missing_metric_unit", title: "Metric unit missing", detail: "Weight and volume variants must include normalized metric units.", reversible: true, autoFixable: true }));
  }

  if (!variant.packagingType) {
    issues.push(issue({ domain: "variant", severity: "major", issueCode: "missing_packaging_type", title: "Packaging type missing", detail: "Every SKU needs a packaging type for delivery, image, and seller onboarding consistency.", reversible: true, autoFixable: true }));
  }

  if (isLooseUnitVariant(variant) && variant.minMetricValue && variant.maxMetricValue && variant.maxMetricValue > variant.minMetricValue * 8) {
    issues.push(issue({ domain: "variant", severity: "warning", issueCode: "traditional_unit_range_unrealistic", title: "Traditional unit range is too wide", detail: "Loose units like kattu should use locality-calibrated weight ranges, not uncontrolled variance.", reversible: true, autoFixable: false }));
  }

  if (requiresColdChain(variant) && (!variant.maxDeliveryRadiusKm || variant.maxDeliveryRadiusKm > 8)) {
    issues.push(issue({ domain: "variant", severity: "warning", issueCode: "cold_chain_radius_weak", title: "Cold-chain radius needs review", detail: "Cold-chain products should use tight hyperlocal delivery constraints.", reversible: true, autoFixable: true }));
  }

  return issues;
}

function scoreImages(images: CatalogImageAuditInput[]) {
  if (!images.length) return 0;
  const penalties = images.flatMap(validateImageAudit).reduce((sum, item) => sum + (item.severity === "critical" ? 35 : item.severity === "major" ? 18 : 8), 0);
  const coverageBonus = Math.min(30, images.length * 8);
  return boundedScore(70 + coverageBonus - penalties);
}

function scoreMetadata(product: MasterProduct, aliasesCount: number, variants: CatalogVariant[], images: CatalogImageAuditInput[]) {
  const multilingualCount = [product.tamilName, product.teluguName, product.kannadaName, product.malayalamName, product.hindiName].filter(Boolean).length;
  return boundedScore(
    (product.description ? 18 : 0) +
      (product.shortDescription ? 10 : 0) +
      multilingualCount * 8 +
      Math.min(16, aliasesCount * 4) +
      Math.min(12, product.romanizedVariants.length * 3) +
      Math.min(12, variants.length * 6) +
      Math.min(10, images.length * 5) +
      Math.min(10, product.discoveryTags.length * 2),
  );
}

function scoreSearch(product: MasterProduct, searchTokenCount: number) {
  const representation = buildSearchRepresentation(product);
  const coverage = requiredLanguages.filter((language) => representation.searchTokens.some((token) => token.length > 0) || language === "ta").length;
  return boundedScore(
    Math.min(35, representation.searchTokens.length * 3) +
      Math.min(20, representation.transliterationTokens.length * 5) +
      Math.min(15, representation.autocompleteTokens.length * 5) +
      Math.min(20, searchTokenCount * 4) +
      coverage * 2,
  );
}

export function calculateCatalogQuality(input: CatalogQualityInput): CatalogQualityScore {
  const issues: CatalogValidationIssue[] = [
    ...input.images.flatMap(validateImageAudit),
    ...input.variants.flatMap(validateVariantIntegrity),
  ];

  const aliasesCount = input.aliasesCount ?? input.product.aliases.length;
  const metadataCompleteness = scoreMetadata(input.product, aliasesCount, input.variants, input.images);
  const imageQuality = scoreImages(input.images);
  const categoryConsistency = input.product.departmentId && input.product.categoryId ? 100 : 25;
  const variantValidity = boundedScore(100 - input.variants.flatMap(validateVariantIntegrity).reduce((sum, item) => sum + (item.severity === "critical" ? 35 : item.severity === "major" ? 20 : 10), input.variants.length ? 0 : 70));
  const searchReadiness = scoreSearch(input.product, input.searchTokenCount ?? 0);
  const sellerUsage = boundedScore(25 + (input.sellerUsage?.sellerCount ?? 0) * 15 + (input.sellerUsage?.successfulSales ?? 0) * 2 + (input.sellerUsage?.reorderFrequency ?? 0) * 10);
  const duplicateConfidence = boundedScore(100 - (input.duplicateSignals?.likelyDuplicate ? (input.duplicateSignals.confidence || 0.5) * 80 : 0) - (input.duplicateSignals?.conflictingMetadata ? 20 : 0));
  const moderationConfidence = boundedScore(
    100 -
      (input.moderationSignals?.aiGeneratedSuspicion ?? 0) * 45 -
      (input.moderationSignals?.policyRisk ?? 0) * 45 -
      (input.moderationSignals?.malformedDescription ? 20 : 0) -
      (input.moderationSignals?.openIssueCount ?? 0) * 8,
  );

  if (metadataCompleteness < 70) {
    issues.push(issue({ domain: "metadata", severity: "warning", issueCode: "metadata_incomplete", title: "Metadata completeness is weak", detail: "Descriptions, aliases, multilingual names, variants, packaging, units, or images are incomplete.", reversible: true, autoFixable: false }));
  }
  if (searchReadiness < 70) {
    issues.push(issue({ domain: "search", severity: "warning", issueCode: "search_readiness_weak", title: "Search readiness is weak", detail: "Aliases, transliterations, fuzzy tokens, autocomplete tokens, or multilingual coverage need improvement.", reversible: true, autoFixable: true }));
  }
  if (input.duplicateSignals?.likelyDuplicate) {
    issues.push(issue({ domain: "duplicate", severity: input.duplicateSignals.confidence >= 0.9 ? "major" : "warning", issueCode: "duplicate_candidate", title: "Duplicate candidate", detail: "Product should be clustered for review, not deleted.", reversible: true, autoFixable: false }));
  }

  const score = boundedScore(
    metadataCompleteness * 0.2 +
      imageQuality * 0.2 +
      categoryConsistency * 0.1 +
      variantValidity * 0.1 +
      searchReadiness * 0.1 +
      sellerUsage * 0.1 +
      duplicateConfidence * 0.1 +
      moderationConfidence * 0.1,
  );

  return {
    score,
    grade: qualityGrade(score),
    autoVisibility: visibilityForQuality(score, input.product.status),
    factors: {
      metadataCompleteness,
      imageQuality,
      categoryConsistency,
      variantValidity,
      searchReadiness,
      sellerUsage,
      duplicateConfidence,
      moderationConfidence,
    },
    issues,
    aiSafeDatasetEligible: score >= 90 && !issues.some((item) => item.severity === "critical" || item.domain === "duplicate" || item.domain === "moderation"),
  };
}

function jaccardSimilarity(left: string[], right: string[]) {
  const a = new Set(left.map(normalizeCommerceText).filter(Boolean));
  const b = new Set(right.map(normalizeCommerceText).filter(Boolean));
  const union = new Set([...a, ...b]);
  if (!union.size) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  return intersection / union.size;
}

export function detectDuplicateCandidate(left: DuplicateDetectionInput, right: DuplicateDetectionInput): DuplicateCandidate | null {
  const methods: DuplicateCandidate["methods"] = [];
  let confidence = 0;

  const leftName = normalizeCommerceText(left.normalizedName || left.canonicalName);
  const rightName = normalizeCommerceText(right.normalizedName || right.canonicalName);
  const nameSimilarity = jaccardSimilarity(leftName.split(" "), rightName.split(" "));
  if (leftName === rightName || nameSimilarity >= 0.66) {
    methods.push("name_similarity");
    confidence += leftName === rightName ? 0.35 : 0.22;
  }

  if (left.barcode && right.barcode && left.barcode === right.barcode) {
    methods.push("barcode_match");
    confidence += 0.55;
  }

  if (left.imageHashes.some((hash) => right.imageHashes.includes(hash))) {
    methods.push("image_hash_match");
    confidence += 0.25;
  }

  if (jaccardSimilarity(left.variantCodes, right.variantCodes) >= 0.5) {
    methods.push("variant_overlap");
    confidence += 0.15;
  }

  if (jaccardSimilarity(left.aliases, right.aliases) >= 0.33) {
    methods.push("phonetic_match");
    confidence += 0.15;
  }

  const languageOverlap = requiredLanguages.filter((language) => {
    const a = left.languages[language];
    const b = right.languages[language];
    return a && b && normalizeCommerceText(a) === normalizeCommerceText(b);
  }).length;
  if (languageOverlap > 0) {
    methods.push("multilingual_match");
    confidence += Math.min(0.25, languageOverlap * 0.08);
  }

  confidence = Math.min(1, confidence);
  if (confidence < 0.45 || methods.length === 0) return null;

  return {
    productIds: [left.productId, right.productId],
    confidence: Number(confidence.toFixed(3)),
    methods,
    recommendedAction: confidence >= 0.82 ? "review_merge" : "flag",
  };
}

export function buildBulkNormalizationPlan(input: {
  jobType: BulkNormalizationJobType;
  dryRun?: boolean;
  targetCount: number;
}): BulkNormalizationPlan {
  const rollbackRequired = ["bulk_category_fix", "bulk_image_replacement", "bulk_sku_regeneration", "bulk_duplicate_merging", "bulk_status_change"].includes(input.jobType);
  return {
    jobType: input.jobType,
    dryRun: input.dryRun ?? true,
    targetCount: input.targetCount,
    reversible: true,
    rollbackRequired,
    expectedIssueDomains:
      input.jobType === "bulk_duplicate_merging"
        ? ["duplicate", "seller_catalog"]
        : input.jobType === "bulk_image_replacement"
          ? ["image"]
          : input.jobType === "bulk_category_fix"
            ? ["category"]
            : input.jobType === "bulk_transliteration" || input.jobType === "bulk_alias_generation"
              ? ["search"]
              : ["metadata"],
  };
}
