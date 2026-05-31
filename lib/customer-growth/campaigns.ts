// MCP-1D Phase 5 — Campaign Management System (deterministic, pure).
//
// Campaign builder validation, scheduling, analytics (CTR/conversion/ROAS) and
// governance over coupon/discount/category/store/location/hyperlocal/seasonal
// campaigns. References the existing coupon/promotion layer rather than
// re-implementing discounts.

import type { CampaignInput, CampaignReport, CampaignStatus, CampaignType, CampaignValidation, Tone } from "./types";

const TYPES_NEEDING_TARGET: Record<CampaignType, "pincodes" | "categories" | "stores" | null> = {
  coupon: null,
  discount: null,
  category: "categories",
  store: "stores",
  location: "pincodes",
  hyperlocal: "pincodes",
  seasonal: null,
};

export function validateCampaign(input: CampaignInput): CampaignValidation {
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!input.name || !input.name.trim()) issues.push("Campaign name is required.");
  if (input.durationDays <= 0) issues.push("Duration must be at least 1 day.");
  if (input.audience.length === 0) issues.push("Select at least one audience segment.");

  if (input.discountPercent !== undefined) {
    if (input.discountPercent <= 0 || input.discountPercent > 90) issues.push("Discount must be between 1% and 90%.");
    if (input.discountPercent > 60) warnings.push("Discounts above 60% can erode margin; confirm with finance.");
  }
  if ((input.type === "discount" || input.type === "coupon") && input.discountPercent === undefined) {
    warnings.push("No discount percent set for a discount/coupon campaign.");
  }

  const need = TYPES_NEEDING_TARGET[input.type];
  if (need === "pincodes" && (input.targetPincodes?.length ?? 0) === 0) issues.push("Location/hyperlocal campaigns need target pincodes.");
  if (need === "categories" && (input.targetCategories?.length ?? 0) === 0) issues.push("Category campaigns need target categories.");
  if (need === "stores" && (input.targetStores?.length ?? 0) === 0) issues.push("Store campaigns need target stores.");

  if (input.budget !== undefined && input.budget < 0) issues.push("Budget cannot be negative.");

  return { valid: issues.length === 0, issues, warnings };
}

function scheduleLabel(input: CampaignInput): string {
  if (input.status === "scheduled" || input.startDaysAgo < 0) {
    return `Starts in ${Math.abs(input.startDaysAgo)}d · runs ${input.durationDays}d`;
  }
  if (input.status === "completed" || input.startDaysAgo >= input.durationDays) {
    return `Ended ${Math.max(0, input.startDaysAgo - input.durationDays)}d ago`;
  }
  const remaining = Math.max(0, input.durationDays - input.startDaysAgo);
  return `Active · ${remaining}d remaining`;
}

function tone(status: CampaignStatus, ctr: number, roas: number): Tone {
  if (status === "paused") return "watch";
  if (status === "active") {
    if (roas >= 3) return "healthy";
    if (roas >= 1.5 || ctr >= 3) return "watch";
    return "degraded";
  }
  if (status === "completed") return roas >= 2 ? "healthy" : "watch";
  return "healthy";
}

export function buildCampaignReport(input: CampaignInput): CampaignReport {
  const impressions = input.impressions ?? 0;
  const clicks = input.clicks ?? 0;
  const redemptions = input.redemptions ?? 0;
  const revenue = input.revenue ?? 0;
  const spend = input.spend ?? 0;

  const ctr = impressions ? Math.round((clicks / impressions) * 1000) / 10 : 0;
  const conversionRate = clicks ? Math.round((redemptions / clicks) * 1000) / 10 : 0;
  const roas = spend ? Math.round((revenue / spend) * 100) / 100 : 0;
  const validation = validateCampaign(input);

  return {
    id: input.id,
    name: input.name,
    type: input.type,
    status: input.status,
    audience: input.audience,
    scheduledLabel: scheduleLabel(input),
    ctr,
    conversionRate,
    roas,
    reach: impressions,
    redemptions,
    revenue,
    spend,
    tone: tone(input.status, ctr, roas),
    validation,
  };
}

export interface CampaignPortfolio {
  reports: CampaignReport[];
  active: number;
  scheduled: number;
  totalRevenue: number;
  totalSpend: number;
  blendedRoas: number;
  invalid: number;
}

export function buildCampaignPortfolio(inputs: CampaignInput[]): CampaignPortfolio {
  const reports = inputs.map(buildCampaignReport).sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = reports.reduce((s, r) => s + r.revenue, 0);
  const totalSpend = reports.reduce((s, r) => s + r.spend, 0);
  return {
    reports,
    active: reports.filter((r) => r.status === "active").length,
    scheduled: reports.filter((r) => r.status === "scheduled").length,
    totalRevenue,
    totalSpend,
    blendedRoas: totalSpend ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0,
    invalid: reports.filter((r) => !r.validation.valid).length,
  };
}
