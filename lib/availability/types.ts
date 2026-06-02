export type AvailabilityStatus =
  | 'AVAILABLE'
  | 'LOW_STOCK'
  | 'CRITICAL_STOCK'
  | 'UNAVAILABLE'
  | 'DISCONTINUED'
  | 'RESTRICTED'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'FUTURE_RESTOCK';

export type EligibilityStatus =
  | 'PURCHASABLE'
  | 'NOT_PURCHASABLE'
  | 'RESTRICTED'
  | 'SELLER_BLOCKED'
  | 'STORE_CLOSED'
  | 'INVENTORY_EXHAUSTED'
  | 'COMPLIANCE_RESTRICTED'
  | 'GEO_RESTRICTED';

export interface AvailabilityRecord {
  id: string;
  productId: string;
  storeId: string;
  sellerId: string;
  inventoryId: string;
  status: AvailabilityStatus;
  eligibility: EligibilityStatus;
  type: 'PHYSICAL' | 'VIRTUAL';
  source: 'SYSTEM' | 'MANUAL' | 'AI_PREDICTED';
  confidence: number;
  lifecycle: 'ACTIVE' | 'ARCHIVED' | 'SUSPENDED';
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
