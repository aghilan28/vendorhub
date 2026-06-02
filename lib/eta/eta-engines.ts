import { Vendor } from "@/types";
import { ETARequest, ETAResult } from "./types";

export class DistanceTimeEngine {
  private static speedMap: Record<string, number> = {
    WALKING: 5,
    BIKE: 15,
    SCOOTER: 25,
    CAR: 30,
    DELIVERY_VEHICLE: 20,
  };

  static calculateTravelTime(distanceKm: number, transport: string, traffic: string): number {
    const baseSpeed = this.speedMap[transport] || 20;
    const trafficMultiplier = traffic === 'heavy' ? 1.5 : traffic === 'light' ? 0.8 : 1.0;
    return Math.round((distanceKm / baseSpeed) * 60 * trafficMultiplier);
  }
}

export class FulfillmentEngine {
  static getPrepTime(vendor: Vendor): number {
    const type = (vendor as any).metadata?.storeType || 'supermarket';
    switch (type) {
      case 'dark_store': return 5;
      case 'pharmacy': return 8;
      case 'supermarket': return 15;
      case 'restaurant': return 20;
      default: return 12;
    }
  }

  static getStoreReadiness(vendor: Vendor): number {
    return vendor.serviceStatus === 'open' ? 1.0 : 0.5;
  }

  static getFulfillmentCapacity(vendor: Vendor): number {
    return (vendor as any).metadata?.capacity || 100;
  }
}

export class ETAEngine {
  static generateETA(request: ETARequest, vendor: Vendor): ETAResult {
    const travelTime = DistanceTimeEngine.calculateTravelTime(request.distanceKm, request.transportMode, request.trafficMode);
    const prepTime = FulfillmentEngine.getPrepTime(vendor);
    const readiness = FulfillmentEngine.getStoreReadiness(vendor);

    // Penalize ETA if readiness is low
    const adjustedPrepTime = Math.round(prepTime / readiness);
    const totalTime = travelTime + adjustedPrepTime;
    const confidence = request.distanceKm < 5 ? 0.9 : 0.7;

    return {
      storeId: vendor.id,
      estimatedMinutes: totalTime,
      minETA: Math.round(totalTime * 0.9),
      maxETA: Math.round(totalTime * 1.3),
      confidence: confidence * readiness,
      explanation: `Prep (${adjustedPrepTime}m) + Travel (${travelTime}m) via ${request.transportMode}`,
      riskLevel: (request.trafficMode === 'heavy' || readiness < 1.0) ? 'HIGH' : 'LOW',
    };
  }
}
