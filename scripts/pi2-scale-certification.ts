import { PositionEngine } from '../lib/inventory/position-engine';
import { EventEngine } from '../lib/inventory/event-engine';

async function runScaleCertification() {
  const scales = [10000, 50000, 100000];
  const results = [];

  console.log("--- PI-2 SCALE CERTIFICATION START ---");

  for (const count of scales) {
    console.log(`Testing ${count} inventory records...`);
    const start = performance.now();

    const mockPositions = [];
    const mockEvents = [];

    for (let i = 0; i < count; i++) {
      const pos = PositionEngine.createPosition(`p-${i}`, `s-${i % 10}`, 'sel-1', `SKU-${i}`);
      pos.onHand = Math.floor(Math.random() * 100);
      mockPositions.push(pos);

      // Simulate 1 event per position
      const { event } = EventEngine.applyEvent(pos, 'RECEIVE', 10, 'Initial load', 'actor-1');
      mockEvents.push(event);
    }

    const end = performance.now();
    results.push({
      inventoryCount: count,
      eventCount: mockEvents.length,
      durationMs: end - start,
      avgMsPerRecord: (end - start) / count,
    });

    console.log(`  Processed ${count} records in ${(end - start).toFixed(2)}ms`);
  }

  console.log("\n--- PI-2 FINAL METRICS ---");
  console.table(results);
  console.log("--- PI-2 SCALE CERTIFICATION COMPLETE ---");
}

runScaleCertification().catch(console.error);
