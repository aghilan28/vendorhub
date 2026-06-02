import { Vendor } from "@/types";
import { AvailabilityRecord } from "../availability/types";
import { InventoryPosition } from "../inventory/types";

export class DistanceEngine {
  static calculateScore(distanceKm: number, radiusKm: number): number {
    if (distanceKm > radiusKm) return 0;
    return Math.max(0, 1 - distanceKm / radiusKm);
  }
}

export class AvailabilityScoreEngine {
  static calculateScore(record: AvailabilityRecord, _position: InventoryPosition): number {
    let score = 0;
    if (record.status === 'AVAILABLE') score += 0.6;
    if (record.status === 'LOW_STOCK') score += 0.3;
    if (record.eligibility === 'PURCHASABLE') score += 0.4;
    return Math.min(1.0, score);
  }
}

export class StoreQualityEngine {
  static calculateScore(vendor: Vendor): number {
    const ratingScore = (vendor.rating || 0) / 5;
    const consistencyScore = vendor.serviceStatus === 'open' ? 1.0 : 0.5;
    return (ratingScore * 0.7) + (consistencyScore * 0.3);
  }
}

export class SellerQualityEngine {
  static calculateScore(vendor: Vendor): number {
    return vendor.verified ? 1.0 : 0.5;
  }
}
