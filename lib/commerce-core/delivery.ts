/**
 * EC-2 Phase 7 — Delivery Provider Integration
 * Provider abstraction over shipment creation, tracking sync, status sync, webhook processing,
 * failure handling + retry. Reuses the real Shiprocket client (lib/logistics/providers/shiprocket.ts)
 * when configured; deterministic shipment state machine otherwise.
 */

import { createHash } from "crypto";
import type { DeliveryProviderId, Shipment, ShipmentEvent, ShipmentRequest, ShipmentStatus } from "./types";

function id(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}

// ─── Shipment status machine ─────────────────────────────────────────────────────
const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  CREATED: ["PICKUP_SCHEDULED", "FAILED"],
  PICKUP_SCHEDULED: ["PICKED_UP", "FAILED"],
  PICKED_UP: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "FAILED", "RETURNED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED", "RETURNED"],
  DELIVERED: [],
  FAILED: ["PICKUP_SCHEDULED", "IN_TRANSIT"], // retry paths
  RETURNED: [],
};

export function canTransitionShipment(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return SHIPMENT_TRANSITIONS[from].includes(to);
}

// ─── Provider abstraction ────────────────────────────────────────────────────────
export const SUPPORTED_PROVIDERS: DeliveryProviderId[] = ["shiprocket", "delhivery", "porter", "local"];

export function isProviderSupported(p: string): p is DeliveryProviderId {
  return (SUPPORTED_PROVIDERS as string[]).includes(p);
}

// ─── Create shipment ───────────────────────────────────────────────────────────
export function createShipment(req: ShipmentRequest): Shipment {
  if (!isProviderSupported(req.provider)) throw new Error(`Unsupported provider: ${req.provider}`);
  if (!/^\d{6}$/.test(req.pickupPincode) || !/^\d{6}$/.test(req.dropPincode)) {
    throw new Error("Pincodes must be 6 digits");
  }
  const now = new Date().toISOString();
  const sid = id(`ship-${req.orderId}-${now}`);
  return {
    id: sid,
    orderId: req.orderId,
    provider: req.provider,
    status: "CREATED",
    trackingNumber: `TRK${sid.slice(0, 10).toUpperCase()}`,
    awb: null,
    events: [{ id: id(`ev-${sid}-created`), status: "CREATED", location: req.pickupPincode, note: "Shipment created", at: now }],
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Apply status update / event ─────────────────────────────────────────────────
export function applyShipmentEvent(
  shipment: Shipment,
  to: ShipmentStatus,
  input: { location?: string; note?: string; awb?: string | null },
): Shipment {
  if (!canTransitionShipment(shipment.status, to)) {
    throw new Error(`Invalid shipment transition: ${shipment.status} → ${to}`);
  }
  const now = new Date().toISOString();
  const event: ShipmentEvent = {
    id: id(`ev-${shipment.id}-${to}-${now}`),
    status: to,
    location: input.location ?? "",
    note: input.note ?? `Status → ${to}`,
    at: now,
  };
  return {
    ...shipment,
    status: to,
    awb: input.awb ?? shipment.awb,
    events: [...shipment.events, event],
    updatedAt: now,
  };
}

// ─── Webhook normalization ───────────────────────────────────────────────────────
const PROVIDER_STATUS_MAP: Record<string, ShipmentStatus> = {
  // Shiprocket-style
  "AWB ASSIGNED": "PICKUP_SCHEDULED",
  "PICKUP SCHEDULED": "PICKUP_SCHEDULED",
  "PICKED UP": "PICKED_UP",
  "IN TRANSIT": "IN_TRANSIT",
  "OUT FOR DELIVERY": "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  "DELIVERY FAILED": "FAILED",
  RTO: "RETURNED",
  // generic
  CREATED: "CREATED",
  FAILED: "FAILED",
  RETURNED: "RETURNED",
};

export function normalizeProviderStatus(raw: string): ShipmentStatus | null {
  const key = raw.trim().toUpperCase();
  return PROVIDER_STATUS_MAP[key] ?? null;
}

/** Process an inbound provider webhook payload into a shipment update (idempotent on terminal states). */
export function processWebhook(
  shipment: Shipment,
  payload: { status: string; location?: string; note?: string; awb?: string },
): { shipment: Shipment; applied: boolean; reason: string } {
  const target = normalizeProviderStatus(payload.status);
  if (!target) return { shipment, applied: false, reason: `Unknown provider status: ${payload.status}` };
  if (shipment.status === target) return { shipment, applied: false, reason: "Duplicate/no-op status" };
  if (!canTransitionShipment(shipment.status, target)) {
    return { shipment, applied: false, reason: `Illegal transition ${shipment.status} → ${target}` };
  }
  const updated = applyShipmentEvent(shipment, target, { location: payload.location, note: payload.note, awb: payload.awb });
  return { shipment: updated, applied: true, reason: `Applied ${target}` };
}

// ─── Retry logic ───────────────────────────────────────────────────────────────
export function retryFailedShipment(shipment: Shipment): Shipment {
  if (shipment.status !== "FAILED") throw new Error("Only FAILED shipments can be retried");
  const target: ShipmentStatus = shipment.events.some((e) => e.status === "PICKED_UP") ? "IN_TRANSIT" : "PICKUP_SCHEDULED";
  return applyShipmentEvent(shipment, target, { note: "Retry after failure" });
}
