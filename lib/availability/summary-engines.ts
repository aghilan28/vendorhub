import { AvailabilityRecord } from './types';

export class StoreAvailabilityEngine {
  static getStoreSummary(storeId: string, records: AvailabilityRecord[]) {
    const storeRecords = records.filter(r => r.storeId === storeId);
    return {
      storeId,
      totalItems: storeRecords.length,
      purchasableItems: storeRecords.filter(r => r.eligibility === 'PURCHASABLE').length,
      readinessScore: storeRecords.length > 0 ? storeRecords.filter(r => r.eligibility === 'PURCHASABLE').length / storeRecords.length : 0,
    };
  }
}

export class ProductAvailabilityEngine {
  static getProductCoverage(productId: string, records: AvailabilityRecord[]) {
    const productRecords = records.filter(r => r.productId === productId);
    return {
      productId,
      availableStores: productRecords.filter(r => r.status === 'AVAILABLE').length,
      totalStores: productRecords.length,
      reachScore: productRecords.length > 0 ? productRecords.filter(r => r.status === 'AVAILABLE').length / productRecords.length : 0,
    };
  }
}

export class SellerAvailabilityEngine {
  static getSellerHealth(sellerId: string, records: AvailabilityRecord[]) {
    const sellerRecords = records.filter(r => r.sellerId === sellerId);
    return {
      sellerId,
      healthScore: sellerRecords.length > 0 ? sellerRecords.filter(r => r.status === 'AVAILABLE').length / sellerRecords.length : 1.0,
    };
  }
}
