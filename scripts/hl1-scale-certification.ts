import { DiscoveryEngine } from '../lib/discovery/discovery-engine';

async function runScaleCertification() {
  const pScales = [10000, 50000, 100000];
  const sScales = [5000, 10000];
  const results = [];

  console.log("--- HL-1 SCALE CERTIFICATION START ---");

  for (const pCount of pScales) {
    for (const sCount of sScales) {
      console.log(`Testing ${pCount} products and ${sCount} stores...`);

      const mockProducts = Array.from({ length: pCount }, (_, i) => ({ id: `p-${i}`, name: `Product ${i}`, tags: [] }));
      const mockVendors = Array.from({ length: sCount }, (_, i) => ({ id: `v-${i}`, latitude: 12.97, longitude: 77.64 }));

      const request = {
        query: 'Product 1',
        location: { latitude: 12.9719, longitude: 77.6412 } as any,
        context: { radiusKm: 8, limit: 10 },
      };

      const universe = {
        products: mockProducts as any,
        vendors: mockVendors as any,
        links: [{ productId: 'p-1', storeId: 'v-1' }] as any,
        availability: [{ productId: 'p-1', storeId: 'v-1', status: 'AVAILABLE', eligibility: 'PURCHASABLE' }] as any,
      };

      const start = performance.now();
      const output = await DiscoveryEngine.search(request, universe);
      const end = performance.now();

      results.push({
        products: pCount,
        stores: sCount,
        durationMs: end - start,
      });

      console.log(`  Found ${output.length} candidates in ${(end - start).toFixed(2)}ms`);
    }
  }

  console.log("\n--- HL-1 FINAL METRICS ---");
  console.table(results);
  console.log("--- HL-1 SCALE CERTIFICATION COMPLETE ---");
}

runScaleCertification().catch(console.error);
