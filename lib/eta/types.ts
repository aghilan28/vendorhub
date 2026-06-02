import type { BuyerLocation, Vendor } from "@/types";

export type TransportMode = "walking" | "bike" | "scooter" | "car" | "delivery_vehicle";

export type StoreType = "dark_store" | "pharmacy" | "supermarket" | "general_store" | "specialty_store";

export type TrafficIntensity = "light" | "normal" | "heavy" | "gridlock";

export interface ETABuyerContext {
  location: BuyerLocation;
  addressId?: string;
}

export interface ETAStoreContext {
  vendor: Vendor;
  storeType: StoreType;
  fulfillmentCapacity: number; // 0-1
  currentBacklog: number; // number of pending orders
  isOpen: boolean;
}

export interface ETAGeoContext {
  distanceKm: number;
  routeComplexity: number; // 1-5
  weatherImpact: number; // 0-1
}

export interface ETAFulfillmentContext {
  pickingTimeMinutes: number;
  packingTimeMinutes: number;
  dispatchTimeMinutes: number;
  readyStatus: "ready" | "preparing" | "backlogged";
}

export interface ETATrafficContext {
  intensity: TrafficIntensity;
  factor: number; // multiplier
  lastUpdated: string;
}

export interface ETAContext {
  buyer: ETABuyerContext;
  store: ETAStoreContext;
  geo: ETAGeoContext;
  fulfillment: ETAFulfillmentContext;
  traffic: ETATrafficContext;
  mode: TransportMode;
}

export interface ETARequest {
  id: string;
  context: ETAContext;
  requestedAt: string;
}

export interface ETARisk {
  type: "delay" | "fulfillment" | "traffic" | "capacity" | "store" | "weather";
  level: "low" | "medium" | "high" | "critical";
  score: number; // 0-1
  description: string;
}

export type ETAConfidenceLevel = "very_high" | "high" | "medium" | "low" | "unreliable";

export interface ETAConfidence {
  score: number; // 0-1
  level: ETAConfidenceLevel;
  factors: {
    dataQuality: number;
    coverageQuality: number;
    predictionReliability: number;
    historicalAccuracy: number;
  };
  explanation: string;
}

export interface ETAEstimate {
  minMinutes: number;
  maxMinutes: number;
  targetMinutes: number;
  displayWindow: string;
}

export interface ETAAuditMetadata {
  engineVersion: string;
  calculatedAt: string;
  processingTimeMs: number;
  inputSnapshot: any;
}

export interface ETAResult {
  requestId: string;
  estimate: ETAEstimate;
  confidence: ETAConfidence;
  risks: ETARisk[];
  explanation: string;
  metadata: ETAAuditMetadata;
  stabilityScore: number; // 0-1
}

export interface ETAIntelligenceSnapshot {
  storeId: string;
  averageEta: number;
  reliabilityScore: number;
  fulfillmentEfficiency: number;
  trafficSensitivity: number;
  lastUpdated: string;
}
