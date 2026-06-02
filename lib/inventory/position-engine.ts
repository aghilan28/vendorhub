import { InventoryPosition } from './types';

export class PositionEngine {
  static createPosition(productId: string, storeId: string, sellerId: string, sku: string): InventoryPosition {
    return {
      id: `inv-${productId}-${storeId}`,
      productId,
      storeId,
      sellerId,
      sku,
      onHand: 0,
      reserved: 0,
      allocated: 0,
      incoming: 0,
      damaged: 0,
      returned: 0,
      safetyStock: 5,
      reorderThreshold: 10,
      reorderQuantity: 20,
      availableToPromise: 0,
      status: 'ACTIVE',
      type: 'PHYSICAL',
      lifecycle: 'CREATED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  static calculateATP(position: InventoryPosition): number {
    // Available To Promise = On Hand - Reserved - Allocated - Safety Stock
    return Math.max(0, position.onHand - position.reserved - position.allocated - position.safetyStock);
  }

  static updatePosition(position: InventoryPosition, updates: Partial<InventoryPosition>): InventoryPosition {
    const updated = { ...position, ...updates, updatedAt: new Date().toISOString() };
    updated.availableToPromise = this.calculateATP(updated);
    return updated;
  }
}
