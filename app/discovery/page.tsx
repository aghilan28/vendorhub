"use client";

import { useState } from 'react';
import { DiscoveryEngine } from '@/lib/discovery/discovery-engine';
import { RankingEngine, SelectionEngine } from '@/lib/ranking/ranking-engine';
import { BuyerProjection as RankingProjection } from '@/lib/ranking/summary-engines';
import { useLocationStore } from '@/store/location-store';

export default function DiscoveryPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const { currentLocation } = useLocationStore();

  const handleSearch = async () => {
    if (!currentLocation) return;

    // Mock universes for demonstration
    const mockUniverse = {
      products: [
        { id: 'p1', name: 'Aavin Milk 500ml', tags: ['milk', 'dairy'], vendor: { id: 'v1' } } as any,
        { id: 'p1', name: 'Aavin Milk 500ml', tags: ['milk', 'dairy'], vendor: { id: 'v2' } } as any,
      ],
      vendors: [
        { id: 'v1', name: 'Ratna Stores', latitude: currentLocation.latitude + 0.01, longitude: currentLocation.longitude + 0.01, rating: 4.2, verified: true, serviceStatus: 'open' } as any,
        { id: 'v2', name: 'Nilgiris', latitude: currentLocation.latitude + 0.02, longitude: currentLocation.longitude + 0.02, rating: 4.8, verified: true, serviceStatus: 'open' } as any,
      ],
      links: [
        { productId: 'p1', storeId: 'v1', status: 'APPROVED' } as any,
        { productId: 'p1', storeId: 'v2', status: 'APPROVED' } as any,
      ],
      availability: [
        { productId: 'p1', storeId: 'v1', status: 'AVAILABLE', eligibility: 'PURCHASABLE' } as any,
        { productId: 'p1', storeId: 'v2', status: 'LOW_STOCK', eligibility: 'PURCHASABLE' } as any,
      ],
      positions: [
        { productId: 'p1', storeId: 'v1', onHand: 20, safetyStock: 2, reorderThreshold: 5 } as any,
        { productId: 'p1', storeId: 'v2', onHand: 4, safetyStock: 2, reorderThreshold: 5 } as any,
      ]
    };

    const request = {
      query,
      location: currentLocation,
      context: { radiusKm: 8, limit: 10 },
    };

    const discoveryResults = await DiscoveryEngine.search(request, mockUniverse);

    const enrichedResults = discoveryResults.map(dr => {
      const rankings = RankingEngine.rankStores(
        mockUniverse.products.find(p => p.id === dr.productId) as any,
        dr.stores.map(s => ({ store: s.store, distanceKm: s.distanceKm })),
        { buyerLocation: currentLocation, radiusKm: 8 },
        { availability: mockUniverse.availability, positions: mockUniverse.positions }
      );
      const selection = SelectionEngine.selectStore(rankings);
      return RankingProjection.projectRankings(rankings, selection);
    });

    setResults(enrichedResults);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Hyperlocal Store Selection</h1>
      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Aavin Milk"
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Search
        </button>
      </div>

      <div className="space-y-8">
        {results.map((r, i) => (
          <div key={i} className="border p-6 rounded-lg shadow-md bg-white">
            <h2 className="text-xl font-bold mb-4 text-blue-800">Recommendation: {r.summary}</h2>
            <div className="space-y-4">
              {r.results.map((s: any, j: number) => (
                <div key={j} className={`p-4 border rounded-md ${s.storeId === r.recommended ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg">
                        {s.storeId === r.recommended && <span className="mr-2 text-green-600">★</span>}
                        Store ID: {s.storeId}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{s.reason}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-blue-600">{s.score} Match</div>
                      <div className="text-xs uppercase font-semibold text-gray-400 mt-1">Rank #{s.rank}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
