import { AvailabilityRecord } from './types';

export class BuyerProjection {
  static getStoreAvailability(productId: string, records: AvailabilityRecord[]) {
    return records
      .filter(r => r.productId === productId && r.lifecycle === 'ACTIVE')
      .map(r => ({
        storeId: r.storeId,
        status: r.status,
        isPurchasable: r.eligibility === 'PURCHASABLE',
      }));
  }
}

export class IntelligenceProjection {
  static getAvailabilityRisk(storeId: string, records: AvailabilityRecord[]) {
    const storeRecords = records.filter(r => r.storeId === storeId);
    const lowStockCount = storeRecords.filter(r => r.status === 'LOW_STOCK' || r.status === 'CRITICAL_STOCK').length;
    return {
      storeId,
      riskScore: storeRecords.length > 0 ? lowStockCount / storeRecords.length : 0.0,
      isHighRisk: (storeRecords.length > 0 ? lowStockCount / storeRecords.length : 0) > 0.5,
    };
  }
}
