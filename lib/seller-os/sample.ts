// MCP-0C — Deterministic SAMPLE operating snapshot.
// PREVIEW ONLY: used so the Seller OS workspace renders before a seller signs in.
// When authenticated, the workspace runs on the REAL /api/seller/snapshot data.

import type { InventoryItem, SellerOrder, SellerProduct } from "@/features/seller/types";
import type { SellerOperatingInput } from "./types";

const PRODUCTS: SellerProduct[] = [
  { id: "p1", sku: "ATTA-5", name: "Aashirvaad Atta 5kg", category: "Rice & Grains", price: 285, mrp: 320, status: "published", visibility: "marketplace", stock: 8, reserved: 2, lowStockThreshold: 10, soldToday: 12, imageHint: "atta", updatedAt: "2026-05-30T09:00:00.000Z" },
  { id: "p2", sku: "MILK-1L", name: "Aavin Toned Milk 1L", category: "Milk", price: 48, mrp: 50, status: "published", visibility: "marketplace", stock: 0, reserved: 0, lowStockThreshold: 20, soldToday: 40, imageHint: "milk", updatedAt: "2026-05-30T09:00:00.000Z" },
  { id: "p3", sku: "OIL-1L", name: "Fortune Sunflower Oil 1L", category: "Edible Oils", price: 145, mrp: 160, status: "published", visibility: "marketplace", stock: 120, reserved: 5, lowStockThreshold: 15, soldToday: 0, imageHint: "oil", updatedAt: "2026-05-30T09:00:00.000Z" },
  { id: "p4", sku: "SOAP-4", name: "Dove Soap Pack of 4", category: "Bath & Body", price: 199, mrp: 240, status: "published", visibility: "marketplace", stock: 35, reserved: 1, lowStockThreshold: 10, soldToday: 6, imageHint: "soap", updatedAt: "2026-05-30T09:00:00.000Z" },
  { id: "p5", sku: "CHIPS-50", name: "Lays Classic 50g", category: "Chips & Crisps", price: 20, mrp: 20, status: "published", visibility: "marketplace", stock: 4, reserved: 0, lowStockThreshold: 12, soldToday: 9, imageHint: "chips", updatedAt: "2026-05-30T09:00:00.000Z" },
];

const INVENTORY: InventoryItem[] = PRODUCTS.map((p) => ({
  ...p,
  aisle: "A1",
  batch: "LIVE",
  expiry: "2026-12-31",
  lastMovement: "SALE -1",
}));

function order(id: string, customer: string, status: SellerOrder["status"], subtotal: number, promised: number, items: number): SellerOrder {
  return {
    id,
    customer,
    phone: "98xxxxxx",
    address: "Chennai",
    status,
    promisedInMinutes: promised,
    createdAt: "2026-05-30T08:00:00.000Z",
    paymentMode: "UPI",
    subtotal,
    deliveryFee: 25,
    notes: "",
    items: Array.from({ length: items }, (_, i) => ({ sku: `S${i}`, name: `Item ${i}`, quantity: 1, unitPrice: subtotal / Math.max(1, items), picked: status !== "pending" })),
    timeline: [],
  };
}

const ORDERS: SellerOrder[] = [
  order("ORD-1", "Priya", "pending", 410, 15, 3),
  order("ORD-2", "Arjun", "processing", 190, 25, 2),
  order("ORD-3", "Priya", "delivered", 520, 30, 4),
  order("ORD-4", "Meena", "delivered", 2300, 30, 6),
  order("ORD-5", "Karthik", "cancelled", 99, 30, 1),
  order("ORD-6", "Meena", "shipped", 760, 18, 3),
];

export const SAMPLE_SELLER_INPUT: SellerOperatingInput = {
  storeName: "Sample Hyperlocal Store",
  storeStatus: "ACTIVE",
  products: PRODUCTS,
  inventory: INVENTORY,
  orders: ORDERS,
};
