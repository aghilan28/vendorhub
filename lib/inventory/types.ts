export type InventoryStatus = 'ACTIVE' | 'ARCHIVED' | 'SUSPENDED';
export type InventoryType = 'PHYSICAL' | 'VIRTUAL' | 'CONSIGNMENT';
export type InventoryLifecycle = 'CREATED' | 'RESTOCKED' | 'AUDITED' | 'DEPRECATED';

export interface InventoryPosition {
  id: string;
  productId: string;
  storeId: string;
  sellerId: string;
  sku: string;
  onHand: number;
  reserved: number;
  allocated: number;
  incoming: number;
  damaged: number;
  returned: number;
  safetyStock: number;
  reorderThreshold: number;
  reorderQuantity: number;
  availableToPromise: number;
  status: InventoryStatus;
  type: InventoryType;
  lifecycle: InventoryLifecycle;
  createdAt: string;
  updatedAt: string;
}

export type InventoryEventType =
  | 'RECEIVE'
  | 'ADJUST'
  | 'TRANSFER'
  | 'RETURN'
  | 'DAMAGE'
  | 'CORRECTION'
  | 'RESTOCK'
  | 'AUDIT';

export interface InventoryEvent {
  id: string;
  inventoryId: string;
  type: InventoryEventType;
  delta: number;
  after: number;
  reason: string;
  actorId: string;
  createdAt: string;
}
