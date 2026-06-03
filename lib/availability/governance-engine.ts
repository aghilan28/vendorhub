import { AvailabilityRecord } from './types';

export class GovernanceEngine {
  static processAction(record: AvailabilityRecord, action: 'APPROVE' | 'REJECT' | 'ARCHIVE'): AvailabilityRecord {
    const lifecycleMap: Record<string, AvailabilityRecord['lifecycle']> = {
      APPROVE: 'ACTIVE',
      REJECT: 'SUSPENDED',
      ARCHIVE: 'ARCHIVED',
    };
    return {
      ...record,
      lifecycle: lifecycleMap[action] || record.lifecycle,
      updatedAt: new Date().toISOString(),
    };
  }
}

export class ValidationEngine {
  static validate(record: AvailabilityRecord) {
    const errors = [];
    if (!record.inventoryId) errors.push('MISSING_INVENTORY_LINK');
    if (!record.productId) errors.push('MISSING_PRODUCT_LINK');
    if (!record.storeId) errors.push('MISSING_STORE_LINK');
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
