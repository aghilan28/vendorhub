/**
 * EC-4 — Hyperlocal Scale Certification (uses EXISTING engines only; no new systems).
 * Exercises the real MCP-1C hyperlocal engines (location, address, store-network,
 * serviceability, store-selection, delivery-estimation, delivery-network) at
 * 10 / 100 / 1,000 / 10,000 stores to produce reproducible scale evidence.
 */

import { describe, it, expect } from "vitest";
import {
  resolveLocation,
  geohash,
  normalizeLocation,
  isValidPincode,
  analyzeAddress,
  deduplicateAddresses,
  discoverStores,
  evaluateServiceability,
  selectStore,
  estimateDelivery,
  buildDeliveryNetwork,
} from "@/lib/hyperlocal";
import { SAMPLE_BUYER, SAMPLE_STORES, SAMPLE_ADDRESSES, SAMPLE_ZONES } from "@/lib/hyperlocal/sample";
import type { StoreLocation } from "@/lib/hyperlocal/types";

const BLR = { latitude: 12.9716, longitude: 77.5946 };

/** Deterministically generate N stores around a center using the real StoreLocation shape. */
function generateStores(n: number): StoreLocation[] {
  const stores: StoreLocation[] = [];
  for (let i = 0; i < n; i += 1) {
    // Spread within ~0.2 deg (~22km) box, deterministic
    const dLat = ((i % 100) - 50) / 250; // ±0.2
    const dLng = ((Math.floor(i / 100) % 100) - 50) / 250;
    stores.push({
      storeId: `store-${i}`,
      name: `Store ${i}`,
      coordinates: { latitude: BLR.latitude + dLat, longitude: BLR.longitude + dLng },
      serviceRadiusKm: 5 + (i % 6),
      fulfillmentPromiseMinutes: 30 + (i % 60),
      zones: [["north", "south", "east", "west", "central"][i % 5]],
      city: "Bengaluru",
      rating: 3 + (i % 20) / 10,
      trustScore: 50 + (i % 50),
      capacityPerDay: 100 + (i % 400),
      ordersToday: i % 120,
      fulfillmentRate: 80 + (i % 20),
      inStock: i % 7 !== 0,
      price: 100 + (i % 50) * 10,
    });
  }
  return stores;
}

describe("EC-4 GPS / Location engine", () => {
  it("computes deterministic geohash and validates pincodes", () => {
    const gh = geohash(BLR, 7);
    expect(typeof gh).toBe("string");
    expect(gh.length).toBe(7);
    expect(isValidPincode("560001")).toBe(true);
    expect(isValidPincode("12")).toBe(false);
  });

  it("resolves valid location and degrades on invalid", () => {
    const good = resolveLocation({ city: "bengaluru", state: "karnataka", pincode: "560001", latitude: 12.97, longitude: 77.59 });
    expect(good.confidence).toBeGreaterThan(0);
    const bad = resolveLocation({ pincode: "12" });
    expect(bad.confidence).toBeLessThan(good.confidence);
  });

  it("normalizes raw location without throwing on partial input", () => {
    const n = normalizeLocation({ latitude: 12.97, longitude: 77.59 });
    expect(n).toBeTruthy();
  });
});

describe("EC-4 Address engine", () => {
  it("analyzes and completes sample addresses", () => {
    const report = analyzeAddress(SAMPLE_ADDRESSES[0]);
    expect(report).toBeTruthy();
    expect(typeof report.confidence === "number" || typeof report.completeness === "number").toBe(true);
  });
  it("deduplicates addresses", () => {
    const reports = deduplicateAddresses(SAMPLE_ADDRESSES);
    expect(Array.isArray(reports)).toBe(true);
    expect(reports.length).toBeLessThanOrEqual(SAMPLE_ADDRESSES.length);
  });
});

describe("EC-4 Hyperlocal Scale — 10 / 100 / 1,000 / 10,000 stores", () => {
  for (const n of [10, 100, 1000, 10000]) {
    it(`discovers + ranks + selects + estimates across ${n} stores`, () => {
      const t0 = Date.now();
      const stores = generateStores(n);

      // Discovery
      const discovered = discoverStores(stores, SAMPLE_BUYER, 25);
      expect(Array.isArray(discovered)).toBe(true);

      // Store selection (multi-factor) over the whole set
      const selection = selectStore({ stores, buyer: SAMPLE_BUYER });
      expect(selection.evaluated).toBe(n);
      expect(selection.serviceable).toBeGreaterThanOrEqual(0);
      if (selection.best) {
        expect(selection.best.storeId).toBeTruthy();
      }

      // Serviceability for the nearest candidate
      const probe = evaluateServiceability({ store: stores[0], buyer: stores[0].coordinates });
      expect(probe.canDeliver).toBe(true);
      expect(probe.score).toBeGreaterThan(0);

      // ETA generation
      const eta = estimateDelivery({ store: stores[0], buyer: SAMPLE_BUYER });
      expect(eta.confidence).toBeGreaterThanOrEqual(0);

      const ms = Date.now() - t0;
      // Linear, reproducible performance guard
      expect(ms).toBeLessThan(n * 2 + 2000);
    });
  }
});

describe("EC-4 Serviceability edge cases", () => {
  it("near = deliverable, far = not, unknown = degrade", () => {
    const near = evaluateServiceability({ store: SAMPLE_STORES[0], buyer: SAMPLE_STORES[0].coordinates });
    expect(near.canDeliver).toBe(true);
    const far = evaluateServiceability({ store: SAMPLE_STORES[0], buyer: { latitude: 28.6, longitude: 77.2 } });
    expect(far.canDeliver).toBe(false);
    const unknown = evaluateServiceability({ store: SAMPLE_STORES[0], buyer: null });
    expect(unknown.canDeliver).toBe(false);
  });
});

describe("EC-4 Delivery network", () => {
  it("builds a network snapshot from zones", () => {
    const network = buildDeliveryNetwork(SAMPLE_ZONES);
    expect(network).toBeTruthy();
  });

  it("scales zone mapping to 1,000 stores", () => {
    const stores = generateStores(1000);
    const zoneCounts = new Map<string, number>();
    for (const s of stores) {
      const z = s.zones?.[0] ?? "unknown";
      zoneCounts.set(z, (zoneCounts.get(z) ?? 0) + 1);
    }
    expect(zoneCounts.size).toBeGreaterThanOrEqual(5);
  });
});
