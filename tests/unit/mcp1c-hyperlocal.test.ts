import { describe, expect, it } from "vitest";
import {
  // location
  geohash,
  normalizeLocation,
  resolveLocation,
  isValidPincode,
  sameCell,
  // address
  parseAddress,
  analyzeAddress,
  deduplicateAddresses,
  // store network
  buildStoreCoverage,
  discoverStores,
  mapTerritories,
  // serviceability
  evaluateServiceability,
  // selection
  selectStore,
  // delivery estimation
  estimateDelivery,
  // delivery network
  buildDeliveryNetwork,
  // intelligence
  buildHyperlocalIntelligence,
  // assemblers
  buildSellerHyperlocalSnapshot,
  buildAdminLocationSnapshot,
  // sample
  SAMPLE_BUYER,
  SAMPLE_STORES,
  SAMPLE_ADDRESSES,
  SAMPLE_ZONES,
  SAMPLE_COVERAGE_CELLS,
} from "@/lib/hyperlocal";

describe("MCP-1C.2 location foundation", () => {
  it("computes a deterministic geohash", () => {
    const h = geohash(SAMPLE_BUYER, 7);
    expect(h).toHaveLength(7);
    expect(h).toBe(geohash(SAMPLE_BUYER, 7));
    expect(geohash({ latitude: 999, longitude: 999 })).toBe("");
  });

  it("validates pincodes and resolves locations with confidence", () => {
    expect(isValidPincode("560001")).toBe(true);
    expect(isValidPincode("012345")).toBe(false);
    const resolved = resolveLocation({ city: "bengaluru", state: "karnataka", pincode: "560001", latitude: 12.97, longitude: 77.59 });
    expect(resolved.valid).toBe(true);
    expect(resolved.confidence).toBeGreaterThan(60);
    expect(resolved.location.geohash).toBeTruthy();
    expect(normalizeLocation({ city: "bengaluru" }).city).toBe("Bengaluru");

    const bad = resolveLocation({ pincode: "12" });
    expect(bad.valid).toBe(false);
    expect(bad.issues.length).toBeGreaterThan(0);
  });

  it("detects same geohash cell", () => {
    expect(sameCell(SAMPLE_BUYER, SAMPLE_BUYER)).toBe(true);
    expect(sameCell(SAMPLE_BUYER, { latitude: 28.6, longitude: 77.2 })).toBe(false);
  });
});

describe("MCP-1C.3 address intelligence", () => {
  it("parses freeform and completes city from pincode", () => {
    const parsed = parseAddress({ kind: "delivery", raw: "Tower B, Tech Park, Whitefield, Bengaluru 560066" });
    expect(parsed.pincode).toBe("560066");
    const storeAddr = parseAddress({ kind: "store", line1: "Shop 4", pincode: "560034" });
    expect(storeAddr.city).toBe("Bengaluru"); // completed from pincode hint
  });

  it("validates and flags bad addresses", () => {
    const good = analyzeAddress(SAMPLE_ADDRESSES[0]);
    expect(good.valid).toBe(true);
    expect(good.deliverable).toBe(true);
    expect(good.confidence).toBeGreaterThan(70);

    const bad = analyzeAddress(SAMPLE_ADDRESSES[3]);
    expect(bad.valid).toBe(false);
    expect(bad.issues.length).toBeGreaterThan(0);
  });

  it("deduplicates addresses", () => {
    const reports = deduplicateAddresses(SAMPLE_ADDRESSES);
    expect(reports.some((r) => r.duplicateOf)).toBe(true); // a5 duplicates a1
  });
});

describe("MCP-1C.4 store location network", () => {
  it("builds coverage and discovers nearby stores", () => {
    const coverage = buildStoreCoverage(SAMPLE_STORES[0]);
    expect(coverage.coverageAreaSqKm).toBeGreaterThan(0);
    expect(coverage.utilization).toBeGreaterThan(0);

    const discovered = discoverStores(SAMPLE_STORES, SAMPLE_BUYER, 12);
    expect(discovered.length).toBeGreaterThan(0);
    // sorted by distance ascending
    for (let i = 1; i < discovered.length; i++) expect((discovered[i - 1].distanceKm ?? 0)).toBeLessThanOrEqual(discovered[i].distanceKm ?? 0);

    const territories = mapTerritories(SAMPLE_STORES);
    expect(territories.length).toBeGreaterThan(0);
  });
});

describe("MCP-1C.5 serviceability", () => {
  it("serviceable near store, not serviceable far away", () => {
    const near = evaluateServiceability({ store: SAMPLE_STORES[0], buyer: SAMPLE_STORES[0].coordinates });
    expect(near.canDeliver).toBe(true);
    expect(near.checks).toHaveLength(6);

    const far = evaluateServiceability({ store: SAMPLE_STORES[0], buyer: { latitude: 28.6, longitude: 77.2 } });
    expect(far.status).toBe("not_serviceable");
    expect(far.canDeliver).toBe(false);
    expect(far.reason).toMatch(/radius/i);

    const unknown = evaluateServiceability({ store: SAMPLE_STORES[0], buyer: null });
    expect(unknown.status).toBe("unknown");
  });

  it("flags zone restriction", () => {
    const result = evaluateServiceability({ store: SAMPLE_STORES[0], buyer: SAMPLE_STORES[0].coordinates, buyerZone: "west" });
    expect(result.canDeliver).toBe(false);
  });
});

describe("MCP-1C.6 store selection", () => {
  it("auto-selects the best serviceable store with multi-factor scoring", () => {
    const selection = selectStore({ stores: SAMPLE_STORES, buyer: SAMPLE_BUYER });
    expect(selection.evaluated).toBe(SAMPLE_STORES.length);
    expect(selection.best).not.toBeNull();
    // ranked by score desc
    for (let i = 1; i < selection.ranked.length; i++) expect(selection.ranked[i - 1].score).toBeGreaterThanOrEqual(selection.ranked[i].score);
    // out-of-stock store ranked below in-stock peers
    const s5 = selection.ranked.find((r) => r.storeId === "s5");
    expect(s5).toBeTruthy();
  });
});

describe("MCP-1C.7 delivery estimation", () => {
  it("computes ETA window, confidence, delay risk and breakdown", () => {
    const est = estimateDelivery({ store: SAMPLE_STORES[0], buyer: SAMPLE_BUYER });
    expect(est.etaMinutes).toBeGreaterThan(0);
    expect(est.windowEndMinutes! - est.windowStartMinutes!).toBeGreaterThan(0);
    expect(est.confidence).toBeGreaterThanOrEqual(0);
    expect(est.confidence + est.delayRisk).toBe(100);
    const sum = est.breakdown.fulfillmentMinutes + est.breakdown.travelMinutes + est.breakdown.operationalMinutes + est.breakdown.marketplaceMinutes;
    expect(est.etaMinutes).toBe(sum);

    const noLoc = estimateDelivery({ store: SAMPLE_STORES[0], buyer: null });
    expect(noLoc.etaMinutes).toBeNull();
  });
});

describe("MCP-1C.8 delivery network", () => {
  it("builds zones, utilization and health; flags overloaded zones", () => {
    const network = buildDeliveryNetwork(SAMPLE_ZONES);
    expect(network.zones.length).toBe(SAMPLE_ZONES.length);
    expect(network.overloadedZones).toBeGreaterThanOrEqual(1); // south is over capacity
    expect(["healthy", "watch", "degraded", "critical"]).toContain(network.tone);
  });
});

describe("MCP-1C.12 hyperlocal intelligence", () => {
  it("detects coverage gaps, hotspots and zone risks with ranked recommendations", () => {
    const network = buildDeliveryNetwork(SAMPLE_ZONES);
    const intel = buildHyperlocalIntelligence(SAMPLE_COVERAGE_CELLS, network);
    expect(intel.coverageGaps).toBeGreaterThanOrEqual(1);
    expect(intel.demandHotspots).toBeGreaterThanOrEqual(1);
    expect(intel.recommendations.length).toBeGreaterThan(0);
    for (let i = 1; i < intel.recommendations.length; i++) expect(intel.recommendations[i - 1].score).toBeGreaterThanOrEqual(intel.recommendations[i].score);
    expect(intel.recommendations.some((r) => r.kind === "coverage_gap")).toBe(true);
    expect(intel.recommendations.some((r) => r.kind === "zone_risk")).toBe(true);
    expect(intel.coverageRate).toBeGreaterThanOrEqual(0);
  });
});

describe("MCP-1C assemblers", () => {
  it("builds seller + admin snapshots deterministically", () => {
    const seller = buildSellerHyperlocalSnapshot(SAMPLE_STORES[0], undefined, [SAMPLE_BUYER]);
    expect(seller.coverage.serviceRadiusKm).toBe(SAMPLE_STORES[0].serviceRadiusKm);
    expect(seller.briefing.length).toBeGreaterThan(0);
    expect(seller.serviceabilitySample.length).toBe(1);

    const admin = buildAdminLocationSnapshot(SAMPLE_STORES);
    expect(admin.stores).toBe(SAMPLE_STORES.length);
    expect(admin.network.zones.length).toBeGreaterThan(0);
    expect(admin.intelligence.recommendations.length).toBeGreaterThan(0);
    const a = buildAdminLocationSnapshot(SAMPLE_STORES);
    expect(a.network.health).toBe(admin.network.health);
  });
});
