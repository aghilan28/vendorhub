// MCP-1C Phase 8 — Delivery Network Platform (deterministic, pure).
//
// Delivery zones / territories / capacity / courier mapping / monitoring /
// health from store + zone activity.

import type { DeliveryNetworkSnapshot, DeliveryZone, Tone } from "./types";

function tone(score: number): Tone {
  if (score >= 85) return "healthy";
  if (score >= 70) return "watch";
  if (score >= 50) return "degraded";
  return "critical";
}

export interface ZoneInput {
  id: string;
  name: string;
  pincodes: string[];
  stores: number;
  capacityPerDay: number;
  ordersToday: number;
  courier?: string;
  onTimeRate?: number;
}

export function buildDeliveryZone(input: ZoneInput): DeliveryZone {
  const utilization = input.capacityPerDay ? Math.min(200, Math.round((input.ordersToday / input.capacityPerDay) * 100)) : 0;
  const onTimeRate = input.onTimeRate ?? 92;
  // zone health blends utilization headroom + on-time + store presence
  const headroom = Math.max(0, 100 - utilization);
  const health = Math.round(Math.min(100, headroom * 0.4 + onTimeRate * 0.4 + Math.min(100, input.stores * 20) * 0.2));
  return {
    id: input.id,
    name: input.name,
    pincodes: input.pincodes,
    stores: input.stores,
    capacityPerDay: input.capacityPerDay,
    ordersToday: input.ordersToday,
    utilization,
    courier: input.courier,
    onTimeRate,
    tone: tone(health),
  };
}

export function buildDeliveryNetwork(zoneInputs: ZoneInput[]): DeliveryNetworkSnapshot {
  const zones = zoneInputs.map(buildDeliveryZone);
  const totalCapacity = zones.reduce((s, z) => s + z.capacityPerDay, 0);
  const totalOrders = zones.reduce((s, z) => s + z.ordersToday, 0);
  const utilization = totalCapacity ? Math.round((totalOrders / totalCapacity) * 100) : 0;
  const serviceableZones = zones.filter((z) => z.stores > 0 && z.utilization < 100).length;
  const overloadedZones = zones.filter((z) => z.utilization >= 100).length;

  const avgOnTime = zones.length ? Math.round(zones.reduce((s, z) => s + (z.onTimeRate ?? 0), 0) / zones.length) : 0;
  const health = Math.round(Math.min(100, Math.max(0, 100 - utilization) * 0.35 + avgOnTime * 0.4 + (zones.length ? (serviceableZones / zones.length) * 100 : 0) * 0.25));

  return {
    zones: zones.sort((a, b) => b.utilization - a.utilization),
    totalCapacity,
    totalOrders,
    utilization,
    serviceableZones,
    overloadedZones,
    health,
    tone: tone(health),
  };
}
