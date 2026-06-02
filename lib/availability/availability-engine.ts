import { AvailabilityRecord, AvailabilityStatus, EligibilityStatus } from './types';
import { InventoryPosition } from '../inventory/types';

export class AvailabilityEngine {
  static determineStatus(position: InventoryPosition): AvailabilityStatus {
    if (position.status !== 'ACTIVE') return 'UNAVAILABLE';
    if (position.onHand <= 0) return 'UNAVAILABLE';
    if (position.onHand <= position.safetyStock) return 'CRITICAL_STOCK';
    if (position.onHand <= position.reorderThreshold) return 'LOW_STOCK';
    return 'AVAILABLE';
  }

  static createRecord(productId: string, storeId: string, sellerId: string, inventoryId: string): AvailabilityRecord {
    return {
      id: `avail-${productId}-${storeId}`,
      productId,
      storeId,
      sellerId,
      inventoryId,
      status: 'AVAILABLE',
      eligibility: 'PURCHASABLE',
      type: 'PHYSICAL',
      source: 'SYSTEM',
      confidence: 1.0,
      lifecycle: 'ACTIVE',
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export class EligibilityEngine {
  static determineEligibility(
    record: AvailabilityRecord,
    context: { storeStatus: string; sellerStatus: string; isGeoRestricted: boolean }
  ): EligibilityStatus {
    if (context.sellerStatus !== 'ACTIVE') return 'SELLER_BLOCKED';
    if (context.storeStatus !== 'open') return 'STORE_CLOSED';
    if (context.isGeoRestricted) return 'GEO_RESTRICTED';
    if (record.status === 'UNAVAILABLE') return 'INVENTORY_EXHAUSTED';
    if (record.status === 'RESTRICTED') return 'RESTRICTED';
    return 'PURCHASABLE';
  }
}
