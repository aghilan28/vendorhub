"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OrderCreateSchema, OrderStatusUpdateSchema } from "@/lib/validations/orders";
import { canTransitionOrder, orderStatusLabels } from "@/features/transactions/lifecycle";
import { OrderStatus } from "@/types";
import type { Database } from "@/types/database";

export async function createOrderAction(input: unknown) {
  const parsed = OrderCreateSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid order payload.", parsed.error.flatten());
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("orders").insert(parsed.data);

  if (error) {
    throw new AppError("DATABASE_ERROR", "Unable to create order.", error);
  }

  revalidatePath("/orders");
}

export async function updateOrderStatusAction(orderId: string, input: unknown) {
  const parsed = OrderStatusUpdateSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid order status payload.", parsed.error.flatten());
  }

  const supabase = await createSupabaseServerClient();
  const { data: current, error: loadError } = await supabase
    .from("orders")
    .select("id,status,buyer_id,vendor_id,order_number")
    .eq("id", orderId)
    .single();

  if (loadError || !current) {
    throw new AppError("DATABASE_ERROR", "Unable to load order for status update.", loadError);
  }

  const from = current.status as OrderStatus;
  const to = parsed.data.status as OrderStatus;
  if (!canTransitionOrder(from, to)) {
    throw new AppError("VALIDATION_ERROR", `Invalid order transition from ${from} to ${to}.`);
  }

  const orderUpdate: Database["public"]["Tables"]["orders"]["Update"] = { status: parsed.data.status };
  const { error } = await supabase.from("orders").update(orderUpdate).eq("id", orderId);

  if (error) {
    throw new AppError("DATABASE_ERROR", "Unable to update order status.", error);
  }

  const historyInsert: Database["public"]["Tables"]["order_status_history"]["Insert"] = {
    order_id: orderId,
    status: parsed.data.status,
    note: parsed.data.note,
    metadata: { from, to },
  };
  await supabase.from("order_status_history").insert(historyInsert);

  await supabase.from("notifications").insert([
    {
      recipient_id: current.buyer_id,
      vendor_id: current.vendor_id,
      type: "ORDER_UPDATE",
      channel: "IN_APP",
      title: `Order ${orderStatusLabels[to].toLowerCase()}`,
      body: parsed.data.note ?? `${current.order_number} moved from ${orderStatusLabels[from]} to ${orderStatusLabels[to]}.`,
      action_url: `/orders/${current.id}`,
      metadata: { orderId: current.id, orderNumber: current.order_number, from, to },
    },
    {
      vendor_id: current.vendor_id,
      type: "SELLER_ALERT",
      channel: "IN_APP",
      title: `Fulfillment updated`,
      body: `${current.order_number} is now ${orderStatusLabels[to].toLowerCase()}.`,
      action_url: `/seller/orders/${current.id}`,
      metadata: { orderId: current.id, orderNumber: current.order_number, from, to },
    },
  ]);

  revalidatePath("/orders");
  revalidatePath("/seller/orders");
  return { ok: true, orderId, from, to };
}
