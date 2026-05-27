import type { Tables } from "@/types/database";
import { assertDeliveryTransition, canDispatchWithPayment, isTerminalDeliveryStatus, normalizeDeliveryStatus, orderStatusForDelivery } from "./status-engine";
import { estimateDeliveryEta, estimateHyperlocalDistanceKm } from "./eta";
import type {
  Delivery,
  DeliveryOperationalSignals,
  DeliveryRecoveryState,
  DeliveryStatus,
  DeliveryTrackingEvent,
  DeliveryTransitionInput,
  DeliveryVerification,
} from "./types";

type OrderRow = Tables<"orders"> & {
  metadata?: Record<string, unknown>;
  delivery_address?: Record<string, unknown>;
};

export function transitionDeliveryState(current: DeliveryStatus, next: DeliveryStatus) {
  const from = normalizeDeliveryStatus(current);
  const to = normalizeDeliveryStatus(next);
  assertDeliveryTransition(from, to);
  return to;
}

export function deriveDeliverySignals(delivery: Delivery): DeliveryOperationalSignals {
  const now = Date.now();
  const updatedAt = new Date(delivery.updatedAt).getTime();
  const staleForMinutes = Math.max(0, Math.round((now - updatedAt) / 60000));
  const dispatchDelayMinutes = Math.max(0, delivery.prepMinutes - 15);
  const fulfillmentLatencyMinutes = Math.max(0, Math.round((now - new Date(delivery.createdAt).getTime()) / 60000));
  const etaDriftMinutes = Math.max(0, Math.abs(delivery.etaMinutes - Math.max(0, fulfillmentLatencyMinutes - delivery.prepMinutes)));
  const failureCount = delivery.status === "FAILED" || delivery.status === "RETURN_INITIATED" ? 1 : 0;
  const alertLevel: DeliveryOperationalSignals["alertLevel"] =
    failureCount || etaDriftMinutes > 25 || staleForMinutes > 45 ? "critical" : dispatchDelayMinutes > 15 || staleForMinutes > 20 ? "watch" : "healthy";
  return { fulfillmentLatencyMinutes, dispatchDelayMinutes, etaDriftMinutes, staleForMinutes, failureCount, alertLevel };
}

export function buildDeliveryLifecycle(input: {
  order: OrderRow;
  vendor: Pick<Tables<"vendors">, "id" | "name" | "service_radius_km"> & { locality?: string | null; latitude?: number | null; longitude?: number | null };
  buyerLocation?: { latitude?: number | null; longitude?: number | null; label?: string | null };
  deliveryMode?: Delivery["mode"];
  sellerAssignment?: { name: string; phone?: string };
  createdAt?: string;
}) {
  const distanceKm = deliveryFeasibilityDistance(input.vendor, input.buyerLocation);
  const mode = input.deliveryMode ?? "seller_self";
  const eta = estimateDeliveryEta({
    distanceKm: distanceKm ?? 0,
    prepMinutes: Number(input.order.metadata?.promisedInMinutes ?? 24),
    mode,
    serviceRadiusKm: Number(input.vendor.service_radius_km ?? 5),
    status: "DELIVERY_PENDING",
    lastUpdatedAt: input.createdAt,
  });
  const createdAt = input.createdAt ?? new Date().toISOString();
  const deliveryId = `del-${input.order.id}`;
  const verification: DeliveryVerification = { state: "pending" };
  const recovery: DeliveryRecoveryState = {
    reason: "delay",
    action: "eta_refresh",
    runAfter: createdAt,
    attempts: 0,
    status: "pending",
  };

  const events: DeliveryTrackingEvent[] = [
    {
      id: `${deliveryId}-created`,
      deliveryId,
      status: "DELIVERY_PENDING",
      type: "dispatch_created",
      title: "Delivery pending",
      description: "Order committed to fulfillment and queued for dispatch orchestration.",
      occurredAt: createdAt,
      actor: "system",
      locationLabel: input.vendor.locality ?? "Seller hub",
      etaMinutes: eta.estimatedMinutes,
    },
  ];

  return {
    delivery: {
      id: deliveryId,
      orderId: input.order.id,
      orderCode: input.order.order_number,
      buyerName: String((input.order.metadata?.buyerName as string | undefined) ?? "Buyer"),
      buyerPhone: String((input.order.metadata?.buyerPhone as string | undefined) ?? "Buyer contact"),
      vendorId: input.vendor.id,
      vendorName: input.vendor.name,
      deliveryAddress: String(input.order.delivery_address?.line1 ?? "Address unavailable"),
      mode,
      status: "DELIVERY_PENDING" as DeliveryStatus,
      partner: {
        id: `partner-${mode}`,
        name: mode === "seller_self" ? "Seller self-delivery" : "External carrier",
        mode,
        serviceLevel: mode === "seller_self" ? "hyperlocal" : "same_day",
        integrationStatus: mode === "seller_self" ? "manual" : "placeholder",
      },
      distanceKm: distanceKm ?? 0,
      prepMinutes: Number(input.order.metadata?.promisedInMinutes ?? 24),
      etaMinutes: eta.estimatedMinutes,
      etaWindow: eta.window,
      etaConfidence: eta.confidence,
      promisedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
      shipment: {
        provider: mode,
        syncStatus: "pending",
      },
      events,
      etaLogs: [
        {
          id: `${deliveryId}-eta`,
          deliveryId,
          estimatedMinutes: eta.estimatedMinutes,
          confidence: eta.confidence,
          reason: eta.reason,
          createdAt,
        },
      ],
      verification,
      recovery,
    } satisfies Delivery,
    verification,
    recovery,
    eta,
  };
}

export function advanceDeliveryLifecycle(delivery: Delivery, input: DeliveryTransitionInput) {
  const nextStatus = transitionDeliveryState(delivery.status, input.toStatus);
  const now = new Date().toISOString();
  const eta = estimateDeliveryEta({
    distanceKm: delivery.distanceKm,
    prepMinutes: delivery.prepMinutes,
    mode: delivery.mode,
    serviceRadiusKm: delivery.distanceKm ? delivery.distanceKm + 0.2 : undefined,
    status: nextStatus,
    lastEtaMinutes: delivery.etaMinutes,
    lastUpdatedAt: delivery.updatedAt,
  });
  const orderStatus = orderStatusForDelivery(nextStatus);

  const event: DeliveryTrackingEvent = {
    id: `${delivery.id}-${nextStatus.toLowerCase()}-${Date.now()}`,
    deliveryId: delivery.id,
    status: nextStatus,
    type:
      nextStatus === "READY_FOR_DISPATCH"
        ? "pickup_ready"
        : nextStatus === "DISPATCHED"
          ? "dispatch_confirmed"
          : nextStatus === "IN_TRANSIT"
            ? "in_transit"
            : nextStatus === "ARRIVING"
              ? "arriving"
              : nextStatus === "DELIVERED"
                ? "delivered"
                : nextStatus === "FAILED"
                  ? "failed"
                  : nextStatus === "RETURN_INITIATED"
                    ? "return_started"
                    : nextStatus === "RETURNED"
                      ? "returned"
                      : "dispatch_created",
    title: input.note,
    description: input.note,
    occurredAt: now,
    actor: input.actor,
    locationLabel: input.locationLabel,
    etaMinutes: input.etaMinutes ?? eta.estimatedMinutes,
  };

  const updated: Delivery = {
    ...delivery,
    status: nextStatus,
    etaMinutes: eta.estimatedMinutes,
    etaWindow: eta.window,
    etaConfidence: eta.confidence,
    promisedAt: delivery.promisedAt ?? now,
    updatedAt: now,
    events: [...delivery.events, event],
    etaLogs: [
      ...delivery.etaLogs,
      {
        id: `${delivery.id}-eta-${Date.now()}`,
        deliveryId: delivery.id,
        estimatedMinutes: eta.estimatedMinutes,
        confidence: eta.confidence,
        reason: eta.reason,
        createdAt: now,
      },
    ],
    verification: input.toStatus === "DELIVERED"
      ? { state: "buyer_placeholder", buyerConfirmedAt: now, proofPlaceholder: input.proofPlaceholder, recordedBy: input.actor }
      : delivery.verification,
    recovery:
      input.toStatus === "FAILED"
        ? {
            reason: input.failureReason?.includes("unreachable") ? "unreachable_customer" : "failed_delivery",
            action: "manual_review",
            runAfter: now,
            attempts: (delivery.recovery?.attempts ?? 0) + 1,
            status: "pending",
          }
        : delivery.recovery,
  };

  return { delivery: updated, orderStatus, event, eta };
}

export function scheduleDeliveryRecovery(delivery: Delivery, reason: DeliveryRecoveryState["reason"]): DeliveryRecoveryState {
  return {
    reason,
    action:
      reason === "failed_delivery"
        ? "retry_dispatch"
        : reason === "unreachable_customer"
          ? "customer_contact"
          : reason === "dispatch_cancelled"
            ? "cancel_and_refund_review"
            : reason === "timeout"
              ? "manual_review"
              : reason === "stale_tracking"
                ? "eta_refresh"
                : "manual_review",
    runAfter: new Date(Date.now() + 15 * 60000).toISOString(),
    attempts: 0,
    status: "pending",
  };
}

export function canStartDispatch(delivery: Delivery, paymentStatus: string) {
  return !isTerminalDeliveryStatus(delivery.status) && canDispatchWithPayment(paymentStatus);
}

function deliveryFeasibilityDistance(
  vendor: Pick<Tables<"vendors">, "service_radius_km"> & { latitude?: number | null; longitude?: number | null },
  buyerLocation?: { latitude?: number | null; longitude?: number | null },
) {
  return estimateHyperlocalDistanceKm({
    pickupLatitude: vendor.latitude,
    pickupLongitude: vendor.longitude,
    dropoffLatitude: buyerLocation?.latitude,
    dropoffLongitude: buyerLocation?.longitude,
  });
}
