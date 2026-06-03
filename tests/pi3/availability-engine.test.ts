import { describe, expect, it } from 'vitest';
import { AvailabilityEngine, EligibilityEngine } from '../../lib/availability/availability-engine';
import { StoreAvailabilityEngine } from '../../lib/availability/summary-engines';
import { ValidationEngine } from '../../lib/availability/governance-engine';

describe('Availability Engine', () => {
  const productId = 'p1';
  const storeId = 's1';
  const sellerId = 'sel1';
  const inventoryId = 'inv1';

  it('determines status based on inventory position', () => {
    const mockPos = {
      status: 'ACTIVE',
      onHand: 2,
      safetyStock: 5,
      reorderThreshold: 10,
    } as any;
    expect(AvailabilityEngine.determineStatus(mockPos)).toBe('CRITICAL_STOCK');

    mockPos.onHand = 0;
    expect(AvailabilityEngine.determineStatus(mockPos)).toBe('UNAVAILABLE');
  });

  it('determines eligibility based on context', () => {
    const record = AvailabilityEngine.createRecord(productId, storeId, sellerId, inventoryId);
    const context = { storeStatus: 'closed', sellerStatus: 'ACTIVE', isGeoRestricted: false };
    expect(EligibilityEngine.determineEligibility(record, context)).toBe('STORE_CLOSED');
  });

  it('validates record integrity', () => {
    const record = AvailabilityEngine.createRecord(productId, storeId, sellerId, '');
    expect(ValidationEngine.validate(record).valid).toBe(false);
    expect(ValidationEngine.validate(record).errors).toContain('MISSING_INVENTORY_LINK');
  });

  it('calculates store readiness', () => {
    const r1 = AvailabilityEngine.createRecord(productId, storeId, sellerId, inventoryId);
    r1.eligibility = 'PURCHASABLE';
    const r2 = AvailabilityEngine.createRecord('p2', storeId, sellerId, 'inv2');
    r2.eligibility = 'STORE_CLOSED';

    const summary = StoreAvailabilityEngine.getStoreSummary(storeId, [r1, r2]);
    expect(summary.readinessScore).toBe(0.5);
  });
});
