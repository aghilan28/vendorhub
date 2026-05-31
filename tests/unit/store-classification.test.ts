import { describe, expect, it } from "vitest";
import { createDeterministicClock } from "@/lib/taxonomy";
import { SellerNetworkEngine } from "@/lib/sellers";
import {
  ClassificationGovernance,
  StoreClassificationEngine,
  buildCanonicalStoreClassification,
  buildClassificationSearchIndex,
  buildRankingInputs,
  buildStoreIntelligenceProjection,
  capabilityProfileFor,
  categoryForStoreType,
  classificationForTerm,
  classifyStore,
  fulfillmentProfileFor,
  productCapabilityFor,
  runClassificationScaleCertification,
  storeAlternatives,
  storeSimilarity,
  storesWithCapability,
  validateClassification,
  type StoreClassificationProfile,
} from "@/lib/store-classification";

function fixedClock() {
  return createDeterministicClock(1_700_000_000_000, 1_000);
}

function smallNetwork() {
  return SellerNetworkEngine.fromInputs(
    [{ id: "apollo-tn", name: "Apollo Pharmacy TN", sellerType: "ENTERPRISE", homeRegion: "TN" }],
    [
      { id: "apollo-tn-chennai", name: "Apollo Pharmacy Chennai", storeType: "PHARMACY", departments: ["medicine", "health", "personal-care", "baby-care"], sellerId: "apollo-tn", location: { city: "Chennai", area: "T Nagar", region: "TN", pincode: "600017", latitude: 13, longitude: 80 } },
      { id: "apollo-tn-madurai", name: "Apollo Pharmacy Madurai", storeType: "PHARMACY", departments: ["medicine", "health"], sellerId: "apollo-tn", location: { city: "Madurai", area: "Central", region: "TN", pincode: "625001", latitude: 9, longitude: 78 } },
    ],
    { clock: fixedClock() },
  );
}

describe("category, capability & fulfillment assignment (Phases 1-5)", () => {
  it("assigns category, format, capabilities, product capability and fulfillment", () => {
    const engine = StoreClassificationEngine.fromNetwork(smallNetwork(), { clock: fixedClock() });
    const profile = engine.getProfile("apollo-tn-chennai") as StoreClassificationProfile;
    expect(profile.categoryL1).toBe("HEALTHCARE");
    expect(profile.categoryL2).toBe("Pharmacy");
    expect(profile.capabilities.delivery).toBe(true);
    expect(profile.productCapability.allowedDepartments).toContain("medicine");
    expect(profile.productCapability.restrictedDepartments).toContain("electronics");
    expect(profile.productCapability.complianceRequirements).toContain("drug_license");
    expect(profile.fulfillment.modes.length).toBeGreaterThan(0);
  });

  it("maps store types to categories and keeps capabilities internally consistent", () => {
    expect(categoryForStoreType("SUPERMARKET")).toEqual({ l1: "RETAIL", l2: "Supermarket" });
    const caps = capabilityProfileFor("GROCERY", "DARK_STORE");
    expect(caps.instantDelivery && caps.delivery).toBe(true);
    expect(fulfillmentProfileFor("DARK_STORE", true).primaryMode).toBe("DARK_STORE_FULFILLMENT");
    expect(productCapabilityFor("PHARMACY", ["medicine"]).complianceRequirements).toContain("schedule_h_compliance");
  });
});

describe("validation failures (Phase 10)", () => {
  const base = classifyStore(
    smallNetwork().getStore("apollo-tn-chennai")!,
    "ENTERPRISE",
    "2024-01-01T00:00:00.000Z",
  );

  it("detects invalid category, invalid type and conflicting capability", () => {
    const invalidCat = validateClassification([{ ...base, categoryL2: "Nonexistent" }]);
    expect(invalidCat.issues.map((i) => i.code)).toContain("INVALID_CATEGORY");
    const invalidType = validateClassification([{ ...base, formatType: "NONSENSE" as never }]);
    expect(invalidType.issues.map((i) => i.code)).toContain("INVALID_TYPE");
    const conflict = validateClassification([{ ...base, capabilities: { ...base.capabilities, delivery: false, instantDelivery: true } }]);
    expect(conflict.issues.map((i) => i.code)).toContain("CONFLICTING_CAPABILITY");
  });

  it("detects compliance violations and orphan records", () => {
    const violation = validateClassification([{ ...base, productCapability: { allowedDepartments: ["medicine"], restrictedDepartments: [], complianceRequirements: [] } }]);
    expect(violation.issues.map((i) => i.code)).toContain("COMPLIANCE_VIOLATION");
    const orphan = validateClassification([base], { validStoreIds: new Set(["other"]) });
    expect(orphan.issues.map((i) => i.code)).toContain("ORPHAN_RECORD");
  });

  it("passes a clean classification", () => {
    const engine = StoreClassificationEngine.fromNetwork(smallNetwork(), { clock: fixedClock() });
    expect(validateClassification(engine.profiles()).valid).toBe(true);
  });
});

describe("governance (Phase 9)", () => {
  it("assigns, edits, overrides capabilities, approves with audit + approval workflow", () => {
    const engine = StoreClassificationEngine.fromNetwork(smallNetwork(), { clock: fixedClock() });
    const governance = new ClassificationGovernance(engine, { clock: fixedClock() });
    const overridden = governance.override("apollo-tn-chennai", "b2b", true, "admin");
    expect(overridden.capabilities.b2b).toBe(true);
    expect(governance.edit("apollo-tn-chennai", { categoryL2: "Medical Store" }, "admin").categoryL2).toBe("Medical Store");
    expect(governance.approve("apollo-tn-chennai", "admin").version).toBeGreaterThan(1);
    expect(governance.audit().map((a) => a.operation)).toContain("OVERRIDE");
    const request = governance.submitChangeRequest("OVERRIDE", { storeId: "apollo-tn-madurai", flag: "subscription", value: true }, "editor");
    expect(governance.approveChangeRequest(request.id, "approver").request.status).toBe("APPLIED");
    expect(governance.engine().getProfile("apollo-tn-madurai")?.capabilities.subscription).toBe(true);
  });
});

describe("search / recommendation / intelligence readiness (Phases 6-8)", () => {
  const engine = StoreClassificationEngine.fromNetwork(smallNetwork(), { clock: fixedClock() });

  it("builds search index and resolves capability/term filters", () => {
    expect(buildClassificationSearchIndex(engine).length).toBe(2);
    expect(storesWithCapability(engine, "delivery").length).toBe(2);
    expect(classificationForTerm(engine, "pharmacy").length).toBe(2);
  });

  it("builds recommendation similarity, alternatives and ranking inputs", () => {
    expect(storeSimilarity(engine, "apollo-tn-chennai", "apollo-tn-madurai")).toBeGreaterThan(0);
    expect(storeSimilarity(engine, "apollo-tn-chennai", "apollo-tn-chennai")).toBe(1);
    expect(storeAlternatives(engine, "apollo-tn-chennai").map((p) => p.storeId)).toContain("apollo-tn-madurai");
    expect(buildRankingInputs(engine).length).toBe(2);
  });

  it("builds intelligence projection with hooks and adoption buckets", () => {
    const projection = buildStoreIntelligenceProjection(engine);
    expect(projection.hooks.length).toBe(8);
    expect(projection.byCategoryL1.HEALTHCARE).toBe(2);
    expect(projection.complianceCoverage).toBe(100);
  });
});

describe("store coverage & classification integrity (Phase 11)", () => {
  it("classifies all SP-1 stores (100%) and validates cleanly", () => {
    const { network, classification } = buildCanonicalStoreClassification();
    const coverage = classification.coverage(network.storeCount);
    expect(coverage.coveragePct).toBe(100);
    expect(coverage.classified).toBe(network.storeCount);
    const validStoreIds = new Set(network.stores().map((s) => s.id));
    expect(validateClassification(classification.profiles(), { validStoreIds }).valid).toBe(true);
    for (const profile of classification.profiles().slice(0, 200)) {
      expect(Object.keys(profile.capabilities).length).toBe(12);
      expect(profile.fulfillment.modes.length).toBeGreaterThan(0);
    }
  });
});

describe("scale certification (Phase 12)", () => {
  it("certifies 1,000 / 5,000 / 10,000 / 50,000 stores", () => {
    const results = runClassificationScaleCertification([1_000, 5_000, 10_000, 50_000]);
    for (const result of results) {
      expect(result.coveragePct).toBe(100);
      expect(result.valid).toBe(true);
      expect(result.searchReady).toBe(true);
      expect(result.recommendationReady).toBe(true);
      expect(result.intelligenceReady).toBe(true);
      expect(result.performanceOk).toBe(true);
    }
  }, 60_000);
});
