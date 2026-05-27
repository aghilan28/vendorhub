import type { Delivery, DeliverySlaAssessment } from "./types";

type SlaPolicy = {
  dispatchMinutes: number;
  pickupMinutes: number;
  deliveryMinutes: number;
  sellerPrepMinutes: number;
  providerResponseMinutes: number;
};

const defaultPolicies: Record<Delivery["mode"], SlaPolicy> = {
  seller_self: { dispatchMinutes: 15, pickupMinutes: 25, deliveryMinutes: 60, sellerPrepMinutes: 18, providerResponseMinutes: 1 },
  shiprocket: { dispatchMinutes: 25, pickupMinutes: 45, deliveryMinutes: 120, sellerPrepMinutes: 22, providerResponseMinutes: 1 },
  porter: { dispatchMinutes: 18, pickupMinutes: 30, deliveryMinutes: 75, sellerPrepMinutes: 20, providerResponseMinutes: 1 },
  dunzo: { dispatchMinutes: 16, pickupMinutes: 28, deliveryMinutes: 70, sellerPrepMinutes: 20, providerResponseMinutes: 1 },
};

export function assessDeliverySla(delivery: Delivery, now = new Date()): DeliverySlaAssessment {
  const policy = defaultPolicies[delivery.mode];
  const createdAge = minutesBetween(delivery.createdAt, now);
  const updatedAge = minutesBetween(delivery.updatedAt, now);
  const promisedDrift = delivery.promisedAt ? minutesBetween(delivery.promisedAt, now) : 0;
  const breaches: DeliverySlaAssessment["breaches"] = [];

  if (["DELIVERY_PENDING", "READY_FOR_DISPATCH"].includes(delivery.status) && updatedAge > policy.dispatchMinutes) {
    breaches.push({
      type: "dispatch_delay",
      severity: updatedAge > policy.dispatchMinutes * 2 ? "critical" : "warning",
      thresholdMinutes: policy.dispatchMinutes,
      observedMinutes: updatedAge,
    });
  }

  if (delivery.status === "DELIVERY_PENDING" && createdAge > policy.sellerPrepMinutes) {
    breaches.push({
      type: "seller_prep_delay",
      severity: createdAge > policy.sellerPrepMinutes * 2 ? "critical" : "warning",
      thresholdMinutes: policy.sellerPrepMinutes,
      observedMinutes: createdAge,
    });
  }

  if (["DISPATCHED", "IN_TRANSIT", "ARRIVING"].includes(delivery.status) && promisedDrift > 0) {
    breaches.push({
      type: "delivery_delay",
      severity: promisedDrift > 20 ? "critical" : "warning",
      thresholdMinutes: policy.deliveryMinutes,
      observedMinutes: policy.deliveryMinutes + promisedDrift,
    });
  }

  const etaDrift = Math.max(0, updatedAge - delivery.etaMinutes);
  if (!["DELIVERED", "RETURNED", "CANCELLED"].includes(delivery.status) && etaDrift > 15) {
    breaches.push({
      type: "eta_drift",
      severity: etaDrift > 30 ? "critical" : "warning",
      thresholdMinutes: 15,
      observedMinutes: etaDrift,
    });
  }

  if (!["DELIVERED", "RETURNED", "CANCELLED"].includes(delivery.status) && updatedAge > 45) {
    breaches.push({
      type: "stale_tracking",
      severity: updatedAge > 90 ? "critical" : "warning",
      thresholdMinutes: 45,
      observedMinutes: updatedAge,
    });
  }

  return {
    deliveryId: delivery.id,
    breaches,
    alertLevel: breaches.some((breach) => breach.severity === "critical") ? "critical" : breaches.length ? "watch" : "healthy",
    escalation: escalationForBreaches(breaches),
    latencyScore: Math.max(0, 100 - breaches.reduce((score, breach) => score + (breach.severity === "critical" ? 25 : 10), 0)),
  };
}

function escalationForBreaches(breaches: DeliverySlaAssessment["breaches"]): DeliverySlaAssessment["escalation"] {
  if (breaches.some((breach) => breach.type === "provider_response_delay" || breach.type === "pickup_delay")) return "provider_failover";
  if (breaches.some((breach) => breach.severity === "critical")) return "ops_review";
  if (breaches.length) return "seller_notify";
  return "none";
}

function minutesBetween(value: string, now: Date) {
  return Math.max(0, Math.round((now.getTime() - new Date(value).getTime()) / 60000));
}
