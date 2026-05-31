// MCP-1A Phase 10 — Intelligence Activation engine (deterministic, pure).
//
// Commerce intelligence operating on REAL marketplace entities (sellers, stores,
// catalogs, population): seller-growth / catalog / activation / population /
// expansion / trust recommendations, ranked by impact.

import type {
  ActivationRecommendation,
  ActivationRecommendationKind,
  MarketplacePopulationSnapshot,
  SellerActivationSnapshot,
  SellerGovernanceSnapshot,
  Severity,
} from "./types";

function sev(severity: Severity): number {
  return { critical: 92, warning: 76, watch: 58, opportunity: 46, info: 30 }[severity];
}

function rec(
  kind: ActivationRecommendationKind,
  scope: ActivationRecommendation["scope"],
  refId: string,
  severity: Severity,
  title: string,
  detail: string,
  action: string,
): ActivationRecommendation {
  return { id: `act-${kind}-${refId}`, kind, scope, refId, severity, title, detail, action, score: sev(severity) };
}

/** Per-seller activation/growth recommendations. */
export function sellerRecommendations(snapshot: SellerActivationSnapshot): ActivationRecommendation[] {
  const out: ActivationRecommendation[] = [];
  const id = snapshot.sellerId;

  if (!snapshot.onboarding.readyToSubmit) {
    out.push(rec("activation", "seller", id, "warning", "Finish onboarding", `Onboarding ${snapshot.onboarding.percent}% complete.`, "Complete the remaining onboarding steps to submit for review."));
  }
  if (snapshot.verification.decision === "reject") {
    out.push(rec("trust", "seller", id, "critical", "Verification failed", "KYC checks failed.", "Correct identity/business/bank details and resubmit."));
  } else if (snapshot.verification.escalated) {
    out.push(rec("trust", "seller", id, "watch", "Verification escalated", "KYC is under manual review.", "Await review or provide additional documents."));
  }
  if (snapshot.catalog.products === 0) {
    out.push(rec("catalog", "seller", id, "warning", "Populate your catalog", "No products yet.", "Import a CSV or create products to go live."));
  } else if (snapshot.catalog.published === 0) {
    out.push(rec("catalog", "seller", id, "warning", "Publish your catalog", `${snapshot.catalog.products} products unpublished.`, "Publish validated products from the import center."));
  } else if (snapshot.catalog.averageQuality < 60) {
    out.push(rec("catalog", "seller", id, "watch", "Improve listing quality", `Catalog quality ${snapshot.catalog.averageQuality}/100.`, "Add images, descriptions and attributes to raise quality."));
  }
  if (snapshot.stage === "active" && snapshot.catalog.published > 0 && snapshot.catalog.averageQuality >= 60) {
    out.push(rec("seller_growth", "seller", id, "opportunity", "Grow your catalog", "Store is live and healthy.", "Expand into adjacent categories and add variants to grow GMV."));
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Marketplace-level population / expansion recommendations. */
export function marketplaceRecommendations(population: MarketplacePopulationSnapshot, governance?: SellerGovernanceSnapshot): ActivationRecommendation[] {
  const out: ActivationRecommendation[] = [];

  if (population.funnel.registeredToVerified < 70 && population.funnel.registered > 0) {
    out.push(rec("population", "marketplace", "verification-funnel", "warning", "Verification drop-off", `Only ${population.funnel.registeredToVerified}% of registered sellers are verified.`, "Streamline KYC and chase pending verifications."));
  }
  if (population.funnel.verifiedToCatalog < 70 && population.funnel.verified > 0) {
    out.push(rec("population", "marketplace", "catalog-funnel", "warning", "Catalog drop-off", `Only ${population.funnel.verifiedToCatalog}% of verified sellers added a catalog.`, "Offer bulk-import assistance and templates to verified sellers."));
  }
  if (population.kpis.sellerActivationRate < 60) {
    out.push(rec("activation", "marketplace", "activation-rate", "watch", "Low activation rate", `Seller activation at ${population.kpis.sellerActivationRate}%.`, "Drive sellers to publish catalogs and complete activation tasks."));
  }
  if (population.capacity.productProgress < 100) {
    out.push(rec("population", "marketplace", "product-target", "opportunity", "Grow product universe", `${population.capacity.productProgress}% to the ${population.capacity.productTarget.toLocaleString("en-IN")}-product target.`, "Recruit catalog-rich sellers and run population imports."));
  }
  // Expansion: under-covered categories.
  const thin = population.expansion.filter((c) => c.sellers <= 1).slice(0, 3);
  for (const c of thin) {
    out.push(rec("expansion", "marketplace", c.category, "opportunity", `Expand "${c.category}"`, `${c.sellers} seller(s) cover this category.`, "Recruit sellers in this category to deepen selection."));
  }
  if (governance && governance.flaggedSellers > 0) {
    out.push(rec("trust", "marketplace", "flagged-sellers", "warning", "Sellers need risk review", `${governance.flaggedSellers} flagged seller(s).`, "Work the risk and escalation queues in seller governance."));
  }
  return out.sort((a, b) => b.score - a.score);
}
