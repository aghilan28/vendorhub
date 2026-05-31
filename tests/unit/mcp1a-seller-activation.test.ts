import { describe, expect, it } from "vitest";
import {
  // onboarding
  ONBOARDING_STEPS,
  validateStep,
  computeProgress,
  isValidGstin,
  isValidPan,
  isValidIfsc,
  canTransitionApplication,
  transitionApplication,
  createApplication,
  // verification
  buildVerificationCase,
  verificationSummary,
  // population
  IMPORT_TEMPLATE,
  importTemplateCsv,
  importCsv,
  importSingle,
  importGovernance,
  toHistoryEntry,
  validateUniverseScale,
  catalogHealth,
  // storefront
  buildStorefront,
  storefrontTrustIndicators,
  // activation
  buildActivationSnapshot,
  // governance
  buildGovernanceSnapshot,
  // operations
  buildPopulationSnapshot,
  // intelligence
  sellerRecommendations,
  marketplaceRecommendations,
  // sample
  SAMPLE_COMPLETE_DATA,
  SAMPLE_PARTIAL_DATA,
  SAMPLE_COMPLETE_APPLICATION,
  SAMPLE_ACTIVATION_INPUT,
  SAMPLE_GOVERNANCE_SELLERS,
  SAMPLE_POPULATION_SELLERS,
  SAMPLE_STOREFRONT_SELLER,
  SAMPLE_STOREFRONT_PRODUCTS,
  SAMPLE_IMPORT_CSV,
} from "@/lib/seller-activation";

const AT = "2026-05-31T06:00:00.000Z";

describe("MCP-1A.2 onboarding", () => {
  it("defines the 13-step flow (12 actionable + submission)", () => {
    expect(ONBOARDING_STEPS).toHaveLength(13);
    expect(ONBOARDING_STEPS.at(-1)?.id).toBe("submission");
  });

  it("validates field formats (GSTIN/PAN/IFSC/pincode/email)", () => {
    expect(isValidGstin("29ABCDE1234F1Z5")).toBe(true);
    expect(isValidGstin("BAD")).toBe(false);
    expect(isValidPan("ABCDE1234F")).toBe(true);
    expect(isValidPan("ABCDE12345")).toBe(false);
    expect(isValidIfsc("HDFC0001234")).toBe(true);
    expect(isValidIfsc("HDFC1234567")).toBe(false);
    expect(validateStep("address_info", { addressLine1: "x", city: "y", state: "z", pincode: "12" })).toContain("pincode");
    expect(validateStep("registration", { ownerName: "A", email: "bad", phone: "123" })).toContain("email");
  });

  it("GST step is satisfied by an exemption declaration", () => {
    expect(validateStep("gst_info", { gstExempt: true })).toEqual([]);
    expect(validateStep("gst_info", {})).toContain("gstin");
  });

  it("computes progress and readiness", () => {
    const complete = computeProgress(SAMPLE_COMPLETE_DATA);
    expect(complete.readyToSubmit).toBe(true);
    expect(complete.percent).toBe(100);
    expect(complete.nextStep).toBeNull();

    const partial = computeProgress(SAMPLE_PARTIAL_DATA);
    expect(partial.readyToSubmit).toBe(false);
    expect(partial.percent).toBeLessThan(100);
    expect(partial.blockers.length).toBeGreaterThan(0);
    expect(partial.nextStep).not.toBeNull();
  });

  it("guards the application state machine and submission gate", () => {
    expect(canTransitionApplication("draft", "submitted")).toBe(true);
    expect(canTransitionApplication("draft", "approved")).toBe(false);

    const ready = createApplication("s1", SAMPLE_COMPLETE_DATA, AT);
    const submit = transitionApplication(ready, "submitted", "seller", "submit", AT);
    expect(submit.ok).toBe(true);
    expect(submit.application.state).toBe("submitted");
    expect(submit.application.events).toHaveLength(1);

    const notReady = createApplication("s2", SAMPLE_PARTIAL_DATA, AT);
    const blocked = transitionApplication(notReady, "submitted", "seller", "submit", AT);
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toMatch(/incomplete/i);

    const illegal = transitionApplication(ready, "active", "admin", "x", AT);
    expect(illegal.ok).toBe(false);
  });
});

describe("MCP-1A.3 verification", () => {
  it("auto-approves a complete, consistent application", () => {
    const vc = buildVerificationCase(SAMPLE_COMPLETE_APPLICATION);
    expect(vc.decision).toBe("auto_approve");
    expect(vc.checks.every((c) => c.state === "passed")).toBe(true);
    expect(vc.riskScore).toBeLessThan(30);
    expect(verificationSummary(vc).passed).toBe(4);
  });

  it("flags invalid PAN/GSTIN/IFSC and rejects/reviews", () => {
    const bad = createApplication("bad", { businessName: "X", businessType: "individual", gstin: "BAD", panNumber: "BAD", ifsc: "BAD", accountNumber: "12", accountHolder: "Z" }, AT);
    const vc = buildVerificationCase(bad);
    expect(vc.riskFlags.some((f) => f.kind === "invalid_gstin")).toBe(true);
    expect(vc.riskFlags.some((f) => f.kind === "invalid_pan")).toBe(true);
    expect(["reject", "manual_review"]).toContain(vc.decision);
    expect(vc.riskScore).toBeGreaterThan(0);
  });

  it("routes incomplete applications to manual review or pending", () => {
    const partial = createApplication("p", SAMPLE_PARTIAL_DATA, AT);
    const vc = buildVerificationCase(partial);
    expect(vc.decision).not.toBe("auto_approve");
  });
});

describe("MCP-1A.4 product population (over MCP-0B)", () => {
  it("produces a downloadable template", () => {
    expect(IMPORT_TEMPLATE.some((c) => c.key === "name" && c.required)).toBe(true);
    expect(importTemplateCsv().split("\n")[0]).toContain("name");
  });

  it("imports a CSV: validates, dedupes, gates publishable rows", () => {
    const result = importCsv("seller-1", SAMPLE_IMPORT_CSV, AT);
    expect(result.report.total).toBeGreaterThan(0);
    expect(result.job.publishable).toBeGreaterThan(0);
    // the "Bad Row No Category" should be invalid
    expect(result.job.invalid).toBeGreaterThan(0);
    expect(result.job.recoverableRefs.length).toBe(result.job.invalid + result.job.duplicates);
  });

  it("single product creation routes through validation", () => {
    const ok = importSingle("s", { name: "Valid Product", categorySlug: "pulses-dals", price: 100, attributes: { weight: 1000 } }, AT);
    expect(ok.job.total).toBe(1);
  });

  it("import governance blocks low-quality / empty imports", () => {
    const empty = importCsv("s", "name,category,price\n", AT);
    expect(importGovernance(empty.job).canPublish).toBe(false);
    const good = importCsv("s", SAMPLE_IMPORT_CSV, AT);
    const gov = importGovernance(good.job);
    expect(typeof gov.canPublish).toBe("boolean");
    expect(toHistoryEntry(good.job).jobId).toBe(good.job.id);
  });
});

describe("MCP-1A.5 product universe scaling", () => {
  it("scales to 10,000 unique, categorised, searchable products", () => {
    const universe = validateUniverseScale(10_000);
    expect(universe.count).toBe(10_000);
    expect(universe.uniqueSlugs).toBe(10_000);
    expect(universe.uniqueSkus).toBe(10_000);
    expect(universe.rootCategories).toBeGreaterThanOrEqual(10);
    expect(universe.searchable).toBe(10_000);
    expect(universe.withMedia).toBe(10_000);
  });

  it("computes catalog health", () => {
    expect(catalogHealth(80, 0.9, 0.5)).toBeGreaterThan(catalogHealth(40, 0.2, 0.1));
  });
});

describe("MCP-1A.6 activation center", () => {
  it("scores an active seller and surfaces tasks + briefing", () => {
    const snap = buildActivationSnapshot(SAMPLE_ACTIVATION_INPUT);
    expect(snap.activationScore).toBeGreaterThan(0);
    expect(snap.stage).toBe("active");
    expect(snap.tasks.length).toBeGreaterThan(0);
    expect(snap.briefing.length).toBeGreaterThan(0);
    // tasks are severity-ranked
    for (let i = 1; i < snap.tasks.length; i++) {
      const rank = (s: string) => ({ critical: 5, warning: 4, watch: 3, opportunity: 2, info: 1 } as Record<string, number>)[s];
      expect(rank(snap.tasks[i - 1].severity)).toBeGreaterThanOrEqual(rank(snap.tasks[i].severity));
    }
  });

  it("tells a brand-new seller to finish onboarding and add products", () => {
    const snap = buildActivationSnapshot({
      sellerId: "new",
      storeName: "New Store",
      data: SAMPLE_PARTIAL_DATA,
      applicationState: "draft",
      verification: { score: 40, decision: "manual_review", passed: 1, total: 4, escalated: false },
      catalog: { products: 0, published: 0, averageQuality: 0 },
      trustScore: 20,
    });
    expect(snap.stage).toBe("registering");
    expect(snap.tasks.some((t) => t.id === "finish-onboarding")).toBe(true);
    expect(snap.tasks.some((t) => t.id === "add-products")).toBe(true);
  });
});

describe("MCP-1A.7 admin governance", () => {
  it("builds six queues and marketplace health", () => {
    const gov = buildGovernanceSnapshot(SAMPLE_GOVERNANCE_SELLERS);
    expect(gov.queues).toHaveLength(6);
    expect(gov.totalPending).toBeGreaterThan(0);
    expect(gov.sellers).toBe(SAMPLE_GOVERNANCE_SELLERS.length);
    expect(gov.activeSellers).toBeGreaterThan(0);
    expect(["healthy", "watch", "degraded", "critical"]).toContain(gov.tone);
    // submitted sellers appear in seller_review
    const review = gov.queues.find((q) => q.kind === "seller_review");
    expect(review?.items.length).toBeGreaterThan(0);
  });
});

describe("MCP-1A.8 storefront generation", () => {
  it("builds a storefront with catalog, policies, metrics and trust indicators", () => {
    const store = buildStorefront(SAMPLE_STOREFRONT_SELLER, SAMPLE_STOREFRONT_PRODUCTS);
    expect(store.productCount).toBe(SAMPLE_STOREFRONT_PRODUCTS.length);
    expect(store.categories.length).toBeGreaterThan(0);
    expect(store.products.some((p) => !p.inStock)).toBe(true); // ghee stock 0
    const indicators = storefrontTrustIndicators(store);
    expect(indicators).toContain("Verified seller");
  });
});

describe("MCP-1A.9 population operations", () => {
  it("computes funnel, KPIs and capacity progress", () => {
    const pop = buildPopulationSnapshot(SAMPLE_POPULATION_SELLERS);
    expect(pop.funnel.registered).toBe(SAMPLE_POPULATION_SELLERS.length);
    expect(pop.kpis.products).toBeGreaterThan(0);
    expect(pop.capacity.sellerTarget).toBe(100);
    expect(pop.capacity.productTarget).toBe(10_000);
    expect(pop.kpis.sellerActivationRate).toBeGreaterThanOrEqual(0);
    expect(pop.expansion.length).toBeGreaterThan(0);
  });
});

describe("MCP-1A.10 activation intelligence", () => {
  it("recommends seller actions ranked by impact", () => {
    const snap = buildActivationSnapshot({
      sellerId: "s",
      storeName: "S",
      data: SAMPLE_PARTIAL_DATA,
      applicationState: "draft",
      verification: { score: 30, decision: "reject", passed: 1, total: 4, escalated: false },
      catalog: { products: 0, published: 0, averageQuality: 0 },
      trustScore: 10,
    });
    const recs = sellerRecommendations(snap);
    expect(recs.length).toBeGreaterThan(0);
    for (let i = 1; i < recs.length; i++) expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score);
  });

  it("recommends marketplace population/expansion actions", () => {
    const pop = buildPopulationSnapshot(SAMPLE_POPULATION_SELLERS);
    const gov = buildGovernanceSnapshot(SAMPLE_GOVERNANCE_SELLERS);
    const recs = marketplaceRecommendations(pop, gov);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some((r) => r.kind === "population" || r.kind === "expansion" || r.kind === "activation")).toBe(true);
  });
});
