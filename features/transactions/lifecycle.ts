import { OrderStatus, PaymentStatus } from "@/types";
import type { Order, OrderHistoryEntry, TransactionNotification } from "@/types";
import type { OrderTransitionResult } from "./types";

export const orderStatusLabels: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: "Pending",
  [OrderStatus.Confirmed]: "Confirmed",
  [OrderStatus.Processing]: "Processing",
  [OrderStatus.Packed]: "Packed",
  [OrderStatus.Shipped]: "Shipped",
  [OrderStatus.OutForDelivery]: "Out for delivery",
  [OrderStatus.Delivered]: "Delivered",
  [OrderStatus.Cancelled]: "Cancelled",
  [OrderStatus.Refunded]: "Refunded",
};

export const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.Pending]: [OrderStatus.Confirmed, OrderStatus.Cancelled],
  [OrderStatus.Confirmed]: [OrderStatus.Processing, OrderStatus.Cancelled],
  [OrderStatus.Processing]: [OrderStatus.Packed, OrderStatus.Cancelled],
  [OrderStatus.Packed]: [OrderStatus.Shipped, OrderStatus.Cancelled],
  [OrderStatus.Shipped]: [OrderStatus.OutForDelivery],
  [OrderStatus.OutForDelivery]: [OrderStatus.Delivered],
  [OrderStatus.Delivered]: [OrderStatus.Refunded],
  [OrderStatus.Cancelled]: [OrderStatus.Refunded],
  [OrderStatus.Refunded]: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return orderTransitions[from].includes(to);
}

export function getNextSellerStatuses(status: OrderStatus) {
  return orderTransitions[status].filter((next) =>
    [OrderStatus.Confirmed, OrderStatus.Processing, OrderStatus.Packed, OrderStatus.Shipped, OrderStatus.Cancelled].includes(next),
  );
}

export function describePaymentStatus(status: PaymentStatus) {
  switch (status) {
    case PaymentStatus.Succeeded:
      return "Payment captured";
    case PaymentStatus.Failed:
      return "Payment attempt failed";
    case PaymentStatus.Processing:
      return "Payment processing";
    case PaymentStatus.Pending:
      return "Awaiting gateway confirmation";
    case PaymentStatus.CodPending:
      return "COD pending";
    case PaymentStatus.CodConfirmed:
      return "COD confirmed";
    case PaymentStatus.RefundPending:
      return "Refund pending";
    case PaymentStatus.Refunded:
      return "Refunded";
    case PaymentStatus.IntentCreated:
      return "Razorpay order created";
    case PaymentStatus.Cancelled:
      return "Payment cancelled";
    default:
      return "Payment not started";
  }
}

export function transitionOrder(order: Order, to: OrderStatus, actor: "seller" | "admin" | "system" | "buyer", note: string): OrderTransitionResult {
  if (!canTransitionOrder(order.status, to)) {
    throw new Error(`Invalid transition from ${order.status} to ${to}`);
  }

  const now = new Date().toISOString();
  const historyEntry: OrderHistoryEntry = {
    id: `hist-${order.id}-${to.toLowerCase()}-${Date.now()}`,
    status: to,
    title: orderStatusLabels[to],
    note,
    actor,
    createdAt: now,
  };
  const auditEntry = {
    id: `aud-${order.id}-${Date.now()}`,
    action: "order_status_changed",
    targetId: order.id,
    actor,
    createdAt: now,
    metadata: { from: order.status, to, note },
  };
  const notification: TransactionNotification | undefined =
    to === OrderStatus.Confirmed || to === OrderStatus.Shipped || to === OrderStatus.Cancelled
      ? {
          id: `not-${order.id}-${Date.now()}`,
          event: to === OrderStatus.Cancelled ? "cancellation_update" : to === OrderStatus.Shipped ? "shipment_update" : "order_confirmed",
          orderId: order.id,
          title: `Order ${orderStatusLabels[to].toLowerCase()}`,
          body: note,
          createdAt: now,
          delivered: false,
        }
      : undefined;

  return {
    order: {
      ...order,
      status: to,
      updatedAt: now,
      history: [...order.history, historyEntry],
      auditTrail: [...order.auditTrail, auditEntry],
      notifications: notification ? [...order.notifications, notification] : order.notifications,
    },
    historyEntry,
    auditEntry,
    notification,
  };
}
