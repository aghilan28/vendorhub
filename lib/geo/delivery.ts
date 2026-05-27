import type { BuyerLocation, Product, Vendor } from "@/types";
import { deliveryFeasibility } from "./spatial";

export function canDeliver(vendor: Vendor, buyer?: BuyerLocation | null) {
  const feasibility = deliveryFeasibility(vendor, buyer);
  return feasibility.status === "available" || feasibility.status === "limited";
}

export function productDeliveryLabel(product: Product, buyer?: BuyerLocation | null) {
  const feasibility = deliveryFeasibility(product.vendor, buyer);
  if (feasibility.status === "available" && feasibility.etaMinutes) return `${feasibility.etaMinutes}-${feasibility.etaMinutes + 8} min local delivery`;
  if (feasibility.status === "limited") return "Limited delivery in your area";
  if (feasibility.status === "outside_radius") return "Pickup or address change needed";
  return "Set location for delivery";
}
