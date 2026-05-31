import { describe, expect, it } from "vitest";
import {
  // identity
  buildCustomerIdentity,
  computeProfileCompletion,
  deriveLifecycle,
  computeValueScore,
  // loyalty
  pointsForOrder,
  tierForLifetimePoints,
  reduceLedger,
  redeemReward,
  buildLoyaltyAccount,
  REDEMPTION_CATALOG,
  // referral
  generateReferralCode,
  assessReferral,
  attributeReferrals,
  buildReferralLeaderboard,
  buildReferralSummary,
  // campaigns
  validateCampaign,
  buildCampaignReport,
  buildCampaignPortfolio,
  // engagement
  buildActivityFeed,
  buildEngagementAnalytics,
  planReengagement,
  // personalization
  buildPersonalizationProfile,
  personalizeRanking,
  // recommendations
  buildRecommendations,
  // intelligence
  assessChurn,
  buildSegmentInsights,
  buildGrowthIntelligence,
  // assemblers
  buildCustomerGrowthSnapshot,
  buildSampleCustomerGrowthSnapshot,
  buildSampleAdminGrowthSnapshot,
  // sample
  SAMPLE_PROFILE,
  SAMPLE_CUSTOMERS,
  SAMPLE_LEDGER,
  SAMPLE_REFERRALS,
  SAMPLE_CAMPAIGNS,
  SAMPLE_ENGAGEMENT,
  SAMPLE_BEHAVIOR,
  SAMPLE_PRODUCTS,
  SAMPLE_STORES_REC,
  SAMPLE_DEMAND_CELLS,
  SAMPLE_NAMES,
} from "@/lib/customer-growth";
import type { CampaignInput, CustomerProfileInput, ReferralRecord } from "@/lib/customer-growth";

describe("MCP-1D.2 customer identity", () => {
  it("computes profile completion with a next-best field", () => {
    const completion = computeProfileCompletion(SAMPLE_PROFILE);
    expect(completion.score).toBeGreaterThan(70);
    const empty = computeProfileCompletion({ customerId: "x" });
    expect(empty.score).toBeLessThan(20);
    expect(empty.nextBestField).toBeTruthy();
    expect(empty.missingFields.length).toBeGreaterThan(0);
  });

  it("derives lifecycle stages from recency/frequency", () => {
    expect(deriveLifecycle({ orders: 0, totalSpend: 0, lastOrderDaysAgo: null, firstOrderDaysAgo: null }, 5)).toBe("new");
    expect(deriveLifecycle({ orders: 0, totalSpend: 0, lastOrderDaysAgo: null, firstOrderDaysAgo: null }, 200)).toBe("visitor");
    expect(deriveLifecycle({ orders: 8, totalSpend: 20000, lastOrderDaysAgo: 10, firstOrderDaysAgo: 200 })).toBe("loyal");
    expect(deriveLifecycle({ orders: 3, totalSpend: 5000, lastOrderDaysAgo: 70, firstOrderDaysAgo: 180 })).toBe("at_risk");
    expect(deriveLifecycle({ orders: 4, totalSpend: 6000, lastOrderDaysAgo: 200, firstOrderDaysAgo: 400 })).toBe("churned");
  });

  it("computes a bounded value score and segment", () => {
    const vs = computeValueScore(SAMPLE_PROFILE.activity);
    expect(vs).toBeGreaterThanOrEqual(0);
    expect(vs).toBeLessThanOrEqual(100);
    const identity = buildCustomerIdentity(SAMPLE_PROFILE);
    expect(identity.name).toBe("Aarav Sharma");
    expect(["vip", "loyal", "promising", "new", "bargain", "at_risk", "dormant"]).toContain(identity.segment);
    expect(identity.accountHealth).toBeGreaterThanOrEqual(0);
    // never-ordered customer has value score 0
    expect(computeValueScore({ orders: 0, totalSpend: 0, lastOrderDaysAgo: null, firstOrderDaysAgo: null })).toBe(0);
  });
});

describe("MCP-1D.3 loyalty engine", () => {
  it("earns points by tier multiplier", () => {
    expect(pointsForOrder(1000, "bronze")).toBe(10);
    expect(pointsForOrder(1000, "gold")).toBe(15);
    expect(pointsForOrder(1000, "platinum")).toBe(20);
  });

  it("maps lifetime points to the right tier", () => {
    expect(tierForLifetimePoints(0)).toBe("bronze");
    expect(tierForLifetimePoints(1500)).toBe("silver");
    expect(tierForLifetimePoints(8000)).toBe("gold");
    expect(tierForLifetimePoints(20000)).toBe("platinum");
  });

  it("reduces a ledger into balances incl. expiring-soon", () => {
    const totals = reduceLedger(SAMPLE_LEDGER);
    expect(totals.balance).toBeGreaterThan(0);
    expect(totals.earnedLifetime).toBeGreaterThan(totals.balance);
    expect(totals.spentLifetime).toBe(500);
    expect(totals.expiringSoon).toBeGreaterThanOrEqual(900); // rl-7 expires in 20 days
  });

  it("builds a loyalty account with tier progress", () => {
    const account = buildLoyaltyAccount(SAMPLE_PROFILE.customerId, SAMPLE_LEDGER);
    expect(account.pointsBalance).toBeGreaterThan(0);
    expect(["bronze", "silver", "gold", "platinum"]).toContain(account.tier);
    expect(account.tierProgress).toBeGreaterThanOrEqual(0);
    expect(account.tierProgress).toBeLessThanOrEqual(100);
    expect(account.redeemable.length).toBeGreaterThan(0);
  });

  it("guards redemption by balance and tier", () => {
    const account = { customerId: "c", pointsBalance: 400, tier: "bronze" as const };
    const cheap = REDEMPTION_CATALOG.find((o) => o.id === "rd-free-del")!;
    const ok = redeemReward(cheap, account);
    expect(ok.ok).toBe(true);
    expect(ok.newBalance).toBe(100);

    const expensive = REDEMPTION_CATALOG.find((o) => o.id === "rd-150")!;
    const broke = redeemReward(expensive, account);
    expect(broke.ok).toBe(false);

    const gated = redeemReward(REDEMPTION_CATALOG.find((o) => o.id === "rd-cashback")!, { customerId: "c", pointsBalance: 99999, tier: "bronze" });
    expect(gated.ok).toBe(false);
    expect(gated.reason).toMatch(/tier/i);
  });
});

describe("MCP-1D.4 referral platform", () => {
  it("generates a deterministic referral code + link", () => {
    const a = generateReferralCode("user-123");
    const b = generateReferralCode("user-123");
    expect(a.code).toBe(b.code);
    expect(a.code.startsWith("VH")).toBe(true);
    expect(a.link).toContain(a.code);
    expect(generateReferralCode("other").code).not.toBe(a.code);
  });

  it("rewards a qualified referral and flags fraud", () => {
    const good: ReferralRecord = { id: "r1", referrerId: "u1", refereeId: "u2", code: "VH", status: "pending", createdDaysAgo: 30, refereeOrders: 1, refereeSpend: 500 };
    const assessed = assessReferral(good);
    expect(assessed.status).toBe("rewarded");
    expect(assessed.rewardPoints).toBeGreaterThan(0);

    const fraud: ReferralRecord = { id: "r2", referrerId: "u1", refereeId: "u1", code: "VH", status: "pending", createdDaysAgo: 1, sameDevice: true, refereeOrders: 1, refereeSpend: 500 };
    const flagged = assessReferral(fraud);
    expect(flagged.status).toBe("flagged");
    expect(flagged.fraudScore).toBeGreaterThanOrEqual(60);
  });

  it("attributes and ranks referrers", () => {
    const attribution = attributeReferrals(SAMPLE_REFERRALS);
    expect(attribution.length).toBeGreaterThan(0);
    const leaderboard = buildReferralLeaderboard(SAMPLE_REFERRALS, SAMPLE_NAMES);
    expect(leaderboard[0].rank).toBe(1);
    for (let i = 1; i < leaderboard.length; i++) expect(leaderboard[i - 1].pointsEarned).toBeGreaterThanOrEqual(leaderboard[i].pointsEarned);
  });

  it("summarizes a referrer's program", () => {
    const summary = buildReferralSummary(SAMPLE_PROFILE.customerId, SAMPLE_REFERRALS);
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.flagged).toBeGreaterThanOrEqual(1); // ref-4 is self+same device
    expect(summary.conversionRate).toBeGreaterThanOrEqual(0);
    expect(summary.code.code.startsWith("VH")).toBe(true);
  });
});

describe("MCP-1D.5 campaign management", () => {
  it("validates campaigns and flags issues", () => {
    const valid = validateCampaign(SAMPLE_CAMPAIGNS[0]);
    expect(valid.valid).toBe(true);

    const invalid: CampaignInput = { id: "c", name: "", type: "location", status: "draft", audience: [], startDaysAgo: 0, durationDays: 0 };
    const result = validateCampaign(invalid);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(2);
  });

  it("computes CTR / conversion / ROAS", () => {
    const report = buildCampaignReport(SAMPLE_CAMPAIGNS[0]);
    expect(report.ctr).toBeGreaterThan(0);
    expect(report.roas).toBeGreaterThan(0);
    expect(["healthy", "watch", "degraded", "critical"]).toContain(report.tone);
  });

  it("builds a portfolio with blended ROAS and invalid count", () => {
    const portfolio = buildCampaignPortfolio(SAMPLE_CAMPAIGNS);
    expect(portfolio.reports.length).toBe(SAMPLE_CAMPAIGNS.length);
    expect(portfolio.active).toBeGreaterThanOrEqual(1);
    expect(portfolio.invalid).toBeGreaterThanOrEqual(1); // camp-5 has 0 duration
    expect(portfolio.blendedRoas).toBeGreaterThan(0);
  });
});

describe("MCP-1D.6 engagement platform", () => {
  it("builds an activity feed for a customer", () => {
    const feed = buildActivityFeed(SAMPLE_ENGAGEMENT, SAMPLE_PROFILE.customerId);
    expect(feed.length).toBeGreaterThan(0);
    expect(feed.every((m) => m.title)).toBe(true);
    // sorted most-recent first
    for (let i = 1; i < feed.length; i++) expect(feed[i - 1].daysAgo).toBeLessThanOrEqual(feed[i].daysAgo);
  });

  it("computes engagement analytics with rates", () => {
    const analytics = buildEngagementAnalytics(SAMPLE_ENGAGEMENT);
    expect(analytics.sent).toBe(SAMPLE_ENGAGEMENT.length);
    expect(analytics.deliveryRate).toBeGreaterThanOrEqual(0);
    expect(analytics.openRate).toBeGreaterThanOrEqual(0);
    expect(analytics.byChannel.length).toBe(3);
  });

  it("plans deterministic re-engagement deliveries", () => {
    const plan = planReengagement({ customerId: "c", wishlistPriceDrops: 2, dormant: true, pointsExpiringSoon: 900 });
    expect(plan.length).toBe(3);
    expect(plan.some((p) => p.kind === "price_drop")).toBe(true);
    expect(plan.some((p) => p.kind === "reward")).toBe(true);
    expect(planReengagement({ customerId: "c" })).toEqual([]);
  });
});

describe("MCP-1D.7 personalization", () => {
  it("builds affinity profile from behavior", () => {
    const profile = buildPersonalizationProfile("c", SAMPLE_BEHAVIOR, ["Mobiles"]);
    expect(profile.categoryAffinity.length).toBeGreaterThan(0);
    // normalized: top affinity is 100
    expect(profile.categoryAffinity[0].score).toBe(100);
    expect(profile.topInterests.length).toBeGreaterThan(0);
    expect(profile.personalizationScore).toBeGreaterThan(0);
  });

  it("personalizes a ranking by affinity", () => {
    const profile = buildPersonalizationProfile("c", SAMPLE_BEHAVIOR);
    const ranked = personalizeRanking([{ key: "Home", baseScore: 90 }, { key: "Mobiles", baseScore: 50 }], profile.categoryAffinity);
    // Mobiles has the highest affinity so it should win despite a lower base score
    expect(ranked[0].key).toBe("Mobiles");
  });
});

describe("MCP-1D.8 recommendations", () => {
  it("builds a ranked, de-duplicated recommendation set", () => {
    const profile = buildPersonalizationProfile("c", SAMPLE_BEHAVIOR);
    const set = buildRecommendations(SAMPLE_PRODUCTS, SAMPLE_STORES_REC, {
      customerId: "c",
      categoryAffinity: profile.categoryAffinity,
      recentlyViewed: [SAMPLE_PRODUCTS[0]],
      cartCategories: ["Mobiles"],
      abandonedCart: [SAMPLE_PRODUCTS[1]],
    });
    expect(set.items.length).toBeGreaterThan(0);
    // sorted by score desc
    for (let i = 1; i < set.items.length; i++) expect(set.items[i - 1].score).toBeGreaterThanOrEqual(set.items[i].score);
    // de-duplicated by id
    expect(new Set(set.items.map((i) => i.id)).size).toBe(set.items.length);
    expect(set.coverage).toBeGreaterThan(0);
    expect(Object.keys(set.byKind).length).toBeGreaterThan(2);
  });
});

describe("MCP-1D.11 growth intelligence", () => {
  it("assesses churn with drivers and a retention action", () => {
    const dormant = SAMPLE_CUSTOMERS.find((c) => c.customerId === "cust-005")!;
    const churn = assessChurn(dormant);
    expect(churn.churnRisk).toBeGreaterThan(40);
    expect(["low", "medium", "high"]).toContain(churn.band);
    expect(churn.drivers.length).toBeGreaterThan(0);
    expect(churn.retentionAction).toBeTruthy();
  });

  it("builds segment insights covering the customer base", () => {
    const segments = buildSegmentInsights(SAMPLE_CUSTOMERS);
    expect(segments.length).toBeGreaterThan(0);
    const totalShare = segments.reduce((s, x) => s + x.share, 0);
    expect(totalShare).toBeGreaterThan(0);
  });

  it("produces ranked growth recommendations + a demand forecast", () => {
    const intel = buildGrowthIntelligence({ customers: SAMPLE_CUSTOMERS, referralConversion: 20, demandCells: SAMPLE_DEMAND_CELLS });
    expect(intel.recommendations.length).toBeGreaterThan(0);
    for (let i = 1; i < intel.recommendations.length; i++) expect(intel.recommendations[i - 1].score).toBeGreaterThanOrEqual(intel.recommendations[i].score);
    expect(intel.recommendations.some((r) => r.kind === "churn_risk" || r.kind === "retention_risk")).toBe(true);
    expect(intel.recommendations.some((r) => r.kind === "referral_opportunity")).toBe(true); // conversion 20 < 30
    expect(intel.recommendations.some((r) => r.kind === "hyperlocal_demand")).toBe(true);
    expect(intel.demandForecast).toBeGreaterThanOrEqual(0);
    expect(["healthy", "watch", "degraded", "critical"]).toContain(intel.tone);
  });
});

describe("MCP-1D assemblers + determinism", () => {
  it("builds the buyer customer-growth snapshot", () => {
    const snapshot = buildSampleCustomerGrowthSnapshot();
    expect(snapshot.identity.name).toBe("Aarav Sharma");
    expect(snapshot.loyalty.pointsBalance).toBeGreaterThan(0);
    expect(snapshot.referral.code.code.startsWith("VH")).toBe(true);
    expect(snapshot.recommendations.items.length).toBeGreaterThan(0);
    expect(snapshot.briefing.length).toBe(4);
  });

  it("builds the admin growth snapshot across the base", () => {
    const snapshot = buildSampleAdminGrowthSnapshot();
    expect(snapshot.customers).toBe(SAMPLE_CUSTOMERS.length);
    expect(snapshot.tierDistribution.reduce((s, t) => s + t.customers, 0)).toBe(SAMPLE_CUSTOMERS.length);
    expect(snapshot.campaigns.length).toBe(SAMPLE_CAMPAIGNS.length);
    expect(snapshot.intelligence.recommendations.length).toBeGreaterThan(0);
    expect(snapshot.retentionRate).toBeGreaterThanOrEqual(0);
    expect(snapshot.retentionRate).toBeLessThanOrEqual(100);
  });

  it("is deterministic (same input -> same output)", () => {
    const a = buildSampleAdminGrowthSnapshot();
    const b = buildSampleAdminGrowthSnapshot();
    expect(a.retentionRate).toBe(b.retentionRate);
    expect(a.demandForecast).toBe(b.demandForecast);
    expect(a.intelligence.recommendations.length).toBe(b.intelligence.recommendations.length);
  });
});

describe("MCP-1D.12 mandatory user journeys", () => {
  it("Journey A — register → complete profile → personalized experience", () => {
    const newCustomer: CustomerProfileInput = { customerId: "newbie", name: "New User", email: "n@e.com", joinedDaysAgo: 1 };
    const snapshot = buildCustomerGrowthSnapshot({
      profile: newCustomer,
      ledger: [],
      referrals: [],
      behavior: SAMPLE_BEHAVIOR,
      engagement: [],
      campaigns: SAMPLE_CAMPAIGNS,
    });
    expect(snapshot.identity.lifecycle).toBe("new");
    expect(snapshot.identity.completion.nextBestField).toBeTruthy();
    expect(snapshot.recommendations.items.length).toBeGreaterThan(0); // personalized experience exists
  });

  it("Journey B — earn reward → redeem reward", () => {
    const account = buildLoyaltyAccount(SAMPLE_PROFILE.customerId, SAMPLE_LEDGER);
    const option = account.redeemable[0];
    const result = redeemReward(option, { customerId: account.customerId, pointsBalance: account.pointsBalance, tier: account.tier });
    expect(result.ok).toBe(true);
    expect(result.newBalance).toBe(account.pointsBalance - option.pointsCost);
  });

  it("Journey C — refer friend → receive referral reward", () => {
    const record: ReferralRecord = { id: "jc", referrerId: SAMPLE_PROFILE.customerId, refereeId: "friend", code: "VH", status: "pending", createdDaysAgo: 20, refereeOrders: 1, refereeSpend: 800 };
    const assessed = assessReferral(record);
    expect(assessed.status).toBe("rewarded");
    expect(assessed.rewardPoints).toBeGreaterThan(0);
  });

  it("Journey D — create campaign → launch → monitor results", () => {
    const draft: CampaignInput = { id: "jd", name: "Launch Test", type: "discount", status: "draft", audience: ["all"], startDaysAgo: 0, durationDays: 7, discountPercent: 15 };
    expect(validateCampaign(draft).valid).toBe(true);
    const launched = buildCampaignReport({ ...draft, status: "active", impressions: 1000, clicks: 80, redemptions: 12, revenue: 24000, spend: 6000 });
    expect(launched.status).toBe("active");
    expect(launched.roas).toBeGreaterThan(0);
    expect(launched.ctr).toBeGreaterThan(0);
  });

  it("Journey E — detect churn risk → recommend retention action", () => {
    const intel = buildGrowthIntelligence({ customers: SAMPLE_CUSTOMERS });
    const churnRec = intel.recommendations.find((r) => r.kind === "churn_risk" || r.kind === "retention_risk");
    expect(churnRec).toBeTruthy();
    expect(churnRec!.action).toBeTruthy();
  });
});
