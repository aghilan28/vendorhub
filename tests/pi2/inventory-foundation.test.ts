import { describe, expect, it } from 'vitest';
import { PositionEngine } from '../../lib/inventory/position-engine';
import { EventEngine } from '../../lib/inventory/event-engine';
import { StoreInventoryEngine } from '../../lib/inventory/inventory-engines';
import { GovernanceEngine } from '../../lib/inventory/governance-engine';

describe('Inventory Foundation Engines', () => {
  const productId = 'p1';
  const storeId = 's1';
  const sellerId = 'sel1';
  const sku = 'SKU-001';

  it('calculates ATP correctly', () => {
    const pos = PositionEngine.createPosition(productId, storeId, sellerId, sku);
    pos.onHand = 100;
    pos.reserved = 10;
    pos.allocated = 5;
    pos.safetyStock = 5;
    expect(PositionEngine.calculateATP(pos)).toBe(80);
  });

  it('applies restock event', () => {
    const pos = PositionEngine.createPosition(productId, storeId, sellerId, sku);
    const { newOnHand, event } = EventEngine.applyEvent(pos, 'RESTOCK', 50, 'Monthly restock', 'actor-1');
    expect(newOnHand).toBe(50);
    expect(event.type).toBe('RESTOCK');
    expect(event.delta).toBe(50);
  });

  it('detects governance violations', () => {
    const pos = PositionEngine.createPosition(productId, storeId, sellerId, sku);
    pos.onHand = 5;
    pos.reserved = 10; // More reserved than on hand
    const alerts = GovernanceEngine.auditPosition(pos);
    expect(alerts).toContain('RESERVATION_OVERFLOW');
  });

  it('summarizes store inventory', () => {
    const pos1 = PositionEngine.createPosition(productId, storeId, sellerId, sku);
    pos1.onHand = 20;
    const pos2 = PositionEngine.createPosition('p2', storeId, sellerId, 'SKU-002');
    pos2.onHand = 5; // Below threshold
    const summary = StoreInventoryEngine.getStoreSummary(storeId, [pos1, pos2]);
    expect(summary.totalSKUs).toBe(2);
    expect(summary.lowStockSKUs).toBe(1);
  });
});
