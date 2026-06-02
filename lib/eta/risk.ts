import type { ETAContext, ETARisk } from "./types";

export function calculateETARisk(context: ETAContext): ETARisk[] {
  const risks: ETARisk[] = [];

  // Traffic Risk
  if (context.traffic.intensity === "gridlock") {
    risks.push({
      type: "traffic",
      level: "critical",
      score: 0.95,
      description: "Severe traffic congestion (gridlock) in the delivery area.",
    });
  } else if (context.traffic.intensity === "heavy") {
    risks.push({
      type: "traffic",
      level: "high",
      score: 0.7,
      description: "Heavy traffic detected; travel times may vary significantly.",
    });
  }

  // Fulfillment/Capacity Risk
  if (context.store.fulfillmentCapacity < 0.3) {
    risks.push({
      type: "capacity",
      level: "high",
      score: 0.85,
      description: "Store is operating at critically low fulfillment capacity.",
    });
  } else if (context.store.currentBacklog > 20) {
    risks.push({
      type: "capacity",
      level: "medium",
      score: 0.5,
      description: `Significant order backlog (${context.store.currentBacklog} orders) may delay picking.`,
    });
  }

  // Weather Risk
  if (context.geo.weatherImpact > 0.7) {
    risks.push({
      type: "weather",
      level: "high",
      score: context.geo.weatherImpact,
      description: "Severe weather conditions impacting delivery safety and speed.",
    });
  }

  // Distance Risk
  if (context.geo.distanceKm > 10) {
    risks.push({
      type: "delay",
      level: "medium",
      score: 0.4,
      description: "Long-distance delivery increases the probability of unpredictable delays.",
    });
  }

  // Store Risk
  if (!context.store.isOpen) {
    risks.push({
      type: "store",
      level: "critical",
      score: 1.0,
      description: "Store is currently closed.",
    });
  }

  return risks;
}
