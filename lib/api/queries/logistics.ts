import { AppError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { seedDeliveries } from "@/features/logistics/data";
import { deriveDeliverySignals } from "@/features/logistics/orchestrator";
import type { Delivery, DispatchQueue } from "@/features/logistics/types";

type DeliveryRow = Tables<"deliveries"> & {
  order?: (Tables<"orders"> & { buyer?: Pick<Tables<"profiles">, "full_name" | "phone"> | null; vendor?: Pick<Tables<"vendors">, "name" | "service_radius_km"> | null }) | null;
  delivery_partner?: DeliveryPartnerRow | null;
  events?: Tables<"delivery_tracking_events">[] | null;
  shipment?: ShipmentMetadataRow | null;
  eta_logs?: DeliveryEtaLogRow[] | null;
};

type DeliveryPartnerRow = {
  id: string;
  name: string;
  mode: string;
  service_level: string;
  phone: string | null;
  integration_status: string;
};

type ShipmentMetadataRow = {
  provider: string;
  external_shipment_id: string | null;
  external_tracking_url: string | null;
  sync_status: string;
  metadata: unknown;
};

type DeliveryEtaLogRow = {
  id: string;
  delivery_id: string;
  eta_minutes: number;
  confidence: string;
  reason: string | null;
  created_at: string;
};

export async function listLiveDeliveries() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("deliveries")
    .select(
      `
        *,
        order:orders(*, buyer:profiles(full_name, phone), vendor:vendors(name, service_radius_km)),
        delivery_partner:delivery_partners(*),
        events:delivery_tracking_events(*),
        shipment:shipment_metadata(*),
        eta_logs:delivery_eta_logs(*)
      `,
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) throw new AppError("DATABASE_ERROR", "Unable to load delivery operations.", error);
  return ((data ?? []) as unknown as DeliveryRow[]).map(mapDeliveryRow);
}

export async function getLiveDelivery(orderOrDeliveryId: string) {
  const deliveries = await listLiveDeliveries();
  const delivery = deliveries.find((item) => item.id === orderOrDeliveryId || item.orderId === orderOrDeliveryId || item.orderCode === orderOrDeliveryId);
  if (!delivery) throw new AppError("NOT_FOUND", "Delivery tracking was not found.");
  return delivery;
}

export async function getLiveDispatchQueue(): Promise<DispatchQueue> {
  const deliveries = await listLiveDeliveries();
  return {
    pending: deliveries.filter((delivery) => delivery.status === "DELIVERY_PENDING" || delivery.status === "READY_FOR_DISPATCH"),
    active: deliveries.filter((delivery) => ["DISPATCHED", "IN_TRANSIT", "ARRIVING"].includes(delivery.status)),
    delayed: deliveries.filter((delivery) => deriveDeliverySignals(delivery).alertLevel !== "healthy"),
    failed: deliveries.filter((delivery) => delivery.status === "FAILED"),
  };
}

export async function transitionLiveDelivery(input: { deliveryId: string; toStatus: Delivery["status"]; note: string; etaMinutes?: number; failureReason?: string; proofPlaceholder?: string }) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await (supabase as any as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }> }).rpc("advance_delivery_state", {
    target_delivery_id: input.deliveryId,
    target_status: input.toStatus,
    status_note: input.note,
    eta_minutes_override: input.etaMinutes ?? null,
    failure_reason_text: input.failureReason ?? null,
    proof_placeholder_text: input.proofPlaceholder ?? null,
  });

  if (error) throw new AppError("DATABASE_ERROR", "Unable to advance delivery state.", error);
  return data;
}

function mapDeliveryRow(row: DeliveryRow): Delivery {
  const order = row.order;
  const buyer = order?.buyer;
  const vendor = order?.vendor;
  const address = asObject(order?.delivery_address);
  const metadata = asObject(row.metadata);
  const partner = row.delivery_partner;
  const etaMinutes = Number(row.eta_minutes ?? 30);

  return {
    id: row.id,
    orderId: row.order_id,
    orderCode: order?.order_number ?? metadataString(metadata, "orderCode", row.order_id),
    buyerName: buyer?.full_name ?? metadataString(metadata, "buyerName", "Buyer"),
    buyerPhone: buyer?.phone ?? metadataString(metadata, "buyerPhone", "Contact hidden"),
    vendorId: row.vendor_id,
    vendorName: vendor?.name ?? metadataString(metadata, "vendorName", "Seller"),
    deliveryAddress: [metadataString(address, "line1"), metadataString(address, "locality"), metadataString(address, "city"), metadataString(address, "postal_code")]
      .filter(Boolean)
      .join(", ") || "Delivery address on order",
    mode: row.mode.toLowerCase() as Delivery["mode"],
    status: row.status as Delivery["status"],
    partner: {
      id: partner?.id ?? `partner-${row.mode.toLowerCase()}`,
      name: partner?.name ?? "Seller self-delivery",
      mode: (partner?.mode ?? row.mode).toLowerCase() as Delivery["mode"],
      serviceLevel: partner?.service_level?.toLowerCase() === "standard" ? "standard" : partner?.service_level?.toLowerCase() === "same_day" ? "same_day" : "hyperlocal",
      phone: partner?.phone ?? undefined,
      integrationStatus: partner?.integration_status?.toLowerCase() === "active" ? "active" : partner?.integration_status?.toLowerCase() === "manual" ? "manual" : "placeholder",
    },
    assignedTo: row.assigned_to ?? undefined,
    assignedPhone: row.assigned_phone ?? undefined,
    distanceKm: Number(row.distance_km ?? 0),
    prepMinutes: Number(asObject(order?.metadata).promisedInMinutes ?? 24),
    etaMinutes,
    etaWindow: `${etaMinutes}-${etaMinutes + 10} min`,
    etaConfidence: row.eta_confidence.toLowerCase() as Delivery["etaConfidence"],
    promisedAt: row.promised_at ?? row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shipment: {
      provider: (row.shipment?.provider ?? row.mode).toLowerCase() as Delivery["mode"],
      externalShipmentId: row.shipment?.external_shipment_id ?? undefined,
      externalTrackingUrl: row.shipment?.external_tracking_url ?? undefined,
      syncStatus: row.shipment?.sync_status?.toLowerCase() === "synced" ? "synced" : row.shipment?.sync_status?.toLowerCase() === "failed" ? "failed" : "pending",
      syncMessage: metadataString(asObject(row.shipment?.metadata), "message", undefined),
    },
    events: (row.events ?? []).map((event) => ({
      id: event.id,
      deliveryId: event.delivery_id,
      status: event.status as Delivery["status"],
      type: event.event_type as Delivery["events"][number]["type"],
      title: event.title,
      description: event.body,
      occurredAt: event.created_at,
      actor: event.actor_type.toLowerCase() as Delivery["events"][number]["actor"],
      locationLabel: event.location_label ?? undefined,
      etaMinutes: event.eta_minutes ?? undefined,
    })),
    etaLogs: (row.eta_logs ?? []).map((log) => ({
      id: log.id,
      deliveryId: log.delivery_id,
      estimatedMinutes: log.eta_minutes,
      confidence: log.confidence.toLowerCase() as Delivery["etaConfidence"],
      reason: log.reason ?? "ETA synchronized from delivery operation.",
      createdAt: log.created_at,
    })),
  };
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function metadataString(value: Record<string, unknown>, key: string, fallback = "") {
  return typeof value[key] === "string" ? value[key] : fallback;
}

export function seededDispatchQueue(): DispatchQueue {
  return {
    pending: seedDeliveries.filter((delivery) => delivery.status === "DELIVERY_PENDING" || delivery.status === "READY_FOR_DISPATCH"),
    active: seedDeliveries.filter((delivery) => ["DISPATCHED", "IN_TRANSIT", "ARRIVING"].includes(delivery.status)),
    delayed: seedDeliveries.filter((delivery) => deriveDeliverySignals(delivery).alertLevel !== "healthy"),
    failed: seedDeliveries.filter((delivery) => delivery.status === "FAILED"),
  };
}
