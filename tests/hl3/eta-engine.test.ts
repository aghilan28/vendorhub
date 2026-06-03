import { describe, expect, it } from 'vitest';
import { ETAEngine, DistanceTimeEngine } from '../../lib/eta/eta-engines';
import { BuyerProjection, ETARiskEngine } from '../../lib/eta/summary-engines';

describe('ETA Engine', () => {
  const storeId = 'v1';
  const vendor = { id: storeId, serviceStatus: 'open', metadata: { storeType: 'dark_store' } } as any;

  it('calculates travel time correctly', () => {
    // 5km at 25km/h (SCOOTER) = 0.2h = 12min
    const time = DistanceTimeEngine.calculateTravelTime(5, 'SCOOTER', 'normal');
    expect(time).toBe(12);
  });

  it('generates ETA for a store', () => {
    const request = {
      productId: 'p1',
      storeId,
      distanceKm: 5,
      trafficMode: 'normal',
      transportMode: 'SCOOTER',
    } as any;

    const result = ETAEngine.generateETA(request, vendor);
    expect(result.estimatedMinutes).toBe(17); // 12 travel + 5 prep (with 1.0 readiness)
    expect(result.riskLevel).toBe('LOW');
  });

  it('projects ETA for buyer', () => {
    const result = {
      storeId,
      estimatedMinutes: 20,
      minETA: 18,
      maxETA: 25,
      confidence: 0.9,
      explanation: 'Test',
    } as any;

    const projection = BuyerProjection.projectETA(result);
    expect(projection.label).toBe('20 mins');
    expect(projection.window).toBe('18-25 mins');
  });

  it('identifies high risk ETA', () => {
    const result = { estimatedMinutes: 50, confidence: 0.9, riskLevel: 'LOW' } as any;
    expect(ETARiskEngine.analyzeRisk(result)).toBe('HIGH');
  });
});
