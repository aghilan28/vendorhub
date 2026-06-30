/**
 * MCP-1E Phase 7 — Fulfillment Operations Platform
 * Order monitoring, delivery monitoring, delay/exception detection, risk assessment
 */

import { createHash } from "crypto";
import type { DeliveryRisk, FulfillmentException, FulfillmentOrder, FulfillmentSnapshot, FulfillmentStatus } from "./types";

function generateId(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}

// ─── Delivery Risk Assessment ──────────────────────────────────────────────────

export function assessDeliveryRisk(order: FulfillmentOrder): DeliveryRisk {
  if (order.status === "delivered") return "on_track";
  if (order.status === "failed" || order.status === "returned") return "failed";

  const now = new Date();
  const promised = new Date(order.promisedDate);
  const estimated = new Date(order.estimatedDate);
  const daysUntilPromised = (promised.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  const daysDelayed = (estimated.getTime() - promised.getTime()) / (24 * 60 * 60 * 1000);

  if (order.exceptions.length > 0 && !order.exceptions[order.exceptions.length - 1].resolvedAt) return "at_risk";
  if (daysDelayed > 3) return "major_delay";
  if (daysDelayed > 1) return "minor_delay";
  if (daysUntilPromised < 0) return "major_delay";
  return "on_track";
}

// ─── Exception Detection ───────────────────────────────────────────────────────

export function detectExceptions(order: FulfillmentOrder): FulfillmentException[] {
  const exceptions: FulfillmentException[] = [];
  const now = new Date();
  const promised = new Date(order.promisedDate);

  // Delay detection
  if (now > promised && order.status !== "delivered" && order.status !== "failed") {
    const delayDays = Math.ceil((now.getTime() - promised.getTime()) / (24 * 60 * 60 * 1000));
    exceptions.push({
      id: generateId(`exc-delay-${order.id}`),
      type: "delay",
      description: `Order delayed by ${delayDays} day(s) past promised date`,
      detectedAt: now.toISOString(),
      resolvedAt: null,
    });
  }

  // Stale status detection (no movement in 48h on active orders)
  if (["confirmed", "processing", "packed"].includes(order.status)) {
    const lastUpdate = new Date(order.updatedAt);
    const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (60 * 60 * 1000);
    if (hoursSinceUpdate > 48) {
      exceptions.push({
        id: generateId(`exc-stale-${order.id}`),
        type: "carrier_issue",
        description: `No status update for ${Math.round(hoursSinceUpdate)} hours`,
        detectedAt: now.toISOString(),
        resolvedAt: null,
      });
    }
  }

  return exceptions;
}

// ─── SLA Breach Check ──────────────────────────────────────────────────────────

export function checkFulfillmentSLA(order: FulfillmentOrder, maxDays: number = 5): boolean {
  if (order.status === "delivered") {
    const deliveryDays = order.actualDate
      ? (new Date(order.actualDate).getTime() - new Date(order.createdAt).getTime()) / (24 * 60 * 60 * 1000)
      : 0;
    return deliveryDays <= maxDays;
  }
  const daysSinceOrder = (Date.now() - new Date(order.createdAt).getTime()) / (24 * 60 * 60 * 1000);
  return daysSinceOrder <= maxDays;
}

// ─── Fulfillment Snapshot ──────────────────────────────────────────────────────

export function computeFulfillmentSnapshot(orders: FulfillmentOrder[]): FulfillmentSnapshot {
  const totalOrders = orders.length;
  const pendingFulfillment = orders.filter((o) => ["pending", "confirmed", "processing", "packed"].includes(o.status)).length;
  const inTransit = orders.filter((o) => ["shipped", "in_transit", "out_for_delivery"].includes(o.status)).length;
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const failed = orders.filter((o) => o.status === "failed" || o.status === "returned").length;

  const deliveredOrders = orders.filter((o) => o.status === "delivered" && o.actualDate);
  const onTime = deliveredOrders.filter((o) => new Date(o.actualDate!) <= new Date(o.promisedDate)).length;
  const onTimeRate = deliveredOrders.length > 0 ? onTime / deliveredOrders.length : 1;

  const avgDeliveryDays = deliveredOrders.length > 0
    ? deliveredOrders.reduce((sum, o) => sum + (new Date(o.actualDate!).getTime() - new Date(o.createdAt).getTime()) / (24 * 60 * 60 * 1000), 0) / deliveredOrders.length
    : 0;

  const slaBreachCount = orders.filter((o) => o.slaBreached).length;
  const exceptionCount = orders.reduce((sum, o) => sum + o.exceptions.filter((e) => !e.resolvedAt).length, 0);

  const riskDistribution: Record<DeliveryRisk, number> = { on_track: 0, minor_delay: 0, major_delay: 0, at_risk: 0, failed: 0 };
  for (const o of orders) {
    riskDistribution[o.deliveryRisk]++;
  }

  // Carrier performance
  const carrierMap = new Map<string, { onTime: number; total: number }>();
  for (const o of deliveredOrders) {
    const carrier = o.carrier ?? "unknown";
    if (!carrierMap.has(carrier)) carrierMap.set(carrier, { onTime: 0, total: 0 });
    const c = carrierMap.get(carrier)!;
    c.total++;
    if (new Date(o.actualDate!) <= new Date(o.promisedDate)) c.onTime++;
  }
  const carrierPerformance = [...carrierMap.entries()].map(([carrier, data]) => ({
    carrier,
    onTimeRate: data.total > 0 ? Number((data.onTime / data.total).toFixed(3)) : 0,
    volume: data.total,
  }));

  return {
    totalOrders,
    pendingFulfillment,
    inTransit,
    delivered,
    failed,
    onTimeRate: Number(onTimeRate.toFixed(3)),
    avgDeliveryDays: Number(avgDeliveryDays.toFixed(1)),
    slaBreachCount,
    exceptionCount,
    riskDistribution,
    carrierPerformance,
  };
}
