import { StoreGeoOrchestrator } from "../lib/geo/orchestrator";

/**
 * SP-3 Scale Certification Script
 * Measures the performance of the Store Geo Orchestrator at different scales.
 */
async function runScaleCertification() {
  const scales = [1000, 5000, 10000, 50000];
  const results = [];

  console.log("--- SP-3 SCALE CERTIFICATION START ---");

  for (const count of scales) {
    console.log(`Testing ${count} stores...`);

    // Generate mock vendors
    const mockVendors = Array.from({ length: count }, (_, i) => ({
      id: `v-${i}`,
      name: `Vendor ${i}`,
      latitude: 13.0 + Math.random(),
      longitude: 80.0 + Math.random(),
      locality: "T. Nagar",
      city: "Chennai",
      status: "ACTIVE",
      delivery_radius_km: 5,
      updated_at: new Date().toISOString(),
    }));

    const start = performance.now();

    // Run orchestration
    const output = StoreGeoOrchestrator.processUniverse(mockVendors as any);

    const end = performance.now();
    const durationMs = end - start;

    results.push({
      storeCount: count,
      processedCount: output.length,
      durationMs,
      avgMsPerStore: durationMs / count,
    });

    console.log(`  Completed in ${durationMs.toFixed(2)}ms (${(durationMs / count).toFixed(4)}ms per store)`);
  }

  console.log("\n--- FINAL METRICS ---");
  console.table(results);
  console.log("--- SP-3 SCALE CERTIFICATION COMPLETE ---");

  // Output for documentation
  return results;
}

runScaleCertification().catch(console.error);
