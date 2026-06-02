import type { ETAContext, ETAConfidence, ETARisk, ETAConfidenceLevel } from "./types";
import { TravelTimeResult, FulfillmentTiming } from "./engines";

export function calculateETAConfidence(
  context: ETAContext,
  travel: TravelTimeResult,
  fulfillment: FulfillmentTiming,
  risks: ETARisk[]
): ETAConfidence {
  const dataQuality = calculateDataQuality(context);
  const coverageQuality = context.geo.distanceKm <= 5 ? 0.95 : 0.75;
  const historicalAccuracy = 0.88; // Placeholder for future learning

  const averageEngineConfidence = (travel.confidence + fulfillment.confidence) / 2;
  const riskPenalty = risks.reduce((acc, risk) => acc + risk.score * 0.15, 0);

  const score = Math.max(0.1, averageEngineConfidence * 0.7 + dataQuality * 0.2 + coverageQuality * 0.1 - riskPenalty);

  let level: ETAConfidenceLevel = "medium";
  if (score > 0.85) level = "very_high";
  else if (score > 0.7) level = "high";
  else if (score > 0.4) level = "medium";
  else if (score > 0.2) level = "low";
  else level = "unreliable";

  return {
    score,
    level,
    factors: {
      dataQuality,
      coverageQuality,
      predictionReliability: averageEngineConfidence,
      historicalAccuracy,
    },
    explanation: `Confidence is ${level} based on ${Math.round(dataQuality * 100)}% data quality and current environmental risks.`,
  };
}

function calculateDataQuality(context: ETAContext): number {
  let signals = 0;
  let matches = 0;

  signals++; if (context.traffic.lastUpdated) matches++;
  signals++; if (context.store.fulfillmentCapacity > 0) matches++;
  signals++; if (context.geo.distanceKm > 0) matches++;

  const stalenessMinutes = (Date.now() - new Date(context.traffic.lastUpdated).getTime()) / 60000;
  const stalenessPenalty = Math.min(0.5, stalenessMinutes / 60);

  return Math.max(0, (matches / signals) - stalenessPenalty);
}
