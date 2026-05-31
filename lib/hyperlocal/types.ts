// MCP-1C — Hyperlocal Commerce engine domain types.
//
// Deterministic + pure. Reuses lib/geo primitives (distanceKm/isValidCoordinates)
// and runs identically on live data and the clearly-labelled sample.

export type Tone = "healthy" | "watch" | "degraded" | "critical";
export type Severity = "info" | "opportunity" | "watch" | "warning" | "critical";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// ── Location foundation ───────────────────────────────────────────────────────

export interface NormalizedLocation {
  country: string;
  state?: string;
  district?: string;
  city?: string;
  zone?: string;
  locality?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  geohash?: string;
}

export interface LocationResolution {
  location: NormalizedLocation;
  valid: boolean;
  confidence: number; // 0..100
  score: number; // 0..100 completeness
  issues: string[];
}

// ── Address intelligence ──────────────────────────────────────────────────────

export type AddressKind = "buyer" | "seller" | "store" | "warehouse" | "delivery";

export interface RawAddress {
  id?: string;
  kind: AddressKind;
  raw?: string;
  recipient?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

export interface ParsedAddress {
  line1: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
}

export interface AddressReport {
  id?: string;
  kind: AddressKind;
  parsed: ParsedAddress;
  valid: boolean;
  confidence: number; // 0..100
  completeness: number; // 0..100
  deliverable: boolean;
  issues: string[];
  suggestions: string[];
  duplicateOf?: string;
}

// ── Store location network ────────────────────────────────────────────────────

export interface StoreLocation {
  storeId: string;
  name: string;
  coordinates: Coordinates;
  serviceRadiusKm: number;
  fulfillmentPromiseMinutes: number;
  zones?: string[];
  city?: string;
  rating?: number; // 0..5
  trustScore?: number; // 0..100
  capacityPerDay?: number;
  ordersToday?: number;
  fulfillmentRate?: number; // 0..100
  inStock?: boolean;
  price?: number;
}

export interface StoreCoverage {
  storeId: string;
  name: string;
  serviceRadiusKm: number;
  coverageAreaSqKm: number;
  zones: string[];
  capacityPerDay: number;
  ordersToday: number;
  utilization: number; // 0..100
  available: boolean;
}

// ── Serviceability ────────────────────────────────────────────────────────────

export type ServiceabilityStatus = "serviceable" | "limited" | "not_serviceable" | "unknown";

export type ServiceabilityCheckId = "coverage" | "distance" | "radius" | "zone" | "operational" | "risk";

export interface ServiceabilityCheck {
  id: ServiceabilityCheckId;
  passed: boolean;
  detail: string;
}

export interface ServiceabilityResult {
  status: ServiceabilityStatus;
  canDeliver: boolean;
  reason: string;
  distanceKm: number | null;
  radiusKm: number | null;
  checks: ServiceabilityCheck[];
  score: number; // 0..100
  confidence: number; // 0..100
}

// ── Store selection ───────────────────────────────────────────────────────────

export interface StoreSelectionFactor {
  distance: number;
  inventory: number;
  rating: number;
  trust: number;
  capacity: number;
  fulfillment: number;
  price: number;
}

export interface RankedStore {
  storeId: string;
  name: string;
  distanceKm: number | null;
  serviceability: ServiceabilityStatus;
  score: number; // 0..100
  factors: StoreSelectionFactor;
}

export interface StoreSelection {
  best: RankedStore | null;
  ranked: RankedStore[];
  evaluated: number;
  serviceable: number;
}

// ── Delivery estimation ───────────────────────────────────────────────────────

export interface DeliveryEstimate {
  etaMinutes: number | null;
  windowStartMinutes: number | null;
  windowEndMinutes: number | null;
  confidence: number; // 0..100
  delayRisk: number; // 0..100
  breakdown: {
    fulfillmentMinutes: number;
    travelMinutes: number;
    operationalMinutes: number;
    marketplaceMinutes: number;
  };
  label: string;
}

// ── Delivery network ──────────────────────────────────────────────────────────

export interface DeliveryZone {
  id: string;
  name: string;
  pincodes: string[];
  stores: number;
  capacityPerDay: number;
  ordersToday: number;
  utilization: number; // 0..100
  courier?: string;
  onTimeRate?: number; // 0..100
  tone: Tone;
}

export interface DeliveryNetworkSnapshot {
  zones: DeliveryZone[];
  totalCapacity: number;
  totalOrders: number;
  utilization: number; // 0..100
  serviceableZones: number;
  overloadedZones: number;
  health: number; // 0..100
  tone: Tone;
}

// ── Hyperlocal intelligence ───────────────────────────────────────────────────

export type HyperlocalRecommendationKind =
  | "coverage_gap"
  | "demand_hotspot"
  | "expansion"
  | "delivery_risk"
  | "zone_risk"
  | "territory";

export interface HyperlocalRecommendation {
  id: string;
  kind: HyperlocalRecommendationKind;
  scope: "zone" | "store" | "marketplace";
  refId: string;
  severity: Severity;
  title: string;
  detail: string;
  action: string;
  score: number; // 0..100
}

export interface CoverageCell {
  pincode: string;
  city?: string;
  stores: number;
  demand: number; // proxy: orders/interest
  serviceable: boolean;
  status: "covered" | "thin" | "gap" | "hotspot";
}

export interface HyperlocalIntelligence {
  cells: CoverageCell[];
  recommendations: HyperlocalRecommendation[];
  coverageGaps: number;
  demandHotspots: number;
  serviceablePincodes: number;
  totalPincodes: number;
  coverageRate: number; // 0..100
}

// ── Snapshots for surfaces ────────────────────────────────────────────────────

export interface SellerHyperlocalSnapshot {
  storeId: string;
  name: string;
  coverage: StoreCoverage;
  serviceabilitySample: ServiceabilityResult[];
  deliveryHealth: number; // 0..100
  zones: DeliveryZone[];
  alerts: HyperlocalRecommendation[];
  briefing: string[];
}

export interface AdminLocationSnapshot {
  network: DeliveryNetworkSnapshot;
  intelligence: HyperlocalIntelligence;
  stores: number;
  serviceablePincodes: number;
  coverageRate: number;
}
