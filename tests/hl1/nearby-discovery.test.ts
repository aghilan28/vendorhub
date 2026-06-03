import { describe, expect, it } from 'vitest';
import { DiscoveryEngine, ProductDiscoveryEngine, StoreDiscoveryEngine } from '../../lib/discovery/discovery-engine';
import { BuyerProjection } from '../../lib/discovery/summary-engines';
import { createVendor, createProduct, reliabilityBuyerLocation } from '../utils/fixtures';

describe('Nearby Product Discovery Engine', () => {
  const vendor = createVendor({ id: 'v1', latitude: 12.97, longitude: 77.64 });
  const product = createProduct({ id: 'p1', vendor });
  const link = { productId: 'p1', storeId: 'v1', sellerId: 'sel1' } as any;
  const avail = { productId: 'p1', storeId: 'v1', status: 'AVAILABLE', eligibility: 'PURCHASABLE' } as any;

  const universe = {
    products: [product],
    vendors: [vendor],
    links: [link],
    availability: [avail],
  };

  it('finds candidate products by keyword', () => {
    const candidates = ProductDiscoveryEngine.findCandidates('Tomato', universe.products);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].product.id).toBe('p1');
  });

  it('finds nearby stores for a location', () => {
    const nearby = StoreDiscoveryEngine.findNearbyStores(
      { lat: 12.9719, lng: 77.6412 },
      universe.vendors,
      5
    );
    expect(nearby.length).toBe(1);
    expect(nearby[0].store.id).toBe('v1');
  });

  it('performs full discovery search', async () => {
    const request = {
      query: 'Tomato',
      location: reliabilityBuyerLocation,
      context: { radiusKm: 8, limit: 10 },
    };
    const results = await DiscoveryEngine.search(request, universe);
    expect(results.length).toBe(1);
    expect(results[0].stores.length).toBe(1);
    expect(results[0].stores[0].availability.status).toBe('AVAILABLE');
  });

  it('projects results for the buyer', async () => {
    const request = {
      query: 'Tomato',
      location: reliabilityBuyerLocation,
      context: { radiusKm: 8, limit: 10 },
    };
    const results = await DiscoveryEngine.search(request, universe);
    const projection = BuyerProjection.projectResults(results);
    expect(projection[0].stores[0].name).toBe(vendor.name);
    expect(projection[0].stores[0].isPurchasable).toBe(true);
  });
});
