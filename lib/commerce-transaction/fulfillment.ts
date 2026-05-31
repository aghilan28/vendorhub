// MCP-0F.6 — Fulfillment Platform engine (deterministic, pure).
//
// Turns live orders into an actionable fulfillment queue (accept → pack →
// dispatch → deliver → resolve), computes per-task SLA/breach state, courier
// health and an overall fulfillment health score for the seller command center
// and admin governance center.

import type {
  CourierHealth,
  FulfillmentAction,
  FulfillmentHealth,
  FulfillmentTask,
  Shipment,
  Tone,
  TransactionState,
  TxOrder,
} from "./types";
import { sellerNextStates } from "./state-machine";

const OPEN_STATES: TransactionState[] = ["placed", "confirmed", "packed", "shipped", "out_for_delivery"];

function minutesBetween(fromIso: string, toIso: string): number {
  return Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000));
}

function nextActionFor(state: TransactionState): FulfillmentAction {
  switch (state) {
    case "placed":
      return "accept";
    case "confirmed":
      return "pack";
    case "packed":
      return "dispatch";
    case "shipped":
    case "out_for_delivery":
      return "deliver";
    case "disputed":
    case "returned":
      return "resolve";
    default:
      return "none";
  }
}

/** Map an order to its current fulfillment task (with SLA/breach state). */
export function buildFulfillmentTask(order: TxOrder, now: string): FulfillmentTask {
  const ageMinutes = minutesBetween(order.createdAt, now);
  const breached = OPEN_STATES.includes(order.state) && ageMinutes > order.slaMinutes;
  const atRisk = !breached && OPEN_STATES.includes(order.state) && ageMinutes > order.slaMinutes * 0.75;
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    sellerId: order.sellerId,
    sellerName: order.sellerName,
    state: order.state,
    nextAction: nextActionFor(order.state),
    ageMinutes,
    slaMinutes: order.slaMinutes,
    breached,
    atRisk,
    total: order.total,
    itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

/** The open fulfillment queue (orders still needing seller/courier action). */
export function buildFulfillmentQueue(orders: TxOrder[], now?: string): FulfillmentTask[] {
  const stamp = now ?? new Date().toISOString();
  return orders
    .filter((o) => nextActionFor(o.state) !== "none")
    .map((o) => buildFulfillmentTask(o, stamp))
    .sort((a, b) => Number(b.breached) - Number(a.breached) || b.ageMinutes - a.ageMinutes);
}

/** Forward fulfillment actions available to the seller for an order state. */
export function fulfillmentActions(state: TransactionState): TransactionState[] {
  return sellerNextStates(state);
}

function toneFor(onTimePct: number): Tone {
  if (onTimePct >= 92) return "healthy";
  if (onTimePct >= 80) return "watch";
  if (onTimePct >= 65) return "degraded";
  return "critical";
}

export function buildCourierHealth(shipments: Shipment[], now?: string): CourierHealth[] {
  const stamp = now ?? new Date().toISOString();
  const map = new Map<string, { shipments: number; delayed: number }>();
  for (const shipment of shipments) {
    const entry = map.get(shipment.courier) ?? { shipments: 0, delayed: 0 };
    entry.shipments += 1;
    const reference = shipment.deliveredAt ?? stamp;
    const delayed = new Date(reference).getTime() > new Date(shipment.promisedAt).getTime();
    if (delayed) entry.delayed += 1;
    map.set(shipment.courier, entry);
  }
  return [...map.entries()]
    .map(([courier, e]) => {
      const onTimePct = e.shipments ? Math.round(((e.shipments - e.delayed) / e.shipments) * 100) : 100;
      return { courier, shipments: e.shipments, onTimePct, delayed: e.delayed, tone: toneFor(onTimePct) };
    })
    .sort((a, b) => b.shipments - a.shipments);
}

/** Overall fulfillment health from open tasks + courier performance. */
export function buildFulfillmentHealth(orders: TxOrder[], shipments: Shipment[], now?: string): FulfillmentHealth {
  const stamp = now ?? new Date().toISOString();
  const tasks = buildFulfillmentQueue(orders, stamp);
  const breaches = tasks.filter((t) => t.breached).length;
  const atRisk = tasks.filter((t) => t.atRisk).length;
  const couriers = buildCourierHealth(shipments, stamp);

  const deliveredShipments = shipments.filter((s) => s.deliveredAt);
  const onTime = deliveredShipments.filter((s) => new Date(s.deliveredAt as string).getTime() <= new Date(s.promisedAt).getTime()).length;
  const onTimePct = deliveredShipments.length ? Math.round((onTime / deliveredShipments.length) * 100) : 100;

  const stateOrder: TransactionState[] = OPEN_STATES;
  const byState = stateOrder
    .map((state) => ({ state, count: orders.filter((o) => o.state === state).length }))
    .filter((s) => s.count > 0);

  // Score: start at 100, penalise breaches/at-risk, weight courier on-time.
  let score = 100;
  if (tasks.length) score -= Math.round((breaches / tasks.length) * 45 + (atRisk / tasks.length) * 20);
  score = Math.round(score * 0.6 + onTimePct * 0.4);
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    tone: toneFor(score),
    openTasks: tasks.length,
    breaches,
    atRisk,
    onTimePct,
    byState,
    couriers,
  };
}
