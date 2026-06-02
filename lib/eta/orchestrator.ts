import type { ETARequest, ETAResult } from "./types";
import { calculateTravelTime, calculateFulfillmentTime } from "./engines";
import { calculateETARisk } from "./risk";
import { calculateETAConfidence } from "./confidence";

export function calculateETASync(request: ETARequest): ETAResult {
  const startTime = Date.now();
  const { context } = request;

  const travel = calculateTravelTime(context.geo.distanceKm, context.mode, context.traffic.intensity);
  const fulfillment = calculateFulfillmentTime(context.store.storeType, context.store.fulfillmentCapacity, context.store.currentBacklog);

  const totalTarget = travel.baseMinutes + fulfillment.totalMinutes;
  const weatherAdjustment = totalTarget * (context.geo.weatherImpact * 0.4);
  const complexityAdjustment = totalTarget * ((context.geo.routeComplexity - 1) * 0.05);

  const finalTarget = Math.round(totalTarget + weatherAdjustment + complexityAdjustment);
  const minMinutes = Math.max(2, Math.round(finalTarget * 0.85));
  const maxMinutes = Math.round(finalTarget * 1.3);

  const risks = calculateETARisk(context);
  const confidence = calculateETAConfidence(context, travel, fulfillment, risks);

  return {
    requestId: request.id,
    estimate: {
      minMinutes,
      maxMinutes,
      targetMinutes: finalTarget,
      displayWindow: `${minMinutes}-${maxMinutes} min`,
    },
    confidence,
    risks,
    explanation: `Estimated ${finalTarget} min: ${Math.round(travel.baseMinutes)} min travel, ${fulfillment.totalMinutes} min fulfillment, plus environmental factors.`,
    metadata: {
      engineVersion: "1.0.0",
      calculatedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime,
      inputSnapshot: context,
    },
    stabilityScore: Math.max(0, 1 - risks.length * 0.15),
  };
}

export async function estimateETA(request: ETARequest): Promise<ETAResult> {
  return calculateETASync(request);
}
