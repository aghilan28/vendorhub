import { Product, Vendor } from "@/types";
import { AvailabilityRecord } from "../availability/types";
import { InventoryPosition } from "../inventory/types";
import { RankingContext, StoreRankingResult, StoreSelection } from "./types";
import { DistanceEngine, AvailabilityScoreEngine, StoreQualityEngine, SellerQualityEngine } from "./scoring-engines";

export class RankingEngine {
  static rankStores(
    product: Product,
    stores: { store: Vendor; distanceKm: number }[],
    context: RankingContext,
    dependencies: { availability: AvailabilityRecord[]; positions: InventoryPosition[] }
  ): StoreRankingResult[] {
    const results: StoreRankingResult[] = stores.map(s => {
      const avail = dependencies.availability.find(a => a.storeId === s.store.id && a.productId === product.id);
      const pos = dependencies.positions.find(p => p.storeId === s.store.id && p.productId === product.id);

      const dScore = DistanceEngine.calculateScore(s.distanceKm, context.radiusKm);
      const aScore = (avail && pos) ? AvailabilityScoreEngine.calculateScore(avail, pos) : 0;
      const qScore = StoreQualityEngine.calculateScore(s.store);
      const sScore = SellerQualityEngine.calculateScore(s.store);

      const totalScore = (dScore * 0.4) + (aScore * 0.3) + (qScore * 0.2) + (sScore * 0.1);

      return {
        storeId: s.store.id,
        rank: 0,
        score: totalScore,
        distanceScore: dScore,
        availabilityScore: aScore,
        qualityScore: qScore,
        explanation: `Ranked by distance (${(dScore * 100).toFixed(0)}%), availability (${(aScore * 100).toFixed(0)}%), and quality (${(qScore * 100).toFixed(0)}%)`,
        confidence: 0.9,
      };
    });

    return results
      .sort((a, b) => b.score - a.score)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }
}

export class SelectionEngine {
  static selectStore(rankings: StoreRankingResult[]): StoreSelection {
    const recommended = rankings[0]?.storeId || '';
    const alternatives = rankings.slice(1, 3).map(r => r.storeId);
    const fallbacks = rankings.slice(3).map(r => r.storeId);

    return {
      recommendedStoreId: recommended,
      alternatives,
      fallbacks,
      selectionReason: rankings[0] ? `Best match based on ${rankings[0].explanation}` : 'No stores found',
    };
  }
}
