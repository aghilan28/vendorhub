import type { Product, Vendor } from "@/types";
import type { RiskLevel } from "@/types/hyperlocal-operations";

export type AiIngestionSource = "ocr_document" | "whatsapp_text" | "whatsapp_image" | "seller_image" | "voice_note" | "manual_seed";
export type AiModerationState = "draft" | "needs_review" | "approved" | "rejected" | "rolled_back";
export type CommerceIntent = "inventory_update" | "order_request" | "price_update" | "stock_arrival" | "freshness_warning" | "catalog_creation" | "unknown";
export type ImageIssue = "blurry" | "low_light" | "cropped_packaging" | "compressed" | "multiple_products" | "reflective_packaging" | "duplicate_suspected";
export type SellerShopType = "bakery" | "tea_kadai" | "vegetable_shop" | "fish_market" | "pharmacy" | "kirana" | "pooja_store" | "unknown";

export interface ParsedCommerceLineItem {
  rawText: string;
  productName: string;
  quantity: number;
  unit: "kg" | "g" | "l" | "ml" | "piece" | "packet" | "bunch" | "string" | "box" | "unknown";
  unitText: string;
  price?: number;
  tax?: number;
  aliases: string[];
  confidence: number;
}

export interface OcrDocumentIntelligence {
  documentId: string;
  source: AiIngestionSource;
  sellerName?: string;
  timestamp?: string;
  locality?: string;
  languageHints: string[];
  layout: "handwritten_invoice" | "thermal_receipt" | "whatsapp_screenshot" | "stock_list" | "unknown";
  lineItems: ParsedCommerceLineItem[];
  totals: { subtotal?: number; tax?: number; total?: number };
  noiseScore: number;
  confidence: number;
  needsHumanReview: boolean;
  auditTrail: string[];
}

export interface WhatsappCommerceEvent {
  messageId: string;
  intent: CommerceIntent;
  sellerName?: string;
  locality?: string;
  lineItems: ParsedCommerceLineItem[];
  structuredEvent:
    | { type: "inventory"; productName: string; quantity: number; unit: string; price?: number }
    | { type: "order"; productName: string; quantity: number; unit: string }
    | { type: "pricing"; productName: string; price: number }
    | { type: "unknown"; rawText: string };
  confidence: number;
  voiceReadyTranscript?: string;
  replayKey: string;
}

export interface AiProductMatch {
  input: string;
  canonicalProductId?: string;
  canonicalName?: string;
  variantMatch?: string;
  confidence: number;
  ambiguous: boolean;
  candidates: Array<{ productId: string; name: string; score: number; reasons: string[] }>;
  corrections: string[];
}

export interface AiCatalogDraft {
  draftId: string;
  source: AiIngestionSource;
  title: string;
  categorySlug: string;
  brand?: string;
  variants: Array<{ label: string; quantity: number; unit: string; price?: number }>;
  aliases: string[];
  searchTokens: string[];
  multilingualTags: string[];
  metadata: Record<string, string | number | boolean>;
  confidence: number;
  moderationState: AiModerationState;
  rollbackToken: string;
  safetyFlags: string[];
}

export interface AiImageAnalysis {
  imageId: string;
  packagingVisibilityScore: number;
  imageQualityScore: number;
  duplicateConfidence: number;
  packagingTextExtraction: string[];
  categoryHints: string[];
  perceptualHash: string;
  packagingFingerprint: string;
  issues: ImageIssue[];
  moderationRequired: boolean;
}

export interface AiSellerSuggestion {
  id: string;
  sellerId: string;
  type: "restock" | "pricing" | "expiry" | "image_quality" | "catalog" | "onboarding" | "bundle";
  title: string;
  action: string;
  priority: RiskLevel;
  confidence: number;
}

export interface AiSafetyAssessment {
  confidenceScore: number;
  hallucinationRisk: number;
  policyRisk: number;
  counterfeitRisk: number;
  unsafeSubstitutionRisk: number;
  fakePricingRisk: number;
  moderationState: AiModerationState;
  thresholds: Record<string, number>;
  auditEvents: string[];
}

export interface AiAutomationJob {
  jobName:
    | "tier4.ocr.process"
    | "tier4.image.analyze"
    | "tier4.duplicate.scan"
    | "tier4.catalog.generate"
    | "tier4.whatsapp.parse"
    | "tier4.spoilage.predict"
    | "tier4.seller.suggest";
  queueName: string;
  idempotencyKey: string;
  replaySafe: boolean;
  maxAttempts: number;
  payload: Record<string, string | number | boolean>;
}

export interface AiCommerceAutomationInput {
  text?: string;
  image?: {
    id: string;
    width: number;
    height: number;
    blurScore?: number;
    brightnessScore?: number;
    compressionScore?: number;
    perceptualSeed?: string;
    detectedText?: string[];
  };
  seller?: Vendor;
  products: Product[];
  locality?: string;
  source: AiIngestionSource;
  now?: Date;
}

export interface AiCommerceAutomationSnapshot {
  generatedAt: string;
  ocr: OcrDocumentIntelligence;
  whatsapp: WhatsappCommerceEvent;
  productMatches: AiProductMatch[];
  catalogDrafts: AiCatalogDraft[];
  imageAnalysis?: AiImageAnalysis;
  duplicateClusters: Array<{ clusterId: string; productIds: string[]; confidence: number; reason: string }>;
  sellerSuggestions: AiSellerSuggestion[];
  voiceFoundation: { transcript: string; intent: CommerceIntent; matchConfidence: number; languageHints: string[] };
  searchExpansion: { query: string; expandedTerms: string[]; intent: string; confidence: number };
  dataCleanup: Array<{ targetId: string; issue: string; suggestedFix: string; confidence: number }>;
  operationalIntelligence: Array<{ domain: "demand" | "seller" | "delivery" | "locality" | "fraud"; title: string; risk: RiskLevel; confidence: number }>;
  safety: AiSafetyAssessment;
  moderationReviews: Array<{ reviewId: string; subjectType: string; subjectId: string; state: AiModerationState; reason: string }>;
  asyncJobs: AiAutomationJob[];
  embeddings: {
    documentVectors: string[];
    imageVectors: string[];
    productMatchVectors: string[];
    sellerAssistVectors: string[];
    operationalVectors: string[];
  };
}
