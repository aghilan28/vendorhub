import { describe, expect, it } from 'vitest';
import { RankingEngine, SelectionEngine } from '../../lib/ranking/ranking-engine';
import { DistanceEngine, AvailabilityScoreEngine, StoreQualityEngine } from '../../lib/ranking/scoring-engines';
import { BuyerProjection } from '../../lib/ranking/summary-engines';
import { createVendor, createProduct, reliabilityBuyerLocation } from '../utils/fixtures';

describe('Hyperlocal Ranking Engine', () => {
  const v1 = createVendor({ id: 'v1', name: 'Close Store', rating: 4.5, serviceStatus: 'open' });
  const v2 = createVendor({ id: 'v2', name: 'Far Store', rating: 5.0, serviceStatus: 'open' });
  const product = createProduct({ id: 'p1', name: 'Milk' });

  const context = { buyerLocation: reliabilityBuyerLocation, radiusKm: 10 };
  const dependencies = {
    availability: [
      { storeId: 'v1', productId: 'p1', status: 'AVAILABLE', eligibility: 'PURCHASABLE' },
      { storeId: 'v2', productId: 'p1', status: 'AVAILABLE', eligibility: 'PURCHASABLE' },
    ] as any,
    positions: [
      { storeId: 'v1', productId: 'p1', onHand: 10, safetyStock: 2, reorderThreshold: 5 },
      { storeId: 'v2', productId: 'p1', onHand: 50, safetyStock: 2, reorderThreshold: 5 },
    ] as any,
  };

  it('calculates distance score correctly', () => {
    expect(DistanceEngine.calculateScore(2, 10)).toBe(0.8);
    expect(DistanceEngine.calculateScore(12, 10)).toBe(0);
  });

  it('ranks stores based on multiple factors', () => {
    const stores = [
      { store: v1, distanceKm: 1 },
      { store: v2, distanceKm: 8 },
    ];
    const rankings = RankingEngine.rankStores(product, stores, context, dependencies);

    expect(rankings[0].storeId).toBe('v1'); // Closer store should win
    expect(rankings[0].rank).toBe(1);
    expect(rankings[1].storeId).toBe('v2');
  });

  it('selects the best store', () => {
    const rankings = [
      { storeId: 'v1', rank: 1, score: 0.9, explanation: 'Excellent' } as any,
      { storeId: 'v2', rank: 2, score: 0.7, explanation: 'Good' } as any,
    ];
    const selection = SelectionEngine.selectStore(rankings);
    expect(selection.recommendedStoreId).toBe('v1');
    expect(selection.alternatives).toContain('v2');
  });

  it('projects rankings for buyer', () => {
    const rankings = [{ storeId: 'v1', rank: 1, score: 0.85, explanation: 'Best' } as any];
    const selection = SelectionEngine.selectStore(rankings);
    const projection = BuyerProjection.projectRankings(rankings, selection);
    expect(projection.recommended).toBe('v1');
    expect(projection.results[0].score).toBe('85.0%');
  });
});
