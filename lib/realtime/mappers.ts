import { NotificationSeverity, OrderStatus } from "@/types";
import type { Notification } from "@/types";
import type { Tables } from "@/types/database";
import type { DeliveryTrackingRealtimeRow, MarketplaceRealtimeEvent } from "./types";

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function orderEventFromRow(row: Tables<"orders">, eventType: "INSERT" | "UPDATE" | "DELETE"): MarketplaceRealtimeEvent {
  const isInsert = eventType === "INSERT";

  return {
    id: `rt-order-${eventType.toLowerCase()}-${row.id}-${row.updated_at}`,
    type: isInsert ? "order.created" : "order.updated",
    table: "orders",
    title: isInsert ? `New order ${row.order_number}` : `${row.order_number} moved to ${formatStatus(row.status)}`,
    body: `Total ${row.currency} ${Number(row.total_amount).toFixed(2)} with payment ${row.payment_status.toLowerCase()}.`,
    source: "supabase",
    scope: "buyer",
    entityId: row.id,
    vendorId: row.vendor_id,
    recipientId: row.buyer_id,
    createdAt: row.updated_at,
    metadata: {
      orderNumber: row.order_number,
      status: row.status,
      total: row.total_amount,
    },
  };
}

export function orderHistoryEventFromRow(row: Tables<"order_status_history">): MarketplaceRealtimeEvent {
  return {
    id: `rt-history-${row.id}`,
    type: "order.history",
    table: "order_status_history",
    title: `Order status changed to ${formatStatus(row.status)}`,
    body: row.note ?? "Marketplace order history was updated.",
    source: "supabase",
    scope: "buyer",
    entityId: row.order_id,
    createdAt: row.created_at,
    metadata: {
      status: row.status,
      changedBy: row.changed_by,
    },
  };
}

export function inventoryEventFromRow(row: Tables<"inventory">): MarketplaceRealtimeEvent {
  const available = Math.max(0, row.stock_quantity - row.reserved_quantity);

  return {
    id: `rt-inventory-${row.id}-${row.updated_at}`,
    type: "inventory.updated",
    table: "inventory",
    title: `Inventory ${formatStatus(row.stock_status)}`,
    body: `${available} available and ${row.reserved_quantity} reserved for product ${row.product_id}.`,
    source: "supabase",
    scope: "seller",
    entityId: row.product_id,
    vendorId: row.vendor_id,
    createdAt: row.updated_at,
    metadata: {
      inventoryId: row.id,
      available,
      reserved: row.reserved_quantity,
      stockStatus: row.stock_status,
    },
  };
}

export function cartEventFromRow(row: Tables<"cart_items">): MarketplaceRealtimeEvent {
  return {
    id: `rt-cart-${row.id}-${row.updated_at}`,
    type: "cart.updated",
    table: "cart_items",
    title: "Cart synchronized",
    body: "Your cart changed in another active session.",
    source: "supabase",
    scope: "buyer",
    entityId: row.id,
    recipientId: row.user_id,
    createdAt: row.updated_at,
    metadata: {
      productId: row.product_id,
      quantity: row.quantity,
    },
  };
}

export function wishlistEventFromRow(row: Tables<"wishlists">): MarketplaceRealtimeEvent {
  return {
    id: `rt-wishlist-${row.id}-${row.updated_at}`,
    type: "wishlist.updated",
    table: "wishlists",
    title: "Wishlist synchronized",
    body: "Your wishlist changed in another active session.",
    source: "supabase",
    scope: "buyer",
    entityId: row.id,
    recipientId: row.user_id,
    createdAt: row.updated_at,
    metadata: {
      productId: row.product_id,
    },
  };
}

export function payoutEventFromRow(row: Tables<"seller_payout_attributions">): MarketplaceRealtimeEvent {
  return {
    id: `rt-payout-${row.id}-${row.updated_at}`,
    type: "payout.updated",
    table: "seller_payout_attributions",
    title: "Payout attribution updated",
    body: `Payout ${row.state.toLowerCase()} for ${row.currency} ${Number(row.net_amount).toFixed(2)}.`,
    source: "supabase",
    scope: "seller",
    entityId: row.id,
    vendorId: row.vendor_id,
    createdAt: row.updated_at,
    metadata: {
      state: row.state,
      orderId: row.order_id,
    },
  };
}

export function deliveryTrackingEventFromRow(row: DeliveryTrackingRealtimeRow): MarketplaceRealtimeEvent {
  const metadata = row.metadata ?? {};
  const orderId = typeof metadata.order_id === "string" ? metadata.order_id : undefined;
  const vendorId = typeof metadata.vendor_id === "string" ? metadata.vendor_id : undefined;
  const buyerId = typeof metadata.buyer_id === "string" ? metadata.buyer_id : undefined;

  return {
    id: `rt-delivery-${row.id}`,
    type: "delivery.updated",
    table: "delivery_tracking_events",
    title: row.title,
    body: row.body,
    source: "supabase",
    scope: "buyer",
    entityId: orderId ?? row.delivery_id,
    vendorId,
    recipientId: buyerId,
    createdAt: row.created_at,
    metadata: {
      deliveryId: row.delivery_id,
      status: row.status,
      etaMinutes: row.eta_minutes,
    },
  };
}

export function notificationEventFromRow(row: Tables<"notifications">, eventType: "INSERT" | "UPDATE" | "DELETE"): MarketplaceRealtimeEvent {
  return {
    id: `rt-notification-${row.id}-${row.updated_at}`,
    type: eventType === "INSERT" ? "notification.created" : "notification.updated",
    table: "notifications",
    title: row.title,
    body: row.body,
    source: "supabase",
    scope: row.type === "ADMIN_ALERT" ? "admin" : row.vendor_id ? "seller" : "buyer",
    entityId: row.id,
    vendorId: row.vendor_id,
    recipientId: row.recipient_id,
    createdAt: row.created_at,
    metadata: {
      type: row.type,
      read: Boolean(row.read_at),
    },
  };
}

export function notificationFromRealtimeEvent(event: MarketplaceRealtimeEvent): Notification {
  const severity =
    event.type === "inventory.updated"
      ? NotificationSeverity.Warning
      : event.type === "order.created" || event.type === "notification.created"
        ? NotificationSeverity.Info
        : NotificationSeverity.Success;

  return {
    id: event.id,
    title: event.title,
    body: event.body,
    severity,
    createdAt: event.createdAt,
  };
}

export function orderStatusFromRealtimeEvent(event: MarketplaceRealtimeEvent): OrderStatus | undefined {
  const status = event.metadata?.status;
  if (typeof status !== "string") return undefined;
  return Object.values(OrderStatus).find((value) => value === status);
}
