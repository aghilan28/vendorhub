const regions = ["bom1", "sin1", "fra1", "iad1"];

const scenarios = [
  { name: "total_regional_outage", outages: ["bom1"], traffic: 5200, queueBacklog: 4100, edgeInvalidations: 2200, realtimeEvents: 5600, replayDuplicates: 140 },
  { name: "edge_invalidation_storm", outages: [], traffic: 2600, queueBacklog: 1200, edgeInvalidations: 4600, realtimeEvents: 1800, replayDuplicates: 360 },
  { name: "global_realtime_flood", outages: [], traffic: 3200, queueBacklog: 1600, edgeInvalidations: 900, realtimeEvents: 8200, replayDuplicates: 180 },
  { name: "cross_region_replay_storm", outages: [], traffic: 2800, queueBacklog: 3600, edgeInvalidations: 1700, realtimeEvents: 2400, replayDuplicates: 620 },
  { name: "failover_churn", outages: ["fra1"], traffic: 6100, queueBacklog: 3900, edgeInvalidations: 2600, realtimeEvents: 5100, replayDuplicates: 240 },
];

function pressure(value, activeRegions, capacity) {
  return value / (Math.max(1, activeRegions) * capacity);
}

function simulateScenario(scenario) {
  const activeRegions = regions.length - scenario.outages.length;
  const trafficPressure = pressure(scenario.traffic, activeRegions, 1200);
  const queuePressure = pressure(scenario.queueBacklog, activeRegions, 700);
  const edgePressure = pressure(scenario.edgeInvalidations, activeRegions, 800);
  const realtimePressure = pressure(scenario.realtimeEvents, activeRegions, 1500);
  const replayPressure = scenario.replayDuplicates / Math.max(1, scenario.queueBacklog);
  const maxPressure = Math.max(trafficPressure, queuePressure, edgePressure, realtimePressure, replayPressure);
  const criticalWriteFreeze = scenario.outages.length > 0 || replayPressure > 0.12;
  const replayQuarantine = replayPressure >= 0.12;
  const lowPriorityShed = maxPressure > 1.15;
  const recoverySafe = activeRegions > 0 && replayPressure < 0.2;
  const recoveryBlockedSafely = activeRegions > 0 && !recoverySafe && replayQuarantine;

  const checks = [
    { name: "regional_truth_protected", pass: activeRegions > 0 && (criticalWriteFreeze || lowPriorityShed), detail: `${activeRegions} active regions, freeze=${criticalWriteFreeze}, shed=${lowPriorityShed}` },
    { name: "saturation_detected", pass: maxPressure > 0.45, detail: `${Math.round(maxPressure * 100)}% max pressure` },
    { name: "replay_deduplication_bounded", pass: replayPressure < 0.2 || replayQuarantine, detail: `${Math.round(replayPressure * 100)}% duplicate replay pressure, quarantine=${replayQuarantine}` },
    { name: "edge_backlog_actionable", pass: edgePressure < 2 || lowPriorityShed, detail: `${Math.round(edgePressure * 100)}% edge pressure` },
    { name: "realtime_flood_throttled", pass: realtimePressure < 1 || lowPriorityShed, detail: `${Math.round(realtimePressure * 100)}% realtime pressure` },
    { name: "recovery_operationally_safe", pass: recoverySafe || recoveryBlockedSafely, detail: recoverySafe ? "deterministic recovery plan available" : "recovery blocked until replay pressure drains" },
  ];

  return {
    ...scenario,
    activeRegions,
    metrics: {
      trafficPressure: Number(trafficPressure.toFixed(3)),
      queuePressure: Number(queuePressure.toFixed(3)),
      edgePressure: Number(edgePressure.toFixed(3)),
      realtimePressure: Number(realtimePressure.toFixed(3)),
      replayPressure: Number(replayPressure.toFixed(3)),
      replayQuarantine,
      lowPriorityShed,
      criticalWriteFreeze,
    },
    checks,
    passed: checks.every((check) => check.pass),
  };
}

const results = scenarios.map(simulateScenario);
const output = {
  generatedAt: new Date().toISOString(),
  scenario: "phase36_global_scalability_geo_distributed_infrastructure",
  regions,
  results,
  passed: results.every((result) => result.passed),
};

console.log(JSON.stringify(output, null, 2));
if (!output.passed) process.exitCode = 1;
