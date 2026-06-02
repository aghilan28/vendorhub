import type { Vendor } from "@/types";
import { distanceKm } from "./spatial";

/**
 * StoreUniverseAdapter
 * Adapts raw vendor data into the standardized Store Universe format.
 */
export class StoreUniverseAdapter {
  static adapt(vendor: Vendor) {
    return {
      id: vendor.id,
      name: vendor.name,
      location: {
        lat: vendor.latitude,
        lng: vendor.longitude,
        locality: vendor.locality,
        city: vendor.city,
      },
      capabilities: {
        delivery: !!vendor.serviceRadiusKm,
        radius_km: vendor.serviceRadiusKm ?? 5,
      },
      status: vendor.serviceStatus,
      last_updated: new Date().toISOString(), // Fallback if updated_at is missing from type
    };
  }

  static adaptMany(vendors: Vendor[]) {
    return vendors.map(this.adapt);
  }
}

/**
 * StoreGeoEngine
 * Primary engine for store geographic calculations and profile management.
 */
export class StoreGeoEngine {
  static calculateDistance(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
    return distanceKm(
      { latitude: origin.lat, longitude: origin.lng },
      { latitude: destination.lat, longitude: destination.lng }
    );
  }

  static isWithinRadius(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, radiusKm: number) {
    const dist = this.calculateDistance(origin, destination);
    return dist !== null && dist <= radiusKm;
  }
}

/**
 * PincodeEngine
 * Manages pincode-based serviceability and registration.
 */
export class PincodeEngine {
  static validatePincode(pincode: string) {
    return /^\d{6}$/.test(pincode);
  }

  static isServiceable(pincode: string, serviceablePincodes: string[]) {
    return serviceablePincodes.includes(pincode);
  }
}

/**
 * CoverageEngine
 * Manages store delivery coverage and boundaries.
 */
export class CoverageEngine {
  static calculateCoverage(vendorLocation: { lat: number; lng: number }, radiusKm: number) {
    return {
      type: "circular",
      center: vendorLocation,
      radiusKm,
    };
  }
}

/**
 * ClusterEngine
 * Identifies and manages geographic store clusters.
 */
export class ClusterEngine {
  static assignToCluster(location: { lat: number; lng: number }, clusters: any[]) {
    // Simplified cluster assignment logic
    return clusters.find(c => StoreGeoEngine.isWithinRadius(location, c.centroid, 5)) || null;
  }
}

/**
 * ZoneEngine
 * Manages marketplace zones and hierarchy.
 */
export class ZoneEngine {
  static getZone(location: { lat: number; lng: number }, zones: any[]) {
    // Simplified zone lookup
    return zones.find(z => StoreGeoEngine.isWithinRadius(location, z.centroid, 10)) || null;
  }
}

/**
 * GeoSearchProjection
 * Prepares geographic data for optimized search indexing.
 */
export class GeoSearchProjection {
  static project(vendor: any) {
    return {
      vendor_id: vendor.id,
      geo_point: [vendor.location.lng, vendor.location.lat],
      search_radius: vendor.capabilities.radius_km,
      locality_boost: 1.0,
    };
  }
}

/**
 * GeoIntelligenceEngine
 * Analyzes geographic patterns and demand.
 */
export class GeoIntelligenceEngine {
  static analyzeDemand(location: { lat: number; lng: number }, historicalOrders: any[]) {
    const nearbyOrders = historicalOrders.filter(o => StoreGeoEngine.isWithinRadius(location, o.location, 2));
    return {
      demand_score: Math.min(1, nearbyOrders.length / 100),
      is_hotspot: nearbyOrders.length > 50,
    };
  }
}

/**
 * ValidationEngine
 * Performs integrity and validation checks on geo data.
 */
export class ValidationEngine {
  static validateProfile(profile: any) {
    return !!(profile.vendor_id && profile.location.lat && profile.location.lng && profile.city);
  }
}

/**
 * GovernanceEngine
 * Enforces geographic policies and compliance.
 */
export class GovernanceEngine {
  static checkCompliance(profile: any, policy: any) {
    if (policy.restricted_cities?.includes(profile.city)) {
      return { compliant: false, reason: "RESTRICTED_CITY" };
    }
    return { compliant: true };
  }
}
