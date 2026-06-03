"use client";

import { useState } from 'react';
import { useLocationStore } from '@/store/location-store';
import { useCurrentLocale } from '@/components/i18n/language-switcher';
import { useSemanticMarketplaceSearch } from '@/features/intelligence/queries';
import { DiscoverySkeleton } from './discovery-skeleton';

export default function DiscoveryPage() {
  const [query, setQuery] = useState('');
  const [searchTrigger, setSearchTrigger] = useState('');
  const { currentLocation, radiusKm, nearbyOnly } = useLocationStore();
  const locale = useCurrentLocale();

  const filters = {
    category: 'all',
    availability: 'available' as const,
    sort: 'intelligent' as const,
    radiusKm,
    nearbyOnly,
  };

  // We use the real search hook which connects to the database via API
  const { data, isLoading, isError } = useSemanticMarketplaceSearch(
    searchTrigger,
    filters,
    [], // Empty products array to force DB search
    currentLocation,
    locale
  );

  const handleSearch = () => {
    setSearchTrigger(query);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Marketplace Discovery</h1>
      <p className="text-gray-500 mb-8">Direct database-backed hyperlocal discovery engine.</p>

      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search for products (e.g. Milk, Apple, Amul)"
          className="flex-1 p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {isLoading && <DiscoverySkeleton />}

      {isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          Error connecting to the discovery engine. Please check database connectivity.
        </div>
      )}

      <div className="space-y-8">
        {data?.results.map((r: any, i: number) => (
          <div key={i} className="border p-6 rounded-xl shadow-md bg-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{r.product.name}</h2>
                <p className="text-sm text-gray-500">{r.product.category.name} • {r.product.vendor.name}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">Rs {r.product.price}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Match Score: {(r.score * 100).toFixed(1)}%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Logistics & ETA</h3>
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-bold">
                    {r.eta?.label || 'Calculating...'}
                  </div>
                  <div className="text-sm text-slate-600">
                    {r.distanceKm?.toFixed(2)} km away
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2 italic">{r.eta?.explanation}</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="text-xs font-bold text-blue-400 uppercase mb-2">Discovery Intelligence</h3>
                <div className="flex flex-wrap gap-1">
                  {r.explanations?.map((exp: string, idx: number) => (
                    <span key={idx} className="bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded text-[10px] font-medium">
                      {exp}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 border border-dashed border-gray-200">
              {r.explanation}
            </div>
          </div>
        ))}

        {data && data.results.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-gray-400 font-medium">No results found for &quot;{searchTrigger}&quot;</p>
            <p className="text-sm text-gray-300 mt-1">Try searching for broader terms like &quot;Milk&quot; or &quot;Electronics&quot;</p>
          </div>
        )}
      </div>

      {data?.intelligence && (
        <div className="mt-12 p-6 bg-slate-900 rounded-xl text-white">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            Engine Diagnostics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-slate-400 mb-1 uppercase text-[10px] font-bold tracking-widest">Mode</p>
              <p className="font-mono text-emerald-400 uppercase">{data.mode}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-1 uppercase text-[10px] font-bold tracking-widest">Latency</p>
              <p className="font-mono text-emerald-400">{data.latencyMs}ms</p>
            </div>
            <div>
              <p className="text-slate-400 mb-1 uppercase text-[10px] font-bold tracking-widest">Confidence</p>
              <p className="font-mono text-emerald-400 uppercase">{data.intelligence.confidence}</p>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-slate-400 mb-2 uppercase text-[10px] font-bold tracking-widest">Signals Processed</p>
            <div className="flex flex-wrap gap-2">
              {data.intelligence.signals.map((s: string, idx: number) => (
                <span key={idx} className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-[11px] font-mono">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
