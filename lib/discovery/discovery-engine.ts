import { Product, Vendor } from "@/types";
import { createSupabaseServerClient } from "../supabase/server";
import { DiscoveryRequest, ProductCandidate, DiscoveryResult } from "./types";
import { StoreGeoEngine } from "../geo/engines";

export class ProductDiscoveryEngine {
  static findCandidates(query: string, products: Product[]): ProductCandidate[] {
    const normalized = query.toLowerCase();
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
    universe?: {
      products: Product[];
      vendors: Vendor[];
    }
  ): Promise<DiscoveryResult[]> {
    if (!universe) {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase.rpc('search_products_hybrid', {
          query_text: request.query,
          query_embedding: null,
          match_count: request.context.limit || 20,
          category_filter: null
        });

        if (error) throw error;

        return (data || []).map((row: any) => ({
          productId: row.id,
          candidates: [{
            product: row as any,
            discoveryScore: row.hybrid_score || 1.0,
            confidence: 0.8,
            explanation: 'Database-backed hybrid search'
          }],
          stores: [],
          summary: `Found match for ${row.name}`
        }));
    }

    const candidates = ProductDiscoveryEngine.findCandidates(request.query, universe.products);
    const nearbyStores = StoreDiscoveryEngine.findNearbyStores(
      { lat: request.location.latitude, lng: request.location.longitude },
      universe.vendors,
      request.context.radiusKm
    );

    return candidates.map(candidate => ({
      productId: candidate.product.id,
      candidates: [candidate],
      stores: nearbyStores.map(s => ({ ...s, availability: { status: 'AVAILABLE', eligibility: 'PURCHASABLE' } })),
      summary: `Found ${nearbyStores.length} nearby stores for ${candidate.product.name}`,
    }));
  }
}
