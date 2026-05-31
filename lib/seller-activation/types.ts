// MCP-1A — Seller Activation engine domain types.
//
// Deterministic + pure. Operates on real marketplace shapes (vendors, products)
// and reuses the MCP-0B catalog ingestion/generator engine for product
// population. Runs identically on live Supabase data and on the clearly-labelled
// deterministic sample (queries.ts sets sampled: true).

export type Tone = "healthy" | "watch" | "degraded" | "critical";
export type Severity = "info" | "opportunity" | "watch" | "warning" | "critical";

// ── Onboarding ────────────────────────────────────────────────────────────────

export type OnboardingStepId =
  | "registration"
  | "email_verification"
  | "phone_verification"
  | "store_creation"
  | "business_info"
  | "gst_info"
  | "address_info"
  | "bank_info"
  | "identity_verification"
  | "document_upload"
  | "store_branding"
  | "store_configuration"
  | "submission";

export interface OnboardingStepDef {
  id: OnboardingStepId;
  title: string;
  description: string;
  /** Fields (dot paths into SellerApplication.data) required to complete the step. */
  requiredFields: string[];
  optional?: boolean;
}

export type ApplicationState =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "active";

export interface SellerApplicationData {
  // registration
  ownerName?: string;
  email?: string;
  phone?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  // store
  storeName?: string;
  storeSlug?: string;
  category?: string;
  // business
  businessName?: string;
  businessType?: "individual" | "proprietorship" | "partnership" | "private_limited" | "llp";
  // gst
  gstin?: string;
  gstExempt?: boolean;
  // address
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  // bank
  accountNumber?: string;
  ifsc?: string;
  accountHolder?: string;
  // identity / documents
  panNumber?: string;
  documents?: UploadedDocument[];
  // branding
  logoUrl?: string;
  bannerUrl?: string;
  tagline?: string;
  // configuration
  fulfillmentModel?: "self" | "marketplace" | "hybrid";
  returnsAccepted?: boolean;
}

export interface UploadedDocument {
  id: string;
  kind: DocumentKind;
  fileName: string;
  uploadedAt: string;
}

export type DocumentKind = "pan" | "gst_certificate" | "bank_proof" | "identity" | "business_proof" | "address_proof";

export interface SellerApplication {
  id: string;
  ownerId: string;
  state: ApplicationState;
  data: SellerApplicationData;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewerId?: string;
  rejectionReason?: string;
  events: ApplicationEvent[];
}

export interface ApplicationEvent {
  id: string;
  from: ApplicationState;
  to: ApplicationState;
  actor: "seller" | "admin" | "system";
  note: string;
  at: string;
}

export interface StepStatus {
  id: OnboardingStepId;
  title: string;
  complete: boolean;
  missing: string[];
}

export interface OnboardingProgress {
  steps: StepStatus[];
  completedSteps: number;
  totalSteps: number;
  percent: number; // 0..100
  readyToSubmit: boolean;
  nextStep: OnboardingStepId | null;
  blockers: string[];
}

// ── Verification / KYC ──────────────────────────────────────────────────────────

export type VerificationCheckId = "identity" | "business" | "bank" | "document";
export type CheckState = "pending" | "passed" | "failed" | "manual_review";

export interface VerificationCheck {
  id: VerificationCheckId;
  label: string;
  state: CheckState;
  detail: string;
}

export type RiskFlagKind =
  | "missing_gstin"
  | "invalid_gstin"
  | "invalid_pan"
  | "invalid_ifsc"
  | "name_mismatch"
  | "incomplete_documents"
  | "duplicate_bank"
  | "high_value_unverified";

export interface RiskFlag {
  kind: RiskFlagKind;
  severity: Severity;
  message: string;
}

export type VerificationDecision = "auto_approve" | "manual_review" | "reject";

export interface VerificationCase {
  applicationId: string;
  checks: VerificationCheck[];
  riskFlags: RiskFlag[];
  riskScore: number; // 0..100 (higher = riskier)
  trustContribution: number; // 0..100 contribution to seller trust score
  decision: VerificationDecision;
  escalated: boolean;
}

// ── Product population (over MCP-0B ingestion) ───────────────────────────────────

export type ImportSource = "csv" | "json" | "single" | "generated";
export type ImportState = "parsed" | "validated" | "published" | "partial" | "failed";

export interface ImportJob {
  id: string;
  sellerId: string;
  source: ImportSource;
  state: ImportState;
  createdAt: string;
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  warnings: number;
  publishable: number;
  averageQuality: number;
  /** Refs of rows that can be retried (invalid/duplicate). */
  recoverableRefs: string[];
}

export interface ImportHistoryEntry {
  jobId: string;
  sellerId: string;
  source: ImportSource;
  at: string;
  published: number;
  rejected: number;
  state: ImportState;
}

export interface ImportTemplateColumn {
  key: string;
  label: string;
  required: boolean;
  example: string;
}

// ── Storefront ───────────────────────────────────────────────────────────────

export interface StorefrontProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl?: string;
  category: string;
  inStock: boolean;
}

export interface StorefrontPolicies {
  returns: string;
  shipping: string;
  cancellation: string;
}

export interface Storefront {
  sellerId: string;
  slug: string;
  name: string;
  tagline: string;
  logoUrl?: string;
  bannerUrl?: string;
  verified: boolean;
  rating: number; // 0..5
  reviewCount: number;
  trustScore: number; // 0..100
  productCount: number;
  categories: string[];
  policies: StorefrontPolicies;
  products: StorefrontProduct[];
  metrics: StorefrontMetrics;
}

export interface StorefrontMetrics {
  fulfillmentRate: number; // 0..100
  onTimeRate: number; // 0..100
  responseHours: number;
  cancellationRate: number; // 0..100
}

// ── Seller activation center ─────────────────────────────────────────────────

export interface ActivationTask {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  href: string;
  done: boolean;
}

export interface SellerActivationSnapshot {
  sellerId: string;
  storeName: string;
  onboarding: OnboardingProgress;
  verification: { score: number; decision: VerificationDecision; passed: number; total: number; escalated: boolean };
  catalog: { products: number; published: number; averageQuality: number; health: number };
  storeHealth: number; // 0..100
  trustScore: number; // 0..100
  activationScore: number; // 0..100 overall readiness
  stage: ActivationStage;
  tasks: ActivationTask[];
  briefing: string[];
}

export type ActivationStage = "registering" | "verifying" | "building_catalog" | "ready" | "active";

// ── Admin seller governance ──────────────────────────────────────────────────

export type QueueKind =
  | "seller_review"
  | "store_approval"
  | "verification"
  | "catalog_approval"
  | "risk"
  | "escalation";

export interface GovernanceQueueItem {
  id: string;
  sellerId: string;
  sellerName: string;
  queue: QueueKind;
  severity: Severity;
  summary: string;
  ageHours: number;
}

export interface GovernanceQueue {
  kind: QueueKind;
  label: string;
  items: GovernanceQueueItem[];
}

export interface SellerGovernanceSnapshot {
  queues: GovernanceQueue[];
  totalPending: number;
  marketplaceHealth: number; // 0..100
  tone: Tone;
  sellers: number;
  activeSellers: number;
  pendingVerification: number;
  flaggedSellers: number;
}

// ── Marketplace population operations ────────────────────────────────────────

export interface PopulationFunnel {
  registered: number;
  verified: number;
  withCatalog: number;
  active: number;
  registeredToVerified: number; // 0..100
  verifiedToCatalog: number; // 0..100
  catalogToActive: number; // 0..100
}

export interface PopulationKpis {
  sellers: number;
  activeSellers: number;
  products: number;
  publishedProducts: number;
  categoriesCovered: number;
  averageProductsPerSeller: number;
  averageCatalogQuality: number;
  sellerActivationRate: number; // 0..100
  catalogFillRate: number; // 0..100
}

export interface MarketplacePopulationSnapshot {
  funnel: PopulationFunnel;
  kpis: PopulationKpis;
  capacity: { sellerTarget: number; productTarget: number; sellerProgress: number; productProgress: number };
  tone: Tone;
  expansion: Array<{ category: string; products: number; sellers: number; coverage: number }>;
}

// ── Activation intelligence ──────────────────────────────────────────────────

export type ActivationRecommendationKind =
  | "seller_growth"
  | "catalog"
  | "activation"
  | "population"
  | "expansion"
  | "trust";

export interface ActivationRecommendation {
  id: string;
  kind: ActivationRecommendationKind;
  scope: "seller" | "marketplace";
  refId: string;
  severity: Severity;
  title: string;
  detail: string;
  action: string;
  score: number; // 0..100
}
