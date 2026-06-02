import { AvailabilityEngine, EligibilityEngine } from '../lib/availability/availability-engine';

async function runScaleCertification() {
  const scales = [10000, 50000, 100000];
  const results = [];

  console.log("--- PI-3 SCALE CERTIFICATION START ---");

  for (const count of scales) {
    console.log(`Testing ${count} availability records...`);
    const start = performance.now();

    const mockRecords = [];

    for (let i = 0; i < count; i++) {
      const record = AvailabilityEngine.createRecord(`p-${i}`, `s-${i % 10}`, 'sel-1', `inv-${i}`);

      // Determine eligibility (simulated context)
      const context = { storeStatus: 'open', sellerStatus: 'ACTIVE', isGeoRestricted: false };
      record.eligibility = EligibilityEngine.determineEligibility(record, context);

      mockRecords.push(record);
    }

    const end = performance.now();
    results.push({
      recordCount: count,
      durationMs: end - start,
      avgMsPerRecord: (end - start) / count,
    });

    console.log(`  Processed ${count} records in ${(end - start).toFixed(2)}ms`);
  }

  console.log("\n--- PI-3 FINAL METRICS ---");
  console.table(results);
  console.log("--- PI-3 SCALE CERTIFICATION COMPLETE ---");
}

runScaleCertification().catch(console.error);
