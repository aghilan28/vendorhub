import type { CheckoutAddress, Order } from "@/types";
import { marketplaceProducts } from "@/features/marketplace/lib/data";
import type { InventoryRecord } from "./types";

export const savedAddresses: CheckoutAddress[] = [];

export function createInitialInventory(): InventoryRecord[] {
  return marketplaceProducts.map((product) => ({
    productId: product.id,
    available: product.stockCount,
    reserved: 0,
    lowStockThreshold: product.stockCount <= 12 ? 8 : 12,
    status: product.stockCount === 0 ? "out_of_stock" : product.stockCount <= 12 ? "low_stock" : "in_stock",
    updatedAt: new Date(0).toISOString(),
  }));
}

export const seedOrders: Order[] = [];
