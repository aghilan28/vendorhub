import { describe, expect, it } from "vitest";
import { createDeterministicClock } from "@/lib/taxonomy";
import {
  SellerNetworkEngine,
  StoreClassification,
  StoreGovernance,
  buildCanonicalSellerNetwork,
  buildSellerAnalytics,
  buildStoreSearchIndex,
  certifySellerScaleTarget,
  resolveSellers,
  resolveStores,
  runSellerScaleCertification,
  sellersForTerm,
  storesForTerm,
  validateSellerNetwork,
  type Seller,
  type SellerInput,
  type Store,
  type StoreInput,
} from "@/lib/sellers";

function fixedClock() {
  return createDeterministicClock(1_700_000_000_000, 1_000);
}

function smallSellers(): SellerInput[] {
  return [
    { id: "apollo", name: "Apollo Pharmacy", sellerType: "ENTERPRISE", homeRegion: "TN" },
    { id: "apollo-tn", name: "Apollo Pharmacy Tamil Nadu", sellerType: "REGIONAL", parentChainId: "apollo", homeRegion: "TN" },
  ];
}

function smallStores(): StoreInput[] {
  return [
    { id: "apollo-tn-chennai", name: "Apollo Pharmacy Chennai", storeType: "PHARMACY", departments: ["medicine"], sellerId: "apollo-tn", location: { city: "Chennai", area: "T Nagar", region: "TN", pincode: "600017", latitude: 13.04, longitude: 80.23 } },
    { id: "apollo-tn-madurai", name: "Apollo Pharmacy Madurai", storeType: "PHARMACY", departments: ["medicine"], sellerId: "apollo-tn", location: { city: "Madurai", area: "Central", region: "TN", pincode: "625001", latitude: 9.92, longitude: 78.11 } },
  ];
}

function buildSmall() {
  return SellerNetworkEngine.fromInputs(smallSellers(), smallStores(), { clock: fixedClock() });
}

function craftSeller(p: Partial<Seller> & { id: string }): Seller {
  return resolveSellers([{ id: p.id, name: p.name ?? p.id, ...p }])[0];
}

function craftStore(p: Partial<StoreInput> & { id: string; sellerId: string }): Store {
  return resolveStores([{ id: p.id, name: p.name ?? p.id, storeType: p.storeType ?? "GROCERY", sellerId: p.sellerId, location: p.location ?? { city: "X", area: "Y", region: "TN", pincode: "600001", latitude: 0, longitude: 0 }, ...p }])[0];
}

describe("seller + store engine (Phases 1, 2)", () => {
  const engine = buildSmall();

  it("creates sellers and stores with ownership traversal", () => {
    expect(engine.sellerCount).toBe(2);
    expect(engine.storeCount).toBe(2);
    expect(engine.getStoresBySeller("apollo-tn").map((s) => s.id).sort()).toEqual(["apollo-tn-chennai", "apollo-tn-madurai"]);
    expect(engine.getSellersByChain("apollo").map((s) => s.id)).toEqual(["apollo-tn"]);
    expect(engine.getStore("apollo-tn-chennai")?.sellerId).toBe("apollo-tn");
  });

  it("indexes stores by type, region and city", () => {
    expect(engine.getStoresByType("PHARMACY").length).toBe(2);
    expect(engine.getStoresByRegion("TN").length).toBe(2);
    expect(engine.getStoresByCity("Chennai").map((s) => s.id)).toEqual(["apollo-tn-chennai"]);
  });
});

describe("store classification (Phase 5)", () => {
  it("classifies stores and maps departments", () => {
    const engine = buildSmall();
    const classification = new StoreClassification(engine);
    expect(classification.getStoresOfType("PHARMACY").length).toBe(2);
    expect(classification.departmentsFor(engine.getStore("apollo-tn-chennai") as Store)).toContain("medicine");
    const report = classification.report();
    expect(report.unclassifiedStores).toHaveLength(0);
    expect(report.classifiedStores).toBe(2);
  });
});

describe("validation engine (Phase 10)", () => {
  it("detects duplicate sellers/stores", () => {
    const dupSeller = validateSellerNetwork([craftSeller({ id: "a", slug: "same" }), craftSeller({ id: "b", slug: "same" })], []);
    expect(dupSeller.issues.map((i) => i.code)).toContain("DUPLICATE_SELLER_SLUG");
  });

  it("detects orphan stores and broken ownership", () => {
    const orphan = validateSellerNetwork([], [craftStore({ id: "s1", sellerId: "" })]);
    expect(orphan.issues.map((i) => i.code)).toContain("ORPHAN_STORE");
    const broken = validateSellerNetwork([], [craftStore({ id: "s2", sellerId: "ghost" })]);
    expect(broken.issues.map((i) => i.code)).toContain("BROKEN_OWNERSHIP");
  });

  it("detects verification conflicts and invalid governance state", () => {
    const conflict = validateSellerNetwork([craftSeller({ id: "c", verificationStatus: "REJECTED", operationalStatus: "ACTIVE" })], []);
    expect(conflict.issues.map((i) => i.code)).toContain("VERIFICATION_CONFLICT");
    const badState = validateSellerNetwork([craftSeller({ id: "d", lifecycleStatus: "ARCHIVED", operationalStatus: "ACTIVE" })], []);
    expect(badState.issues.map((i) => i.code)).toContain("INVALID_GOVERNANCE_STATE");
  });

  it("passes a clean network", () => {
    const engine = buildSmall();
    const report = validateSellerNetwork(engine.sellers(), engine.stores());
    expect(report.valid).toBe(true);
  });
});

describe("store governance (Phase 6)", () => {
  function gov() {
    return new StoreGovernance(buildSmall(), { clock: fixedClock() });
  }

  it("creates, edits, verifies, approves, suspends, archives, restores with version history + audit", () => {
    const governance = gov();
    const created = governance.create({ id: "apollo-tn-trichy", name: "Apollo Pharmacy Trichy", storeType: "PHARMACY", sellerId: "apollo-tn", location: { city: "Trichy", area: "Central", region: "TN", pincode: "620001", latitude: 10.8, longitude: 78.7 } }, "admin");
    expect(created.id).toBe("apollo-tn-trichy");
    expect(governance.edit("apollo-tn-trichy", { operatingHours: "09:00-21:00" }, "admin").operatingHours).toBe("09:00-21:00");
    expect(governance.verify("apollo-tn-chennai", "admin").verificationStatus).toBe("VERIFIED");
    expect(governance.approve("apollo-tn-chennai", "admin").metadata.approvalState).toBe("APPROVED");
    expect(governance.suspend("apollo-tn-madurai", "admin").operationalStatus).toBe("SUSPENDED");
    expect(governance.archive("apollo-tn-madurai", "admin").lifecycleStatus).toBe("ARCHIVED");
    expect(governance.restore("apollo-tn-madurai", "admin").operationalStatus).toBe("ACTIVE");
    expect(governance.versionHistory("apollo-tn-chennai").length).toBeGreaterThanOrEqual(2);
    expect(governance.audit().map((a) => a.operation)).toContain("VERIFY");
  });

  it("runs the approval workflow", () => {
    const governance = gov();
    const request = governance.submitChangeRequest("SUSPEND", { id: "apollo-tn-chennai" }, "editor");
    expect(governance.approveChangeRequest(request.id, "approver").request.status).toBe("APPLIED");
    expect(governance.engine().getStore("apollo-tn-chennai")?.operationalStatus).toBe("SUSPENDED");
  });
});

describe("search & analytics readiness (Phases 7, 8)", () => {
  const engine = buildSmall();

  it("builds seller/store search indexes and resolves terms", () => {
    expect(buildStoreSearchIndex(engine).length).toBe(2);
    expect(sellersForTerm(engine, "apollo").length).toBeGreaterThan(0);
    expect(storesForTerm(engine, "chennai").map((s) => s.id)).toContain("apollo-tn-chennai");
  });

  it("builds analytics with hooks and store density", () => {
    const analytics = buildSellerAnalytics(engine);
    expect(analytics.hooks.length).toBeGreaterThan(0);
    expect(analytics.storeDensityByCity.some((c) => c.city === "Chennai")).toBe(true);
  });
});

describe("canonical seller universe (Phases 3, 4)", () => {
  it("provides 1000+ sellers, 5000+ stores, all classified and validating cleanly", () => {
    const engine = buildCanonicalSellerNetwork();
    expect(engine.sellerCount).toBeGreaterThanOrEqual(1000);
    expect(engine.storeCount).toBeGreaterThanOrEqual(5000);
    const report = validateSellerNetwork(engine.sellers(), engine.stores());
    expect(report.errorCount).toBe(0);
    expect(new StoreClassification(engine).unclassifiedStores()).toHaveLength(0);
  });

  it("includes real chains traceable to a parent (Apollo Pharmacy, Reliance Fresh)", () => {
    const engine = buildCanonicalSellerNetwork();
    expect(engine.getSeller("apollo-pharmacy")).toBeDefined();
    expect(engine.getSeller("reliance-fresh")).toBeDefined();
    expect(engine.getSellersByChain("apollo-pharmacy").length).toBeGreaterThan(0);
  });

  it("is deterministic across builds", () => {
    const a = JSON.stringify(buildCanonicalSellerNetwork({ clock: fixedClock() }).stores().slice(0, 100));
    const b = JSON.stringify(buildCanonicalSellerNetwork({ clock: fixedClock() }).stores().slice(0, 100));
    expect(a).toBe(b);
  });
});

describe("scale certification (Phase 11)", () => {
  it("certifies 100 & 1,000 sellers", () => {
    for (const sellerCount of [100, 1000]) {
      const result = certifySellerScaleTarget(sellerCount, 5);
      expect(result.valid).toBe(true);
      expect(result.classificationOk).toBe(true);
      expect(result.ownershipOk).toBe(true);
      expect(result.generatedSellers).toBe(sellerCount);
    }
  });

  it("certifies 5,000 / 10,000 / 50,000 stores", () => {
    const results = runSellerScaleCertification();
    for (const result of results) {
      expect(result.valid).toBe(true);
      expect(result.classificationOk).toBe(true);
      expect(result.searchReady).toBe(true);
      expect(result.analyticsReady).toBe(true);
      expect(result.performanceOk).toBe(true);
    }
    expect(results.some((r) => r.generatedStores >= 50_000)).toBe(true);
  }, 60_000);
});
