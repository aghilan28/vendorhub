// MCP-1C — Deterministic sample hyperlocal data (PREVIEW ONLY).
//
// Renders surfaces before sign-in / without Supabase. Always labelled; never
// drives a "live" count. Bengaluru-centred coordinates for realism.

import type { Coordinates, RawAddress, StoreLocation } from "./types";
import type { ZoneInput } from "./delivery-network";
import type { CoverageCellInput } from "./intelligence";

export const SAMPLE_BUYER: Coordinates = { latitude: 12.9716, longitude: 77.5946 }; // MG Road, Bengaluru

export const SAMPLE_STORES: StoreLocation[] = [
  { storeId: "s1", name: "FreshLocal Mart", coordinates: { latitude: 12.9783, longitude: 77.6408 }, serviceRadiusKm: 6, fulfillmentPromiseMinutes: 25, zones: ["east"], city: "Bengaluru", rating: 4.5, trustScore: 82, capacityPerDay: 120, ordersToday: 64, fulfillmentRate: 96, inStock: true, price: 599 },
  { storeId: "s2", name: "UrbanTech Store", coordinates: { latitude: 12.9352, longitude: 77.6245 }, serviceRadiusKm: 10, fulfillmentPromiseMinutes: 40, zones: ["south"], city: "Bengaluru", rating: 4.2, trustScore: 74, capacityPerDay: 80, ordersToday: 78, fulfillmentRate: 88, inStock: true, price: 649 },
  { storeId: "s3", name: "BloomCart", coordinates: { latitude: 13.0298, longitude: 77.5946 }, serviceRadiusKm: 5, fulfillmentPromiseMinutes: 30, zones: ["north"], city: "Bengaluru", rating: 4.7, trustScore: 88, capacityPerDay: 60, ordersToday: 20, fulfillmentRate: 98, inStock: true, price: 575 },
  { storeId: "s4", name: "MegaMart", coordinates: { latitude: 12.9141, longitude: 77.6101 }, serviceRadiusKm: 12, fulfillmentPromiseMinutes: 50, zones: ["south"], city: "Bengaluru", rating: 4.0, trustScore: 70, capacityPerDay: 200, ordersToday: 210, fulfillmentRate: 80, inStock: true, price: 540 },
  { storeId: "s5", name: "Whitefield Fresh", coordinates: { latitude: 12.9698, longitude: 77.7499 }, serviceRadiusKm: 6, fulfillmentPromiseMinutes: 30, zones: ["east"], city: "Bengaluru", rating: 4.3, trustScore: 79, capacityPerDay: 90, ordersToday: 40, fulfillmentRate: 93, inStock: false, price: 610 },
];

export const SAMPLE_ADDRESSES: RawAddress[] = [
  { id: "a1", kind: "buyer", recipient: "A. Buyer", phone: "+91 90000 12345", line1: "12 MG Road", locality: "Indiranagar", city: "Bengaluru", state: "Karnataka", pincode: "560001", latitude: 12.9716, longitude: 77.5946 },
  { id: "a2", kind: "delivery", recipient: "A. Buyer", phone: "+91 90000 12345", raw: "Tower B, Tech Park, Whitefield, Bengaluru 560066" },
  { id: "a3", kind: "store", line1: "Shop 4, Market Rd", city: "", pincode: "560034" }, // city completed from pincode
  { id: "a4", kind: "buyer", recipient: "X", phone: "bad", line1: "ab", pincode: "12" }, // invalid
  { id: "a5", kind: "delivery", recipient: "A. Buyer", phone: "+91 90000 12345", line1: "12 MG Road", locality: "Indiranagar", city: "Bengaluru", state: "Karnataka", pincode: "560001" }, // duplicate of a1 (same line1+pincode)
];

export const SAMPLE_ZONES: ZoneInput[] = [
  { id: "z-east", name: "East Bengaluru", pincodes: ["560008", "560038", "560066"], stores: 2, capacityPerDay: 210, ordersToday: 104, courier: "Delhivery", onTimeRate: 94 },
  { id: "z-south", name: "South Bengaluru", pincodes: ["560011", "560034", "560076"], stores: 2, capacityPerDay: 280, ordersToday: 288, courier: "Shiprocket", onTimeRate: 78 },
  { id: "z-north", name: "North Bengaluru", pincodes: ["560024", "560032"], stores: 1, capacityPerDay: 60, ordersToday: 20, courier: "Ecom Express", onTimeRate: 96 },
  { id: "z-central", name: "Central Bengaluru", pincodes: ["560001", "560002"], stores: 0, capacityPerDay: 0, ordersToday: 0, courier: undefined, onTimeRate: 0 },
];

export const SAMPLE_COVERAGE_CELLS: CoverageCellInput[] = [
  { pincode: "560008", city: "Bengaluru", stores: 2, demand: 40 },
  { pincode: "560034", city: "Bengaluru", stores: 1, demand: 70 }, // hotspot
  { pincode: "560001", city: "Bengaluru", stores: 0, demand: 55 }, // gap
  { pincode: "560066", city: "Bengaluru", stores: 1, demand: 30 }, // thin
  { pincode: "560024", city: "Bengaluru", stores: 1, demand: 12 }, // thin
  { pincode: "560103", city: "Bengaluru", stores: 0, demand: 22 }, // gap
];
