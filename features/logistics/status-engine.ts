import { OrderStatus, PaymentStatus } from "@/types";
import type { DeliveryStatus, LegacyDeliveryStatus } from "./types";

export const deliveryStatusLabels: Record<DeliveryStatus, string> = {
  DELIVERY_PENDING: "Delivery pending",
  READY_FOR_DISPATCH: "Ready for dispatch",
  DISPATCHED: "Dispatched",
  IN_TRANSIT: "In transit",
  ARRIVING: "Arriving",
  DELIVERED: "Delivered",
  FAILED: "Delivery failed",
  RETURN_INITIATED: "Return initiated",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
};

const transitions: Record<DeliveryStatus, DeliveryStatus[]> = {
  DELIVERY_PENDING: ["READY_FOR_DISPATCH", "CANCELLED", "FAILED"],
  READY_FOR_DISPATCH: ["DISPATCHED", "CANCELLED", "FAILED"],
  DISPATCHED: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["ARRIVING", "FAILED"],
  ARRIVING: ["DELIVERED", "FAILED"],
  DELIVERED: ["RETURN_INITIATED"],
  FAILED: ["READY_FOR_DISPATCH", "RETURN_INITIATED", "CANCELLED"],
  RETURN_INITIATED: ["RETURNED"],
  RETURNED: [],
  CANCELLED: [],
};

const legacyStatusMap: Record<LegacyDeliveryStatus, DeliveryStatus> = {
  PENDING_DISPATCH: "DELIVERY_PENDING",
  ASSIGNED: "READY_FOR_DISPATCH",
  PICKUP_PENDING: "READY_FOR_DISPATCH",
  PICKED_UP: "DISPATCHED",
  NEARBY: "ARRIVING",
};

export function getNextDeliveryStatuses(status: DeliveryStatus) {
  return transitions[status] ?? [];
}

export function normalizeDeliveryStatus(status: DeliveryStatus | LegacyDeliveryStatus): DeliveryStatus {
  return (legacyStatusMap as Partial<Record<string, DeliveryStatus>>)[status] ?? (status as DeliveryStatus);
}

export function canTransitionDelivery(from: DeliveryStatus | LegacyDeliveryStatus, to: DeliveryStatus | LegacyDeliveryStatus) {
  return getNextDeliveryStatuses(normalizeDeliveryStatus(from)).includes(normalizeDeliveryStatus(to));
}

export function assertDeliveryTransition(from: DeliveryStatus, to: DeliveryStatus) {
  if (!canTransitionDelivery(from, to)) {
    throw new Error(`Invalid delivery transition from ${from} to ${to}.`);
  }
}

export function deliveryStatusTone(status: DeliveryStatus): "success" | "warning" | "danger" | "neutral" {
  if (status === "DELIVERED") return "success";
  if (status === "FAILED" || status === "RETURN_INITIATED" || status === "RETURNED" || status === "CANCELLED") return "danger";
  if (status === "DELIVERY_PENDING" || status === "ARRIVING") return "warning";
  return "neutral";
}

export function orderStatusForDelivery(status: DeliveryStatus): OrderStatus | null {
  switch (normalizeDeliveryStatus(status)) {
    case "DELIVERY_PENDING":
      return OrderStatus.Processing;
    case "READY_FOR_DISPATCH":
      return OrderStatus.Packed;
    case "DISPATCHED":
    case "IN_TRANSIT":
      return OrderStatus.OutForDelivery;
    case "ARRIVING":
      return OrderStatus.OutForDelivery;
    case "DELIVERED":
      return OrderStatus.Delivered;
    case "CANCELLED":
      return OrderStatus.Cancelled;
    case "RETURNED":
      return OrderStatus.Refunded;
    default:
      return null;
  }
}

export function canDispatchWithPayment(status: PaymentStatus | string) {
  return [PaymentStatus.Succeeded, PaymentStatus.CodConfirmed, "SUCCEEDED", "COD_CONFIRMED", "PAYMENT_CAPTURED"].includes(status as any);
}

export function isTerminalDeliveryStatus(status: DeliveryStatus) {
  return ["DELIVERED", "RETURNED", "CANCELLED"].includes(normalizeDeliveryStatus(status));
}
