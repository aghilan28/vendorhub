"use client";

import { useState } from 'react';
import { DiscoveryEngine } from '@/lib/discovery/discovery-engine';
import { BuyerProjection } from '@/lib/discovery/summary-engines';
import { useLocationStore } from '@/store/location-store';

export default function DiscoveryPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const { currentLocation } = useLocationStore();

  const handleSearch = async () => {
    if (!currentLocation) return;

    // In a real app, these would come from an API
    const mockUniverse = {
      products: [],
      vendors: [],
      links: [],
      availability: [],
    };

    const request = {
      query,
      location: currentLocation,
      context: { radiusKm: 8, limit: 10 },
    };

    const searchResults = await DiscoveryEngine.search(request, mockUniverse);
    setResults(BuyerProjection.projectResults(searchResults));
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Nearby Product Discovery</h1>
      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a product..."
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Search
        </button>
      </div>

      <div className="space-y-6">
        {results.map((r, i) => (
          <div key={i} className="border p-4 rounded shadow-sm">
            <h2 className="font-semibold text-lg mb-2">Results for Product ID: {r.productId}</h2>
            <div className="space-y-2">
              {r.stores.map((s: any, j: number) => (
                <div key={j} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-gray-500">{s.distance}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm ${s.isPurchasable ? 'text-green-600' : 'text-red-600'}`}>
                      {s.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {r.stores.length === 0 && <p className="text-gray-500">No nearby stores found.</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
