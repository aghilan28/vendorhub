import type { BuyerLocation, Product, Vendor } from "@/types";
import type { Coordinates, DeliveryFeasibility, GeoRankedProduct, GeoVendor } from "./types";

const earthRadiusKm = 6371;

export function isValidCoordinates(value?: Partial<Coordinates> | null): value is Coordinates {
  return (
    typeof value?.latitude === "number" &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    Math.abs(value.latitude) <= 90 &&
    Math.abs(value.longitude) <= 180
  );
}

export function distanceKm(origin?: Partial<Coordinates> | null, destination?: Partial<Coordinates> | null) {
  if (!isValidCoordinates(origin) || !isValidCoordinates(destination)) return null;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const latDelta = toRad(destination.latitude - origin.latitude);
  const lonDelta = toRad(destination.longitude - origin.longitude);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRad(origin.latitude)) * Math.cos(toRad(destination.latitude)) * Math.sin(lonDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(distance: number | null) {
  if (distance === null) return "Distance pending";
  if (distance < 1) return `${Math.max(120, Math.round(distance * 1000))} m away`;
  return `${distance.toFixed(distance < 10 ? 1 : 0)} km away`;
}

export function vendorCoordinates(vendor: Vendor): Coordinates | null {
  const coordinates = { latitude: vendor.latitude, longitude: vendor.longitude };
  if (!isValidCoordinates(coordinates)) return null;
  return coordinates;
}

export function deliveryFeasibility(vendor: Vendor, buyer?: BuyerLocation | null): DeliveryFeasibility {
  const distance = distanceKm(buyer, vendorCoordinates(vendor));
  const radius = vendor.serviceRadiusKm ?? null;
  if (distance === null || radius === null) {
    return { status: "unknown", distanceKm: distance, radiusKm: radius, etaMinutes: null, label: "Select location for delivery check" };
  }

  const etaMinutes = Math.round((vendor.fulfillmentPromiseMinutes ?? 30) + Math.max(0, distance - 1) * 3.5);
  if (distance <= radius) {
    const status = distance > radius * 0.82 ? "limited" : "available";
    return {
      status,
      distanceKm: distance,
      radiusKm: radius,
      etaMinutes,
      label: status === "limited" ? "Limited edge-zone delivery" : "Delivery available nearby",
    };
  }

  return { status: "outside_radius", distanceKm: distance, radiusKm: radius, etaMinutes: null, label: "Outside this seller's delivery radius" };
}

export function geoScoreForVendor(vendor: Vendor, buyer?: BuyerLocation | null) {
  const feasibility = deliveryFeasibility(vendor, buyer);
  if (feasibility.distanceKm === null || feasibility.radiusKm === null) return 0.45;
  const proximity = Math.max(0, 1 - feasibility.distanceKm / Math.max(1, feasibility.radiusKm));
  const feasibleBoost = feasibility.status === "available" ? 0.24 : feasibility.status === "limited" ? 0.1 : -0.2;
  return Math.max(0, Math.min(1, proximity * 0.76 + feasibleBoost));
}

export function withGeoProduct(product: Product, buyer?: BuyerLocation | null): GeoRankedProduct {
  const feasibility = deliveryFeasibility(product.vendor, buyer);
  return {
    product,
    distanceKm: feasibility.distanceKm,
    feasibility,
    geoScore: geoScoreForVendor(product.vendor, buyer),
  };
}

export function rankProductsByGeo(products: Product[], buyer?: BuyerLocation | null, radiusKm = 8) {
  return products
    .map((product) => withGeoProduct(product, buyer))
    .filter((item) => item.distanceKm === null || item.distanceKm <= radiusKm)
    .sort((a, b) => b.geoScore - a.geoScore || (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
}

export function rankVendorsByGeo(vendors: Vendor[], buyer?: BuyerLocation | null, radiusKm = 8): GeoVendor[] {
  return vendors
    .map((vendor) => ({ ...vendor, distanceKm: deliveryFeasibility(vendor, buyer).distanceKm, feasibility: deliveryFeasibility(vendor, buyer) }))
    .filter((vendor) => vendor.distanceKm === null || vendor.distanceKm <= radiusKm)
    .sort((a, b) => geoScoreForVendor(b, buyer) - geoScoreForVendor(a, buyer));
}
