import { BuyerLocation, Product, Vendor } from "@/types";
import { AvailabilityStatus, EligibilityStatus } from "../availability/types";

export interface DiscoveryRequest {
  query: string;
  location: BuyerLocation;
  context: {
    radiusKm: number;
    limit: number;
  };
}

export interface ProductCandidate {
  product: Product;
  discoveryScore: number;
  confidence: number;
  explanation: string;
}

export interface StoreResult {
  store: Vendor;
  distanceKm: number;
  geoScore: number;
  availability: {
    status: AvailabilityStatus;
    eligibility: EligibilityStatus;
  };
}

export interface DiscoveryResult {
  productId: string;
  candidates: ProductCandidate[];
  stores: StoreResult[];
  summary: string;
}
