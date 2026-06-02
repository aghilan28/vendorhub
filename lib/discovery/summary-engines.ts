import { DiscoveryResult } from './types';

export class ValidationEngine {
  static validate(result: DiscoveryResult) {
    const errors = [];
    if (!result.productId) errors.push('MISSING_PRODUCT_ID');
    if (result.stores.some(s => !s.availability)) errors.push('MISSING_AVAILABILITY_DATA');
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export class BuyerProjection {
  static projectResults(results: DiscoveryResult[]) {
    return results.map(r => ({
      productId: r.productId,
      stores: r.stores.map(s => ({
        name: s.store.name,
        distance: `${s.distanceKm.toFixed(1)} km`,
        status: s.availability.status,
        isPurchasable: s.availability.eligibility === 'PURCHASABLE',
      })),
      summary: r.summary,
    }));
  }
}

export class IntelligenceProjection {
  static getCoverageStats(results: DiscoveryResult[]) {
    return {
      totalSearchedProducts: results.length,
      averageStoresPerProduct: results.reduce((acc, r) => acc + r.stores.length, 0) / Math.max(1, results.length),
    };
  }
}
