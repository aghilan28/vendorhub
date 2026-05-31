// MCP-1D — Customer Acquisition, Growth, Retention, Loyalty & Demand engine
// (public surface).
//
// Customer identity, loyalty, referral, campaigns, engagement, personalization,
// recommendations and growth intelligence — deterministic and degrade-safe.

export * from "./types";

// Identity
export {
  buildCustomerIdentity,
  computeProfileCompletion,
  deriveLifecycle,
  computeValueScore,
  deriveSegment,
} from "./identity";

// Loyalty
export {
  TIER_CONFIG,
  REDEMPTION_CATALOG,
  pointsForOrder,
  tierForLifetimePoints,
  reduceLedger,
  redeemReward,
  buildLoyaltyAccount,
  type LedgerTotals,
  type RedemptionResult,
} from "./loyalty";

// Referral
export {
  generateReferralCode,
  assessReferral,
  attributeReferrals,
  buildReferralLeaderboard,
  buildReferralSummary,
  type ReferralAttribution,
} from "./referral";

// Campaigns
export {
  validateCampaign,
  buildCampaignReport,
  buildCampaignPortfolio,
  type CampaignPortfolio,
} from "./campaigns";

// Engagement
export {
  buildActivityFeed,
  buildEngagementAnalytics,
  planReengagement,
  type PlannedDelivery,
} from "./engagement";

// Personalization
export {
  buildPersonalizationProfile,
  personalizeRanking,
  type BehaviorSignal,
} from "./personalization";

// Recommendations
export {
  buildRecommendations,
  type ProductCandidate,
  type StoreCandidate,
  type RecommendationContext,
} from "./recommendations";

// Growth intelligence
export {
  assessChurn,
  buildSegmentInsights,
  buildGrowthIntelligence,
  type GrowthIntelligenceInput,
} from "./intelligence";

// Sample
export {
  SAMPLE_CUSTOMER_ID,
  SAMPLE_PROFILE,
  SAMPLE_CUSTOMERS,
  SAMPLE_NAMES,
  SAMPLE_LEDGER,
  SAMPLE_REFERRALS,
  SAMPLE_CAMPAIGNS,
  SAMPLE_ENGAGEMENT,
  SAMPLE_BEHAVIOR,
  SAMPLE_PRODUCTS,
  SAMPLE_STORES_REC,
  SAMPLE_RECENTLY_VIEWED,
  SAMPLE_ABANDONED_CART,
  SAMPLE_DEMAND_CELLS,
} from "./sample";

import { buildCampaignPortfolio, buildCampaignReport } from "./campaigns";
import { buildActivityFeed, buildEngagementAnalytics } from "./engagement";
import { buildCustomerIdentity } from "./identity";
import { buildGrowthIntelligence } from "./intelligence";
import { buildLoyaltyAccount } from "./loyalty";
import { buildPersonalizationProfile } from "./personalization";
import { buildRecommendations } from "./recommendations";
import { buildReferralSummary } from "./referral";
import {
  SAMPLE_ABANDONED_CART,
  SAMPLE_BEHAVIOR,
  SAMPLE_CAMPAIGNS,
  SAMPLE_CUSTOMERS,
  SAMPLE_DEMAND_CELLS,
  SAMPLE_ENGAGEMENT,
  SAMPLE_LEDGER,
  SAMPLE_PRODUCTS,
  SAMPLE_PROFILE,
  SAMPLE_RECENTLY_VIEWED,
  SAMPLE_REFERRALS,
  SAMPLE_STORES_REC,
} from "./sample";
import type {
  AdminGrowthSnapshot,
  CampaignInput,
  CustomerGrowthSnapshot,
  CustomerProfileInput,
  EngagementEventInput,
  LoyaltyTier,
  ReferralRecord,
  RewardLedgerEntry,
  Tone,
} from "./types";
import type { BehaviorSignal } from "./personalization";

export interface CustomerGrowthInput {
  profile: CustomerProfileInput;
  ledger: RewardLedgerEntry[];
  referrals: ReferralRecord[];
  behavior: BehaviorSignal[];
  engagement: EngagementEventInput[];
  campaigns: CampaignInput[];
  demandCells?: Array<{ pincode: string; demand: number; stores: number }>;
}

/** Build the buyer Customer Growth Center snapshot for one customer. */
export function buildCustomerGrowthSnapshot(input: CustomerGrowthInput): CustomerGrowthSnapshot {
  const identity = buildCustomerIdentity(input.profile);
  const loyalty = buildLoyaltyAccount(input.profile.customerId, input.ledger);
  const referral = buildReferralSummary(input.profile.customerId, input.referrals);
  const personalization = buildPersonalizationProfile(input.profile.customerId, input.behavior, input.profile.interests ?? []);
  const recommendations = buildRecommendations(SAMPLE_PRODUCTS, SAMPLE_STORES_REC, {
    customerId: input.profile.customerId,
    categoryAffinity: personalization.categoryAffinity,
    recentlyViewed: SAMPLE_RECENTLY_VIEWED,
    cartCategories: input.profile.preferredCategories,
    abandonedCart: SAMPLE_ABANDONED_CART,
  });
  const engagement = buildActivityFeed(input.engagement, input.profile.customerId);

  const activeCampaigns = input.campaigns
    .filter((c) => c.status === "active")
    .filter((c) => c.audience.includes("all") || c.audience.includes(identity.segment))
    .map(buildCampaignReport);

  const intelligence = buildGrowthIntelligence({
    customers: [input.profile],
    referralConversion: referral.conversionRate,
    activeCampaigns: activeCampaigns.length,
    demandCells: input.demandCells,
  });
  const opportunities = intelligence.recommendations.filter((r) => r.scope === "customer" || r.kind === "referral_opportunity").slice(0, 5);

  const briefing = [
    `Welcome ${identity.name} — ${identity.lifecycle.replace(/_/g, " ")} customer, value score ${identity.valueScore}/100.`,
    `Loyalty: ${loyalty.tier} tier, ${loyalty.pointsBalance} pts${loyalty.pointsToNextTier ? ` (${loyalty.pointsToNextTier} to ${loyalty.nextTier})` : " (top tier)"}.`,
    referral.total ? `Referrals: ${referral.rewarded} rewarded of ${referral.total} (${referral.pointsEarned} pts).` : "Invite a friend to start earning referral rewards.",
    loyalty.pointsExpiringSoon ? `${loyalty.pointsExpiringSoon} points expire within 30 days — redeem soon.` : `Profile ${identity.completion.score}% complete.`,
  ];

  return { identity, loyalty, referral, personalization, recommendations, engagement, activeCampaigns, opportunities, briefing };
}

/** Build the buyer snapshot from the labelled sample (preview). */
export function buildSampleCustomerGrowthSnapshot(): CustomerGrowthSnapshot {
  return buildCustomerGrowthSnapshot({
    profile: SAMPLE_PROFILE,
    ledger: SAMPLE_LEDGER,
    referrals: SAMPLE_REFERRALS,
    behavior: SAMPLE_BEHAVIOR,
    engagement: SAMPLE_ENGAGEMENT,
    campaigns: SAMPLE_CAMPAIGNS,
    demandCells: SAMPLE_DEMAND_CELLS,
  });
}

export interface AdminGrowthInput {
  customers: CustomerProfileInput[];
  ledgers?: Record<string, RewardLedgerEntry[]>;
  referrals: ReferralRecord[];
  campaigns: CampaignInput[];
  engagement: EngagementEventInput[];
  demandCells?: Array<{ pincode: string; demand: number; stores: number }>;
}

function adminTone(retentionRate: number, intelligenceTone: Tone): Tone {
  if (intelligenceTone === "critical" || retentionRate < 50) return "critical";
  if (intelligenceTone === "degraded" || retentionRate < 65) return "degraded";
  if (intelligenceTone === "watch" || retentionRate < 80) return "watch";
  return "healthy";
}

/** Build the Admin Growth Operations snapshot across the customer base. */
export function buildAdminGrowthSnapshot(input: AdminGrowthInput): AdminGrowthSnapshot {
  const identities = input.customers.map(buildCustomerIdentity);
  const customers = identities.length;
  const activeCustomers = identities.filter((i) => i.lifecycle === "active" || i.lifecycle === "loyal" || i.lifecycle === "reactivated").length;
  const newCustomers = identities.filter((i) => i.lifecycle === "new").length;
  const atRiskCustomers = identities.filter((i) => i.lifecycle === "at_risk" || i.lifecycle === "dormant").length;
  const churnedCustomers = identities.filter((i) => i.lifecycle === "churned").length;
  const retentionRate = customers ? Math.round(((customers - churnedCustomers - atRiskCustomers) / customers) * 100) : 0;

  // Loyalty tier distribution (use provided ledgers, else derive a tier from value score)
  const tiers: LoyaltyTier[] = ["bronze", "silver", "gold", "platinum"];
  const tierCounts = new Map<LoyaltyTier, number>(tiers.map((t) => [t, 0]));
  let loyaltyMembers = 0;
  for (const c of input.customers) {
    const ledger = input.ledgers?.[c.customerId];
    let tier: LoyaltyTier = "bronze";
    if (ledger) {
      tier = buildLoyaltyAccount(c.customerId, ledger).tier;
      loyaltyMembers += 1;
    } else {
      const vs = buildCustomerIdentity(c).valueScore;
      tier = vs >= 80 ? "platinum" : vs >= 60 ? "gold" : vs >= 35 ? "silver" : "bronze";
      if ((c.activity?.orders ?? 0) > 0) loyaltyMembers += 1;
    }
    tierCounts.set(tier, (tierCounts.get(tier) ?? 0) + 1);
  }
  const tierDistribution = tiers.map((tier) => ({ tier, customers: tierCounts.get(tier) ?? 0 }));

  // Referral roll-up (aggregate per-referrer summaries so status is computed once by the engine)
  const totalReferrals = input.referrals.length;
  const allReferrers = Array.from(new Set(input.referrals.map((r) => r.referrerId)));
  let rewardedCount = 0;
  let flagged = 0;
  let conversionAcc = 0;
  for (const ref of allReferrers) {
    const summary = buildReferralSummary(ref, input.referrals);
    rewardedCount += summary.rewarded;
    flagged += summary.flagged;
    conversionAcc += summary.conversionRate;
  }
  const conversionRate = allReferrers.length ? Math.round(conversionAcc / allReferrers.length) : 0;

  const campaigns = buildCampaignPortfolio(input.campaigns).reports;
  const engagement = buildEngagementAnalytics(input.engagement);

  const intelligence = buildGrowthIntelligence({
    customers: input.customers,
    referralConversion: conversionRate,
    activeCampaigns: campaigns.filter((c) => c.status === "active").length,
    demandCells: input.demandCells,
  });

  return {
    customers,
    activeCustomers,
    newCustomers,
    atRiskCustomers,
    retentionRate,
    loyaltyMembers,
    tierDistribution,
    referral: { total: totalReferrals, rewarded: rewardedCount, flagged, conversionRate },
    campaigns,
    engagement,
    segments: intelligence.segments,
    intelligence,
    demandForecast: intelligence.demandForecast,
    tone: adminTone(retentionRate, intelligence.tone),
  };
}

/** Build the admin snapshot from the labelled sample (preview). */
export function buildSampleAdminGrowthSnapshot(): AdminGrowthSnapshot {
  return buildAdminGrowthSnapshot({
    customers: SAMPLE_CUSTOMERS,
    referrals: SAMPLE_REFERRALS,
    campaigns: SAMPLE_CAMPAIGNS,
    engagement: SAMPLE_ENGAGEMENT,
    demandCells: SAMPLE_DEMAND_CELLS,
  });
}
