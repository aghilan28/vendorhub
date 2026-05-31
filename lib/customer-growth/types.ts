// MCP-1D — Customer Acquisition, Growth, Retention, Loyalty & Demand engine.
//
// Deterministic + pure domain types. Every engine runs identically on live data
// and the clearly-labelled sample (sampled: true). No side effects, no I/O.

export type Tone = "healthy" | "watch" | "degraded" | "critical";
export type Severity = "info" | "opportunity" | "watch" | "warning" | "critical";

// ── Customer identity ─────────────────────────────────────────────────────────

export type LifecycleStage =
  | "visitor"
  | "new"
  | "active"
  | "loyal"
  | "at_risk"
  | "dormant"
  | "churned"
  | "reactivated";

export type CustomerSegment =
  | "vip"
  | "loyal"
  | "promising"
  | "new"
  | "bargain"
  | "at_risk"
  | "dormant";

export interface CustomerActivity {
  orders: number;
  totalSpend: number; // currency units
  lastOrderDaysAgo: number | null; // null = never ordered
  firstOrderDaysAgo: number | null;
  avgOrderValue?: number;
  reviews?: number;
  returns?: number;
  sessionsLast30?: number;
  wishlistItems?: number;
}

export interface CustomerProfileInput {
  customerId: string;
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  pincode?: string;
  joinedDaysAgo?: number;
  interests?: string[]; // category/brand keywords
  preferredCategories?: string[];
  preferredStores?: string[];
  savedAddresses?: number;
  savedStores?: number;
  savedProducts?: number;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  activity?: CustomerActivity;
}

export interface ProfileCompletion {
  score: number; // 0..100
  completedFields: string[];
  missingFields: string[];
  nextBestField: string | null;
}

export interface CustomerIdentity {
  customerId: string;
  name: string;
  completion: ProfileCompletion;
  lifecycle: LifecycleStage;
  segment: CustomerSegment;
  valueScore: number; // 0..100
  trustIndicators: string[];
  accountHealth: number; // 0..100
  recency: number | null; // days
  frequency: number; // orders
  monetary: number; // spend
}

// ── Loyalty ───────────────────────────────────────────────────────────────────

export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

export type RewardLedgerReason =
  | "order"
  | "review"
  | "referral"
  | "campaign"
  | "signup"
  | "redemption"
  | "expiration"
  | "adjustment";

export interface RewardLedgerEntry {
  id: string;
  customerId: string;
  points: number; // positive = earn, negative = spend/expire
  reason: RewardLedgerReason;
  refId?: string;
  daysAgo: number; // when it happened
  expiresInDays?: number; // for earn entries
  note?: string;
}

export interface RewardRedemptionOption {
  id: string;
  label: string;
  pointsCost: number;
  valueLabel: string;
  kind: "coupon" | "free_delivery" | "cashback" | "gift";
  minTier?: LoyaltyTier;
}

export interface LoyaltyTierConfig {
  tier: LoyaltyTier;
  minPoints: number;
  pointsPerCurrency: number; // earn multiplier
  perks: string[];
}

export interface LoyaltyAccount {
  customerId: string;
  tier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  pointsBalance: number;
  pointsEarnedLifetime: number;
  pointsSpentLifetime: number;
  pointsExpired: number;
  pointsExpiringSoon: number; // within 30 days
  pointsToNextTier: number | null;
  tierProgress: number; // 0..100 toward next tier
  perks: string[];
  redeemable: RewardRedemptionOption[];
}

// ── Referral ──────────────────────────────────────────────────────────────────

export type ReferralStatus = "pending" | "qualified" | "rewarded" | "rejected" | "flagged";

export interface ReferralRecord {
  id: string;
  referrerId: string;
  refereeId?: string;
  code: string;
  status: ReferralStatus;
  createdDaysAgo: number;
  refereeOrders?: number;
  refereeSpend?: number;
  rewardPoints?: number;
  ipHash?: string;
  sameDevice?: boolean; // fraud signal
}

export interface ReferralFraudCheck {
  id: string;
  passed: boolean;
  detail: string;
}

export interface ReferralAssessment {
  referralId: string;
  status: ReferralStatus;
  fraudScore: number; // 0..100 (higher = riskier)
  checks: ReferralFraudCheck[];
  rewardPoints: number;
  reason: string;
}

export interface ReferralCode {
  code: string;
  link: string;
}

export interface ReferralLeaderboardEntry {
  referrerId: string;
  name: string;
  qualified: number;
  rewarded: number;
  pointsEarned: number;
  rank: number;
}

export interface ReferralSummary {
  code: ReferralCode;
  total: number;
  pending: number;
  qualified: number;
  rewarded: number;
  flagged: number;
  pointsEarned: number;
  conversionRate: number; // 0..100
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export type CampaignType =
  | "coupon"
  | "discount"
  | "category"
  | "store"
  | "location"
  | "hyperlocal"
  | "seasonal";

export type CampaignStatus = "draft" | "scheduled" | "active" | "paused" | "completed" | "archived";

export type AudienceSegment = CustomerSegment | "all";

export interface CampaignInput {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  audience: AudienceSegment[];
  startDaysAgo: number; // negative = future
  durationDays: number;
  discountPercent?: number;
  budget?: number;
  targetPincodes?: string[];
  targetCategories?: string[];
  targetStores?: string[];
  // measured (when live)
  impressions?: number;
  clicks?: number;
  redemptions?: number;
  revenue?: number;
  spend?: number;
}

export interface CampaignValidation {
  valid: boolean;
  issues: string[];
  warnings: string[];
}

export interface CampaignReport {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  audience: AudienceSegment[];
  scheduledLabel: string;
  ctr: number; // 0..100
  conversionRate: number; // 0..100
  roas: number; // revenue / spend
  reach: number;
  redemptions: number;
  revenue: number;
  spend: number;
  tone: Tone;
  validation: CampaignValidation;
}

// ── Engagement ────────────────────────────────────────────────────────────────

export type EngagementChannel = "push" | "email" | "in_app";

export type AlertKind =
  | "price_drop"
  | "restock"
  | "store"
  | "order"
  | "reward"
  | "referral"
  | "campaign"
  | "announcement";

export interface EngagementEventInput {
  id: string;
  customerId: string;
  kind: AlertKind;
  channel: EngagementChannel;
  daysAgo: number;
  delivered?: boolean;
  opened?: boolean;
  clicked?: boolean;
  title?: string;
  body?: string;
}

export interface EngagementMessage {
  id: string;
  kind: AlertKind;
  channel: EngagementChannel;
  title: string;
  body: string;
  daysAgo: number;
  read: boolean;
}

export interface EngagementAnalytics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  deliveryRate: number; // 0..100
  openRate: number; // 0..100
  clickRate: number; // 0..100
  byChannel: Array<{ channel: EngagementChannel; sent: number; openRate: number }>;
  tone: Tone;
}

// ── Personalization ───────────────────────────────────────────────────────────

export interface AffinityScore {
  key: string;
  label: string;
  score: number; // 0..100
}

export interface PersonalizationProfile {
  customerId: string;
  categoryAffinity: AffinityScore[];
  brandAffinity: AffinityScore[];
  storeAffinity: AffinityScore[];
  locationAffinity: AffinityScore[];
  topInterests: string[];
  personalizationScore: number; // 0..100 (data richness)
}

// ── Recommendations ───────────────────────────────────────────────────────────

export type RecommendationKind =
  | "recommended_product"
  | "recommended_store"
  | "trending_product"
  | "trending_store"
  | "nearby"
  | "similar"
  | "cross_sell"
  | "up_sell"
  | "recently_viewed"
  | "continue_shopping";

export interface RecommendationItem {
  id: string;
  kind: RecommendationKind;
  refId: string;
  title: string;
  reason: string;
  score: number; // 0..100
  price?: number;
  category?: string;
}

export interface RecommendationSet {
  customerId: string;
  items: RecommendationItem[];
  byKind: Record<string, number>;
  coverage: number; // 0..100 (distinct kinds present / total)
}

// ── Growth intelligence ───────────────────────────────────────────────────────

export type GrowthRecommendationKind =
  | "retention_risk"
  | "churn_risk"
  | "growth_opportunity"
  | "campaign_opportunity"
  | "referral_opportunity"
  | "demand_forecast"
  | "segment_insight"
  | "hyperlocal_demand";

export interface GrowthRecommendation {
  id: string;
  kind: GrowthRecommendationKind;
  scope: "customer" | "segment" | "marketplace" | "zone";
  refId: string;
  severity: Severity;
  title: string;
  detail: string;
  action: string;
  score: number; // 0..100
}

export interface ChurnAssessment {
  customerId: string;
  name: string;
  churnRisk: number; // 0..100
  band: "low" | "medium" | "high";
  lifecycle: LifecycleStage;
  drivers: string[];
  retentionAction: string;
}

export interface SegmentInsight {
  segment: CustomerSegment;
  customers: number;
  revenue: number;
  avgValueScore: number;
  churnRisk: number; // 0..100 avg
  share: number; // 0..100 of customers
}

export interface GrowthIntelligence {
  recommendations: GrowthRecommendation[];
  churn: ChurnAssessment[];
  segments: SegmentInsight[];
  retentionRisks: number;
  churnRisks: number;
  growthOpportunities: number;
  demandForecast: number; // projected orders next 30d
  tone: Tone;
}

// ── Snapshots for surfaces ────────────────────────────────────────────────────

export interface CustomerGrowthSnapshot {
  identity: CustomerIdentity;
  loyalty: LoyaltyAccount;
  referral: ReferralSummary;
  personalization: PersonalizationProfile;
  recommendations: RecommendationSet;
  engagement: EngagementMessage[];
  activeCampaigns: CampaignReport[];
  opportunities: GrowthRecommendation[];
  briefing: string[];
}

export interface AdminGrowthSnapshot {
  customers: number;
  activeCustomers: number;
  newCustomers: number;
  atRiskCustomers: number;
  retentionRate: number; // 0..100
  loyaltyMembers: number;
  tierDistribution: Array<{ tier: LoyaltyTier; customers: number }>;
  referral: { total: number; rewarded: number; flagged: number; conversionRate: number };
  campaigns: CampaignReport[];
  engagement: EngagementAnalytics;
  segments: SegmentInsight[];
  intelligence: GrowthIntelligence;
  demandForecast: number;
  tone: Tone;
}
