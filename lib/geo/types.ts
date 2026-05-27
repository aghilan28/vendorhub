import type { BuyerLocation, Product, Vendor } from "@/types";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type DeliveryFeasibilityStatus = "available" | "limited" | "outside_radius" | "unknown";

export type DeliveryFeasibility = {
  status: DeliveryFeasibilityStatus;
  distanceKm: number | null;
  radiusKm: number | null;
  etaMinutes: number | null;
  label: string;
};

export type GeoRankedProduct = {
  product: Product;
  distanceKm: number | null;
  feasibility: DeliveryFeasibility;
  geoScore: number;
};

export type GeoVendor = Vendor & {
  distanceKm: number | null;
  feasibility: DeliveryFeasibility;
};

export type LocationPreset = BuyerLocation & {
  description: string;
};
