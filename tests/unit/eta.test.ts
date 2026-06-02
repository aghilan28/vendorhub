import { describe, it, expect } from 'vitest';
import { calculateETASync } from '../../lib/eta/orchestrator';
import { ETARequest } from '../../lib/eta/types';

describe('ETA Engine', () => {
  const mockRequest: ETARequest = {
    id: 'req-1',
    requestedAt: new Date().toISOString(),
    context: {
      buyer: {
        location: {
          id: 'loc-1',
          label: 'Home',
          source: 'gps',
          latitude: 13.0405,
          longitude: 80.2337,
          locality: 'T. Nagar',
          city: 'Chennai',
        },
      },
      store: {
        vendor: { id: 'vendor-1', name: 'Test Vendor' } as any,
        storeType: 'dark_store',
        fulfillmentCapacity: 0.8,
        currentBacklog: 2,
        isOpen: true,
      },
      geo: {
        distanceKm: 2.5,
        routeComplexity: 2,
        weatherImpact: 0,
      },
      fulfillment: {
        pickingTimeMinutes: 5,
        packingTimeMinutes: 3,
        dispatchTimeMinutes: 2,
        readyStatus: 'preparing',
      },
      traffic: {
        intensity: 'normal',
        factor: 1.0,
        lastUpdated: new Date().toISOString(),
      },
      mode: 'bike',
    }
  };

  it('calculates ETA correctly for a dark store with bike delivery', () => {
    const result = calculateETASync(mockRequest);

    expect(result.estimate.targetMinutes).toBeGreaterThan(5);
    expect(result.estimate.minMinutes).toBeLessThan(result.estimate.targetMinutes);
    expect(result.estimate.maxMinutes).toBeGreaterThan(result.estimate.targetMinutes);
    expect(result.confidence.score).toBeGreaterThan(0.5);
  });

  it('increases ETA when traffic intensity is heavy', () => {
    const normalTraffic = calculateETASync(mockRequest);
    const heavyTraffic = calculateETASync({
      ...mockRequest,
      context: {
        ...mockRequest.context,
        traffic: { ...mockRequest.context.traffic, intensity: 'heavy' }
      }
    });

    expect(heavyTraffic.estimate.targetMinutes).toBeGreaterThan(normalTraffic.estimate.targetMinutes);
  });

  it('adjusts fulfillment time based on store type', () => {
    const darkStore = calculateETASync(mockRequest);
    const supermarket = calculateETASync({
      ...mockRequest,
      context: {
        ...mockRequest.context,
        store: { ...mockRequest.context.store, storeType: 'supermarket' }
      }
    });

    expect(supermarket.estimate.targetMinutes).toBeGreaterThan(darkStore.estimate.targetMinutes);
  });
});
