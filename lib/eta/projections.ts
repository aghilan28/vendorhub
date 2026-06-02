import type { ETAResult, ETAIntelligenceSnapshot } from "./types";

export interface BuyerETAProjection {
  etaMinutes: number;
  window: string;
  confidence: string;
  explanation: string;
  isHighRisk: boolean;
  risks: string[];
}

export function projectBuyerETA(result: ETAResult): BuyerETAProjection {
  return {
    etaMinutes: result.estimate.targetMinutes,
    window: result.estimate.displayWindow,
    confidence: result.confidence.level,
    explanation: result.explanation,
    isHighRisk: result.risks.some(r => r.level === "high" || r.level === "critical"),
    risks: result.risks.map(r => r.description),
  };
}

export function projectIntelligenceSnapshot(storeId: string, results: ETAResult[]): ETAIntelligenceSnapshot {
  const avgEta = results.reduce((acc, r) => acc + r.estimate.targetMinutes, 0) / results.length;
  const reliability = results.filter(r => r.confidence.score > 0.7).length / results.length;

  return {
    storeId,
    averageEta: Math.round(avgEta),
    reliabilityScore: Number(reliability.toFixed(2)),
    fulfillmentEfficiency: 0.92, // Placeholder
    trafficSensitivity: 0.45, // Placeholder
    lastUpdated: new Date().toISOString(),
  };
}
