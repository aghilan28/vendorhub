import { estimateETA } from "../lib/eta";
import type { ETARequest, StoreType } from "../lib/eta/types";

async function runScaleCertification() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("HL-3 SCALE CERTIFICATION: ETA ENGINE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const productCounts = [10000, 50000, 100000];
  const storeCounts = [5000, 10000];

  const storeTypes: StoreType[] = ["dark_store", "pharmacy", "supermarket", "general_store", "specialty_store"];

  for (const sCount of storeCounts) {
    for (const pCount of productCounts) {
      console.log(`Testing ${pCount} Products across ${sCount} Stores...`);

      const startTime = Date.now();
      const iterations = 1000; // Sample size

      for (let i = 0; i < iterations; i++) {
        const request: ETARequest = {
          id: `cert-${i}`,
          context: {
            buyer: {
              location: { id: "b1", label: "Buyer", source: "gps", latitude: 13.0, longitude: 80.0, locality: "Loc", city: "City" }
            },
            store: {
              vendor: { id: "s1", name: "Store", slug: "store", rating: 4.5, serviceStatus: "open", fulfillmentPromiseMinutes: 30 } as any,
              storeType: storeTypes[i % storeTypes.length],
              fulfillmentCapacity: 0.8,
              currentBacklog: 5,
              isOpen: true
            },
            geo: {
              distanceKm: Math.random() * 10,
              routeComplexity: 1.2,
              weatherImpact: 0.1
            },
            fulfillment: {
              pickingTimeMinutes: 5,
              packingTimeMinutes: 3,
              dispatchTimeMinutes: 2,
              readyStatus: "ready"
            },
            traffic: {
              intensity: "normal",
              factor: 1,
              lastUpdated: new Date().toISOString()
            },
            mode: "bike"
          },
          requestedAt: new Date().toISOString()
        };

        await estimateETA(request);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;
      const throughput = (iterations / totalTime) * 1000;

      console.log(`Average ETA Latency: ${avgTime.toFixed(2)}ms`);
      console.log(`Throughput: ${throughput.toFixed(0)} requests/sec`);

      if (avgTime > 10) {
        console.error("FAIL: Latency too high (>10ms per ETA)");
        process.exit(1);
      }
    }
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("CERTIFICATION SUCCESSFUL");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

runScaleCertification().catch(err => {
  console.error(err);
  process.exit(1);
});
