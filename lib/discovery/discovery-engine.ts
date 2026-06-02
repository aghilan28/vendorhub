import { Product, Vendor } from "@/types";
import { DiscoveryRequest, ProductCandidate, DiscoveryResult } from "./types";
import { StoreGeoEngine } from "../geo/engines";
import { AvailabilityFilter } from "./availability-filter";
import { CommerceLink } from "../commerce-graph/types";
import { AvailabilityRecord } from "../availability/types";

export class ProductDiscoveryEngine {
  static findCandidates(query: string, products: Product[]): ProductCandidate[] {
    const normalized = query.toLowerCase();
    // Optimization: limit candidates to avoid O(N*M) explosion in simulation
    return products
      .filter(p => p.name.toLowerCase().includes(normalized) || p.tags?.some(t => t.toLowerCase().includes(normalized)))
      .slice(0, 50)
      .map(p => ({
        product: p,
        discoveryScore: 1.0,
        confidence: 0.9,
        explanation: 'Matched by keyword and tags',
      }));
  }
}

export class StoreDiscoveryEngine {
  static findNearbyStores(location: { lat: number; lng: number }, vendors: Vendor[], radiusKm: number): any[] {
    return vendors
      .map(v => {
        const distance = StoreGeoEngine.calculateDistance(location, { lat: v.latitude!, lng: v.longitude! });
        return {
          store: v,
          distanceKm: distance,
          geoScore: distance !== null ? Math.max(0, 1 - distance / radiusKm) : 0,
        };
      })
      .filter(res => res.distanceKm !== null && res.distanceKm <= radiusKm);
  }
}

export class DiscoveryEngine {
  static async search(
    request: DiscoveryRequest,
    universe: {
      products: Product[];
      vendors: Vendor[];
      links: CommerceLink[];
      availability: AvailabilityRecord[];
    }
  ): Promise<DiscoveryResult[]> {
    const candidates = ProductDiscoveryEngine.findCandidates(request.query, universe.products);

    // Pre-calculate nearby stores once per search request
    const nearbyStores = StoreDiscoveryEngine.findNearbyStores(
      { lat: request.location.latitude, lng: request.location.longitude },
      universe.vendors,
      request.context.radiusKm
    );

    return candidates.map(candidate => {
      const availableStores = AvailabilityFilter.filter(
        nearbyStores,
        candidate.product.id,
        universe.links,
        universe.availability
      );

      return {
        productId: candidate.product.id,
        candidates: [candidate],
        stores: availableStores,
        summary: `Found ${availableStores.length} nearby stores for ${candidate.product.name}`,
      };
    });
  }
}
