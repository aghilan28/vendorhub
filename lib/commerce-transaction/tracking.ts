// MCP-0F.7 — Delivery Tracking Platform engine (deterministic, pure).
//
// Buyer-facing: shipment stage, tracking events, ETA, delay alerts, delivery
// confidence and history. Seller-facing: delivery performance + courier health.
// Replaces the sample-only tracking page with a real engine over shipment data.

import type {
  CourierHealth,
  DeliveryPerformance,
  Shipment,
  TrackingView,
  TransactionState,
} from "./types";
import { buildCourierHealth } from "./fulfillment";
import { STATE_META } from "./state-machine";

function minutesUntil(targetIso: string, now: string): number {
  return Math.round((new Date(targetIso).getTime() - new Date(now).getTime()) / 60000);
}

/**
 * Delivery confidence 0..100 — derived from stage progress, time-to-promise and
 * the assigned courier's on-time history. Deterministic for a given input.
 */
export function deliveryConfidence(shipment: Shipment, courier: CourierHealth | undefined, now: string): number {
  if (shipment.state === "delivered" || shipment.state === "completed") return 100;
  if (shipment.state === "cancelled" || shipment.state === "returned" || shipment.state === "refunded") return 0;

  let confidence = 70;
  // Stage progress raises confidence.
  const stageBoost: Partial<Record<TransactionState, number>> = {
    confirmed: 4,
    packed: 8,
    shipped: 14,
    out_for_delivery: 22,
  };
  confidence += stageBoost[shipment.state] ?? 0;

  // Time-to-promise: behind schedule lowers confidence.
  const slackMinutes = minutesUntil(shipment.promisedAt, now);
  if (slackMinutes < -120) confidence -= 45;
  else if (slackMinutes < 0) confidence -= 25;
  else if (slackMinutes < 60) confidence -= 8;
  else confidence += 6;

  // Courier reliability nudge.
  if (courier) confidence += Math.round((courier.onTimePct - 85) / 5);

  return Math.max(0, Math.min(100, Math.round(confidence)));
}

export interface TrackingOptions {
  courierHealth?: CourierHealth[];
  now?: string;
}

/** Build the buyer tracking view for a shipment. */
export function buildTrackingView(shipment: Shipment, options: TrackingOptions = {}): TrackingView {
  const now = options.now ?? new Date().toISOString();
  const courier = (options.courierHealth ?? []).find((c) => c.courier === shipment.courier);
  const settled = shipment.state === "delivered" || shipment.state === "completed";

  const etaMinutes = settled ? null : Math.max(0, minutesUntil(shipment.promisedAt, now));
  const overdueMinutes = settled ? 0 : Math.max(0, -minutesUntil(shipment.promisedAt, now));
  const delayed = overdueMinutes > 0;

  return {
    orderNumber: shipment.orderNumber,
    courier: shipment.courier,
    stage: shipment.state,
    stageLabel: STATE_META[shipment.state].buyerLabel,
    etaMinutes,
    delayed,
    delayMinutes: overdueMinutes,
    confidence: deliveryConfidence(shipment, courier, now),
    history: [...shipment.events].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()),
  };
}

/** Delay alerts across active shipments (for buyer order center / admin). */
export function deliveryDelayAlerts(shipments: Shipment[], now?: string): Array<{ orderNumber: string; delayMinutes: number; courier: string }> {
  const stamp = now ?? new Date().toISOString();
  return shipments
    .filter((s) => s.state !== "delivered" && s.state !== "completed" && s.state !== "cancelled" && s.state !== "refunded")
    .map((s) => ({ orderNumber: s.orderNumber, courier: s.courier, delayMinutes: Math.max(0, -minutesUntil(s.promisedAt, stamp)) }))
    .filter((s) => s.delayMinutes > 0)
    .sort((a, b) => b.delayMinutes - a.delayMinutes);
}

/** Seller delivery performance over a set of shipments. */
export function buildDeliveryPerformance(shipments: Shipment[], now?: string): DeliveryPerformance {
  const stamp = now ?? new Date().toISOString();
  const delivered = shipments.filter((s) => s.deliveredAt);
  const delayedDelivered = delivered.filter((s) => new Date(s.deliveredAt as string).getTime() > new Date(s.promisedAt).getTime());
  const activeDelayed = shipments.filter(
    (s) => !s.deliveredAt && s.state !== "cancelled" && new Date(stamp).getTime() > new Date(s.promisedAt).getTime(),
  );
  const delayed = delayedDelivered.length + activeDelayed.length;

  const totalDelayMinutes = delayedDelivered.reduce(
    (sum, s) => sum + Math.max(0, Math.round((new Date(s.deliveredAt as string).getTime() - new Date(s.promisedAt).getTime()) / 60000)),
    0,
  );
  const onTimePct = delivered.length ? Math.round(((delivered.length - delayedDelivered.length) / delivered.length) * 100) : 100;

  return {
    shipments: shipments.length,
    delivered: delivered.length,
    delayed,
    onTimePct,
    avgDelayMinutes: delayedDelivered.length ? Math.round(totalDelayMinutes / delayedDelivered.length) : 0,
    couriers: buildCourierHealth(shipments, stamp),
  };
}
