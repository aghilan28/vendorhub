import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

type DeliveryStatus = Enums<"delivery_status">;
type UnsafeSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>> & {
  from: (relation: string) => Record<string, unknown>;
};

export interface SelfDeliveryConfig {
  etaHours: number;
  contactNumber: string;
  trackingNote: string;
}

export async function createSelfDelivery(orderId: string, config: SelfDeliveryConfig) {
  const supabase = (await createSupabaseServerClient()) as UnsafeSupabase;
  const { data: order } = await supabase.from("orders").select("buyer_id,vendor_id").eq("id", orderId).single();
  const { data: delivery, error } = await supabase
    .from("deliveries")
    .insert({ order_id: orderId, buyer_id: order?.buyer_id, vendor_id: order?.vendor_id, mode: "SELLER_SELF", status: "PENDING_DISPATCH", eta_minutes: config.etaHours * 60 })
    .select("id")
    .single();

  if (error) throw error;

  await supabase.from("delivery_tracking_events").insert({
    delivery_id: delivery.id,
    status: "PENDING_DISPATCH",
    event_type: "seller_self",
    title: "Seller self-delivery scheduled",
    body: `Seller will deliver directly. Contact: ${config.contactNumber}. ${config.trackingNote}`,
    actor_type: "seller",
  });

  const buyerId = order?.buyer_id;
  if (buyerId) {
    await supabase.from("notifications").insert({
      recipient_id: buyerId,
      type: "ORDER_UPDATE",
      channel: "IN_APP",
      title: "Seller self-delivery scheduled",
      body: `Your order will be delivered by the seller within ${config.etaHours} hours.`,
      metadata: { order_id: orderId },
    });
  }

  return delivery.id;
}

export async function updateSelfDeliveryStatus(deliveryId: string, status: string, note: string) {
  const supabase = (await createSupabaseServerClient()) as UnsafeSupabase;
  const normalizedStatus = status.toUpperCase() as DeliveryStatus;
  const deliveryUpdates: Record<string, unknown> = { status: normalizedStatus, updated_at: new Date().toISOString() };
  const { data: delivery, error } = await (supabase.from("deliveries") as unknown as {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => {
        select: (columns: string) => { single: () => Promise<{ data: { buyer_id?: string; order_id?: string }; error: Error | null }> };
      };
    };
  })
    .update(deliveryUpdates)
    .eq("id", deliveryId)
    .select("id, order_id, buyer_id")
    .single();

  if (error) throw error;

  await supabase.from("delivery_tracking_events").insert({ delivery_id: deliveryId, status: normalizedStatus, event_type: "seller_self", title: "Delivery update", body: note, actor_type: "seller" });
  const buyerId = delivery.buyer_id;
  if (buyerId) {
    await supabase.from("notifications").insert({
      recipient_id: buyerId,
      type: "ORDER_UPDATE",
      channel: "IN_APP",
      title: "Delivery update",
      body: note,
      metadata: { order_id: delivery.order_id },
    });
  }

  return delivery;
}
