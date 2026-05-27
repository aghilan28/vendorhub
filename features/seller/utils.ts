import type { InventoryItem, InventoryStatus, ProductStatus, SellerOrderStatus } from "./types";

export function inventoryStatus(item: Pick<InventoryItem, "status" | "stock" | "lowStockThreshold">): InventoryStatus {
  if (item.status === "archived") return "archived";
  if (item.stock <= 0) return "out_of_stock";
  if (item.stock <= item.lowStockThreshold) return "low_stock";
  return "in_stock";
}

export function statusLabel(status: SellerOrderStatus | ProductStatus | InventoryStatus) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function toneForInventory(status: InventoryStatus) {
  if (status === "out_of_stock") return "danger";
  if (status === "low_stock") return "warning";
  if (status === "archived") return "secondary";
  return "default";
}

export function toneForOrder(status: SellerOrderStatus) {
  if (status === "cancelled") return "danger";
  if (status === "pending") return "warning";
  if (status === "delivered") return "default";
  return "ai";
}
