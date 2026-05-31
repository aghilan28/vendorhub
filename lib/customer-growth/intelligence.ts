// MCP-1D Phase 11 — Growth Intelligence (deterministic, pure).
//
// Operates on customers / orders / campaigns / referrals to surface retention &
// churn risks, growth / campaign / referral opportunities, marketplace demand
// forecasts and customer-segment intelligence. Ranked, de-duplicated
// recommendations — the engine that makes growth intelligence-driven.

import { buildCustomerIdentity } from "./identity";
import type {
  ChurnAssessment,
  CustomerProfileInput,
  CustomerSegment,
  GrowthIntelligence,
  GrowthRecommendation,
  GrowthRecommendationKind,
  SegmentInsight,
  Severity,
  Tone,
} from "./types";

function sev(severity: Severity): number {
  return { critical: 92, warning: 76, watch: 58, opportunity: 46, info: 30 }[severity];
}

function rec(
  kind: GrowthRecommendationKind,
  scope: GrowthRecommendation["scope"],
  refId: string,
  severity: Severity,
  title: string,
  detail: string,
  action: string,
): GrowthRecommendation {
  return { id: `gr-${kind}-${refId}`, kind, scope, refId, severity, title, detail, action, score: sev(severity) };
}

/** Churn risk 0..100 from recency, frequency and lifecycle. */
export function assessChurn(profile: CustomerProfileInput): ChurnAssessment {
  const identity = buildCustomerIdentity(profile);
  const a = profile.activity ?? { orders: 0, totalSpend: 0, lastOrderDaysAgo: null, firstOrderDaysAgo: null };
  const recency = a.lastOrderDaysAgo;

  let risk = 0;
  const drivers: string[] = [];

  if (recency === null) {
    risk += 55;
    drivers.push("Never placed an order");
  } else {
    if (recency > 180) {
      risk += 70;
      drivers.push(`No order in ${recency}d`);
    } else if (recency > 90) {
      risk += 50;
      drivers.push(`Last order ${recency}d ago`);
    } else if (recency > 45) {
      risk += 30;
      drivers.push(`Slowing down (${recency}d since last order)`);
    }
  }
  if (a.orders <= 1) {
    risk += 15;
    drivers.push("Low purchase frequency");
  }
  if ((a.returns ?? 0) >= 2) {
    risk += 10;
    drivers.push(`${a.returns} returns`);
  }
  if ((a.sessionsLast30 ?? 0) === 0 && recency !== null) {
    risk += 10;
    drivers.push("No recent sessions");
  }
  risk = Math.max(0, Math.min(100, risk - Math.min(20, identity.valueScore / 5)));

  const band: ChurnAssessment["band"] = risk >= 66 ? "high" : risk >= 33 ? "medium" : "low";
  const retentionAction =
    band === "high"
      ? "Send a win-back offer + bonus loyalty points; surface personalized recommendations."
      : band === "medium"
        ? "Trigger a re-engagement nudge (price-drop/restock alerts) and a small coupon."
        : "Maintain engagement via loyalty perks and personalized recommendations.";

  return { customerId: profile.customerId, name: identity.name, churnRisk: risk, band, lifecycle: identity.lifecycle, drivers, retentionAction };
}

export function buildSegmentInsights(profiles: CustomerProfileInput[]): SegmentInsight[] {
  const segments: CustomerSegment[] = ["vip", "loyal", "promising", "new", "bargain", "at_risk", "dormant"];
  const total = Math.max(1, profiles.length);
  const map = new Map<CustomerSegment, { customers: number; revenue: number; valueSum: number; churnSum: number }>();
  for (const p of profiles) {
    const identity = buildCustomerIdentity(p);
    const churn = assessChurn(p).churnRisk;
    const entry = map.get(identity.segment) ?? { customers: 0, revenue: 0, valueSum: 0, churnSum: 0 };
    entry.customers += 1;
    entry.revenue += identity.monetary;
    entry.valueSum += identity.valueScore;
    entry.churnSum += churn;
    map.set(identity.segment, entry);
  }
  return segments
    .map((segment) => {
      const e = map.get(segment) ?? { customers: 0, revenue: 0, valueSum: 0, churnSum: 0 };
      return {
        segment,
        customers: e.customers,
        revenue: e.revenue,
        avgValueScore: e.customers ? Math.round(e.valueSum / e.customers) : 0,
        churnRisk: e.customers ? Math.round(e.churnSum / e.customers) : 0,
        share: Math.round((e.customers / total) * 100),
      };
    })
    .filter((s) => s.customers > 0)
    .sort((a, b) => b.revenue - a.revenue);
}

export interface GrowthIntelligenceInput {
  customers: CustomerProfileInput[];
  /** referral conversion 0..100 (from referral platform) */
  referralConversion?: number;
  /** number of distinct active campaigns */
  activeCampaigns?: number;
  /** thin/empty hyperlocal demand cells (pincode -> demand) for hyperlocal demand intel */
  demandCells?: Array<{ pincode: string; demand: number; stores: number }>;
}

function forecastDemand(profiles: CustomerProfileInput[]): number {
  // Projected orders next 30d: active/loyal customers expected to reorder.
  let projected = 0;
  for (const p of profiles) {
    const identity = buildCustomerIdentity(p);
    const base = { vip: 3, loyal: 2, promising: 1, new: 1, bargain: 1, at_risk: 0.3, dormant: 0.1 }[identity.segment] ?? 0.5;
    projected += base;
  }
  return Math.round(projected);
}

export function buildGrowthIntelligence(input: GrowthIntelligenceInput): GrowthIntelligence {
  const churn = input.customers.map(assessChurn).sort((a, b) => b.churnRisk - a.churnRisk);
  const segments = buildSegmentInsights(input.customers);
  const recommendations: GrowthRecommendation[] = [];

  // Retention / churn risks (top individuals)
  for (const c of churn.filter((c) => c.band === "high").slice(0, 5)) {
    recommendations.push(rec("churn_risk", "customer", c.customerId, "critical", `Churn risk: ${c.name}`, `${c.churnRisk}/100 — ${c.drivers.join(", ")}.`, c.retentionAction));
  }
  for (const c of churn.filter((c) => c.band === "medium").slice(0, 4)) {
    recommendations.push(rec("retention_risk", "customer", c.customerId, "warning", `Retention risk: ${c.name}`, `${c.churnRisk}/100 — ${c.drivers.join(", ")}.`, c.retentionAction));
  }

  // Segment insights → growth opportunities
  for (const s of segments) {
    if (s.segment === "promising" && s.customers > 0) {
      recommendations.push(rec("growth_opportunity", "segment", s.segment, "opportunity", `Grow "promising" segment`, `${s.customers} promising customers (avg value ${s.avgValueScore}).`, "Nudge a second purchase with a first-repeat loyalty bonus."));
    }
    if (s.segment === "at_risk" && s.customers > 0) {
      recommendations.push(rec("campaign_opportunity", "segment", s.segment, "warning", `Win-back campaign: at-risk`, `${s.customers} at-risk customers (avg churn ${s.churnRisk}).`, "Launch a targeted win-back campaign for the at-risk segment."));
    }
    if (s.segment === "vip" && s.customers > 0) {
      recommendations.push(rec("segment_insight", "segment", s.segment, "info", `VIPs drive revenue`, `${s.customers} VIPs contribute ₹${s.revenue.toLocaleString("en-IN")}.`, "Protect VIPs with exclusive platinum perks and early access."));
    }
  }

  // Referral opportunity
  if ((input.referralConversion ?? 0) < 30) {
    recommendations.push(rec("referral_opportunity", "marketplace", "referral", "opportunity", "Activate referral loop", `Referral conversion ${input.referralConversion ?? 0}% — below target.`, "Increase referral reward and surface the referral CTA in the growth center."));
  }

  // Hyperlocal demand
  for (const cell of (input.demandCells ?? []).filter((c) => c.stores === 0 && c.demand > 0).sort((a, b) => b.demand - a.demand).slice(0, 3)) {
    recommendations.push(rec("hyperlocal_demand", "zone", cell.pincode, "opportunity", `Unmet demand: ${cell.pincode}`, `${cell.demand} demand with no serviceable store.`, "Run a location campaign + recruit a seller for this pincode."));
  }

  // Demand forecast headline
  const demandForecast = forecastDemand(input.customers);
  recommendations.push(rec("demand_forecast", "marketplace", "forecast", "info", "30-day demand forecast", `~${demandForecast} orders projected from the current customer base.`, "Align inventory and campaigns to the projected demand."));

  const retentionRisks = recommendations.filter((r) => r.kind === "retention_risk").length;
  const churnRisks = recommendations.filter((r) => r.kind === "churn_risk").length;
  const growthOpportunities = recommendations.filter((r) => r.kind === "growth_opportunity" || r.kind === "campaign_opportunity" || r.kind === "referral_opportunity").length;

  const highChurnShare = input.customers.length ? churn.filter((c) => c.band === "high").length / input.customers.length : 0;
  const tone: Tone = highChurnShare >= 0.4 ? "critical" : highChurnShare >= 0.25 ? "degraded" : highChurnShare >= 0.12 ? "watch" : "healthy";

  return {
    recommendations: recommendations.sort((a, b) => b.score - a.score),
    churn,
    segments,
    retentionRisks,
    churnRisks,
    growthOpportunities,
    demandForecast,
    tone,
  };
}
