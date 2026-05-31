// MCP-0C — Order Operations (state machine + fulfillment metrics)

import type { OrderAction, OrderOpsItem, OrderOpsSummary, SellerOperatingInput } from "./types";
import type { SellerOrderStatus } from "@/features/seller/types";

/** Next legal seller actions for each order status. */
export const ORDER_ACTIONS: Record<SellerOrderStatus, OrderAction[]> = {
  pending: ["accept", "reject"],
  confirmed: ["process", "cancel"],
  processing: ["ship", "cancel"],
  packed: ["ship", "cancel"],
  shipped: ["complete"],
  out_for_delivery: ["complete"],
  delivered: ["refund"],
  cancelled: ["none"],
  refunded: ["none"],
};

const OPEN_STATUSES: SellerOrderStatus[] = ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery"];
const ACTION_STATUSES: SellerOrderStatus[] = ["pending", "confirmed", "processing", "packed"];

export function nextActions(status: SellerOrderStatus): OrderAction[] {
  return ORDER_ACTIONS[status] ?? ["none"];
}

export function computeOrderOps(input: SellerOperatingInput): OrderOpsSummary {
  const items: OrderOpsItem[] = input.orders.map((order) => ({
    id: order.id,
    customer: order.customer,
    status: order.status,
    value: order.subtotal + order.deliveryFee,
    nextActions: nextActions(order.status),
    slaRisk: OPEN_STATUSES.includes(order.status) && order.promisedInMinutes <= 20,
  }));

  const total = items.length;
  const open = items.filter((i) => OPEN_STATUSES.includes(i.status)).length;
  const needsAction = items.filter((i) => ACTION_STATUSES.includes(i.status)).length;
  const delivered = items.filter((i) => i.status === "delivered").length;
  const cancelled = items.filter((i) => i.status === "cancelled").length;

  return {
    open,
    needsAction,
    fulfillmentRate: total ? Math.round((delivered / total) * 100) : 0,
    cancellationRate: total ? Math.round((cancelled / total) * 1000) / 10 : 0,
    slaRisk: items.filter((i) => i.slaRisk).length,
    items,
  };
}
