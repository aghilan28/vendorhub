import type { ETAContext } from "./types";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateETAContext(context: ETAContext): ValidationResult {
  const errors: string[] = [];

  if (!context.buyer.location || !context.buyer.location.latitude || !context.buyer.location.longitude) {
    errors.push("Invalid buyer location coordinates.");
  }

  if (!context.store.vendor || !context.store.vendor.id) {
    errors.push("Invalid or missing store/vendor information.");
  }

  if (context.geo.distanceKm < 0) {
    errors.push("Negative distance detected.");
  }

  if (context.geo.distanceKm > 100) {
    errors.push("Distance exceeds hyperlocal boundaries (100km+).");
  }

  if (context.store.fulfillmentCapacity < 0 || context.store.fulfillmentCapacity > 1) {
    errors.push("Fulfillment capacity must be between 0 and 1.");
  }

  if (context.traffic.factor <= 0) {
    errors.push("Traffic factor must be positive.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
