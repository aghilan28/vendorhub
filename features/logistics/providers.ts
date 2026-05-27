import type {
  Delivery,
  DeliveryMode,
  DeliveryStatus,
  LegacyDeliveryStatus,
  LogisticsBackpressureDecision,
  LogisticsBackpressureSignal,
  LogisticsProviderAttempt,
  LogisticsProviderHealth,
  LogisticsProviderPlan,
  ProviderFailoverDecision,
  ShiprocketCreateShipmentInput,
  ShiprocketShipmentDraft,
} from "./types";

const providerPreference: DeliveryMode[] = ["seller_self", "shiprocket", "porter", "dunzo"];

const defaultHealth: LogisticsProviderHealth[] = [
  { provider: "seller_self", state: "HEALTHY", priority: 90, averageLatencyMs: 0, failureCount: 0 },
  { provider: "shiprocket", state: "HEALTHY", priority: 70, averageLatencyMs: 0, failureCount: 0 },
  { provider: "porter", state: "COOLDOWN", priority: 50, averageLatencyMs: 0, failureCount: 0 },
  { provider: "dunzo", state: "COOLDOWN", priority: 45, averageLatencyMs: 0, failureCount: 0 },
];

export function chooseLogisticsProvider(input: {
  delivery: Pick<Delivery, "mode" | "distanceKm" | "etaConfidence">;
  health?: LogisticsProviderHealth[];
  sellerSelfAvailable?: boolean;
  now?: Date;
}): LogisticsProviderPlan {
  const now = input.now ?? new Date();
  const health = input.health?.length ? input.health : defaultHealth;
  const byProvider = new Map(health.map((item) => [item.provider, item]));
  const eligible = providerPreference.filter((provider) => {
    if (provider === "seller_self" && input.sellerSelfAvailable === false) return false;
    const providerHealth = byProvider.get(provider);
    const state = providerHealth?.state ?? "COOLDOWN";
    if (providerHealth?.cooldownUntil && new Date(providerHealth.cooldownUntil).getTime() > now.getTime()) return false;
    return state === "HEALTHY" || state === "DEGRADED";
  }).sort((left, right) => providerScore(byProvider.get(right), input.delivery.distanceKm) - providerScore(byProvider.get(left), input.delivery.distanceKm));
  const requested = input.delivery.mode;
  const primary = eligible.includes(requested) ? requested : eligible[0] ?? "seller_self";
  const failover = eligible.find((provider) => provider !== primary);
  const unhealthyRequested = byProvider.get(requested)?.state;
  const primaryHealth = byProvider.get(primary);
  const throttledProviders = health
    .filter((item) => item.state === "OUTAGE" || item.state === "COOLDOWN" || (item.cooldownUntil && new Date(item.cooldownUntil).getTime() > now.getTime()))
    .map((item) => item.provider);

  return {
    primary,
    failover,
    providerIndependent: true,
    degraded: primary !== requested || primaryHealth?.state === "DEGRADED",
    score: providerScore(primaryHealth, input.delivery.distanceKm),
    throttledProviders,
    reason:
      primary === requested
        ? `${requested} selected within provider health guardrails.`
        : `${requested} unavailable (${unhealthyRequested ?? "unknown"}); ${primary} selected as failover.`,
  };
}

export function planProviderFailover(input: {
  requestedProvider: DeliveryMode;
  health: LogisticsProviderHealth[];
  delivery: Pick<Delivery, "mode" | "distanceKm" | "etaConfidence">;
  reason: "outage" | "sla_degradation" | "timeout" | "rate_limit" | "tracking_failure" | "dispatch_rejection";
  now?: Date;
}): ProviderFailoverDecision {
  const plan = chooseLogisticsProvider({
    delivery: { ...input.delivery, mode: input.requestedProvider },
    health: input.health,
    now: input.now,
  });
  const requestedHealth = input.health.find((item) => item.provider === input.requestedProvider);
  const cooldownMinutes =
    input.reason === "outage"
      ? 30
      : input.reason === "rate_limit"
        ? 20
        : input.reason === "timeout" || (requestedHealth?.averageLatencyMs ?? 0) > 2500
          ? 15
          : 10;

  return {
    provider: input.requestedProvider,
    failedOverTo: plan.primary === input.requestedProvider ? plan.failover ?? "seller_self" : plan.primary,
    deterministic: true,
    cooldownMinutes,
    reason: `${input.requestedProvider} ${input.reason.replace("_", " ")}; failover routed to ${plan.primary === input.requestedProvider ? plan.failover ?? "seller_self" : plan.primary}.`,
    retryIsolated: true,
    degradedMode: plan.degraded || Boolean(requestedHealth && requestedHealth.state !== "HEALTHY"),
  };
}

export function providerScore(health: LogisticsProviderHealth | undefined, distanceKm = 0) {
  if (!health) return 0;
  const statePenalty = health.state === "HEALTHY" ? 0 : health.state === "DEGRADED" ? 18 : health.state === "COOLDOWN" ? 55 : 80;
  const latencyPenalty = Math.min(20, Math.round(health.averageLatencyMs / 250));
  const failurePenalty = Math.min(30, health.failureCount * 4);
  const distancePenalty = health.provider === "seller_self" && distanceKm > 6 ? 10 : 0;
  return Math.max(0, health.priority - statePenalty - latencyPenalty - failurePenalty - distancePenalty);
}

export function updateProviderHealthAfterAttempt(input: {
  health: LogisticsProviderHealth;
  attempt: LogisticsProviderAttempt;
  cooldownMinutes?: number;
}): LogisticsProviderHealth {
  const failureCount = input.attempt.ok ? Math.max(0, input.health.failureCount - 1) : input.health.failureCount + 1;
  const averageLatencyMs = Math.round(input.health.averageLatencyMs * 0.7 + input.attempt.latencyMs * 0.3);
  const state =
    failureCount >= 6
      ? "OUTAGE"
      : failureCount >= 3 || averageLatencyMs > 2500
        ? "DEGRADED"
        : input.health.state === "COOLDOWN" && input.health.cooldownUntil
          ? "COOLDOWN"
          : "HEALTHY";
  const cooldownUntil =
    state === "OUTAGE"
      ? new Date(new Date(input.attempt.attemptedAt).getTime() + (input.cooldownMinutes ?? 20) * 60000).toISOString()
      : state === "COOLDOWN"
        ? input.health.cooldownUntil
        : null;

  return {
    ...input.health,
    state,
    averageLatencyMs,
    failureCount,
    lastFailureAt: input.attempt.ok ? input.health.lastFailureAt ?? null : input.attempt.attemptedAt,
    cooldownUntil,
  };
}

export function evaluateLogisticsBackpressure(signal: LogisticsBackpressureSignal): LogisticsBackpressureDecision {
  const maxConcurrentDispatches = signal.maxConcurrentDispatches ?? 40;
  const dispatchSaturation = signal.activeDispatches / Math.max(1, maxConcurrentDispatches);
  const retryPressure = signal.retryCount + signal.providerFailureCount * 2;
  const critical = signal.queueDepth > 150 || dispatchSaturation >= 1 || retryPressure > 30;
  const watch = critical || signal.queueDepth > 60 || dispatchSaturation >= 0.75 || retryPressure > 12;

  return {
    acceptDispatch: !critical,
    throttleRealtime: watch,
    retryAfterSeconds: critical ? 300 : watch ? 90 : 0,
    alertLevel: critical ? "critical" : watch ? "watch" : "healthy",
    reason: critical
      ? "Dispatch pressure exceeded provider and queue guardrails."
      : watch
        ? "Dispatch pressure is elevated; realtime and retries should be paced."
        : "Dispatch pressure is within logistics guardrails.",
  };
}

export function normalizeProviderStatus(providerStatus: string): DeliveryStatus | LegacyDeliveryStatus {
  return mapProviderStatus(providerStatus);
}

export function createShiprocketShipmentDraft(input: ShiprocketCreateShipmentInput): ShiprocketShipmentDraft {
  return {
    provider: "shiprocket",
    payload: {
      order_id: input.order.code,
      order_date: input.order.createdAt,
      pickup_location: "VendorHub seller pickup",
      billing_customer_name: input.order.buyerName,
      billing_phone: input.order.buyerPhone,
      billing_address: input.order.deliveryAddress.line1,
      billing_city: input.order.deliveryAddress.city,
      billing_pincode: input.deliveryPostcode,
      shipping_is_billing: true,
      payment_method: input.order.payment.method === "upi" ? "Prepaid" : "Prepaid",
      sub_total: input.order.pricing.subtotal,
      length: 18,
      breadth: 14,
      height: 8,
      weight: Math.max(0.2, input.weightGrams / 1000),
      order_items: input.order.items.map((item) => ({
        name: item.product.name,
        sku: item.product.id,
        units: item.quantity,
        selling_price: item.product.price,
      })),
    },
    mappingNotes: [
      "Authentication token, warehouse pickup IDs, and courier selection are external runtime concerns.",
      "Tracking sync should map Shiprocket AWB events into delivery_tracking_events.",
      "This draft keeps the integration boundary stable without calling production APIs.",
    ],
  };
}

export function mapProviderStatus(providerStatus: string): DeliveryStatus | LegacyDeliveryStatus {
  const normalized = providerStatus.toLowerCase();
  if (normalized.includes("pickup")) return "PICKED_UP";
  if (normalized.includes("transit") || normalized.includes("shipped")) return "IN_TRANSIT";
  if (normalized.includes("out for delivery") || normalized.includes("nearby")) return "NEARBY";
  if (normalized.includes("delivered")) return "DELIVERED";
  if (normalized.includes("failed") || normalized.includes("exception")) return "FAILED";
  return "ASSIGNED";
}
