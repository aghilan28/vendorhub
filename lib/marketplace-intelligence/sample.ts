// MCP-0E — Deterministic SAMPLE marketplace activity. PREVIEW ONLY.
// When Supabase is configured, the engine runs on REAL products/orders/reviews/
// returns/refunds/disputes (see lib/marketplace-intelligence/queries.ts). This
// sample never drives live counts — it only powers offline previews and tests.

import type { SellerOrder, SellerOrderItem } from "@/features/seller/types";
import type { DisputeInput, RefundInput, ReturnInput, ReviewInput, SupportTicketInput } from "@/lib/trust/types";
import type { BehaviorEvent, FabricProductInput, MarketplaceActivityInput, StoreActivity } from "./types";

const GENERATED_AT = "2026-05-31T00:00:00.000Z";
const EARLIEST = "2026-05-01T00:00:00.000Z"; // fixes the analysis window to 30 days
const RECENT = "2026-05-16T00:00:00.000Z";

const sellers: StoreActivity[] = [
  { sellerId: "s1", name: "Chennai Fresh Mart", verified: true, responseMinutes: 18, city: "Chennai", status: "ACTIVE" },
  { sellerId: "s2", name: "Bargain Bazaar", verified: false, responseMinutes: 140, city: "Chennai", status: "ACTIVE" },
  { sellerId: "s3", name: "Prime Electronics", verified: true, responseMinutes: 45, city: "Chennai", status: "ACTIVE" },
];

function product(over: Partial<FabricProductInput> & Pick<FabricProductInput, "id" | "sku" | "name" | "category" | "price" | "mrp" | "stock" | "sellerId">): FabricProductInput {
  const seller = sellers.find((s) => s.sellerId === over.sellerId);
  return {
    inventoryId: `inv-${over.id}`,
    reserved: 0,
    lowStockThreshold: 10,
    soldToday: 0,
    imageHint: over.name,
    updatedAt: RECENT,
    status: "published",
    visibility: "marketplace",
    sellerName: seller?.name ?? over.sellerId,
    ...over,
  };
}

const products: FabricProductInput[] = [
  product({ id: "p1", sku: "TOM", name: "Fresh Tomatoes 1kg", category: "Groceries", price: 40, mrp: 50, stock: 20, sellerId: "s1" }), // surge / low cover
  product({ id: "p2", sku: "RICE", name: "Basmati Rice 5kg", category: "Groceries", price: 300, mrp: 350, stock: 100, sellerId: "s1" }), // healthy
  product({ id: "p3", sku: "SPIN", name: "Organic Spinach", category: "Groceries", price: 20, mrp: 25, stock: 200, sellerId: "s1" }), // dead stock / no demand
  product({ id: "p4", sku: "TSHIRT", name: "Cotton T-Shirt", category: "Fashion", price: 400, mrp: 600, stock: 50, sellerId: "s2" }),
  product({ id: "p5", sku: "JEANS", name: "Denim Jeans", category: "Fashion", price: 200, mrp: 400, stock: 30, sellerId: "s2" }), // below cost (cost=240)
  product({ id: "p6", sku: "EARBUD", name: "Wireless Earbuds", category: "Electronics", price: 2000, mrp: 2000, stock: 40, sellerId: "s3" }), // pricing headroom
  product({ id: "p7", sku: "CHARGER", name: "Fast Charger 65W", category: "Electronics", price: 800, mrp: 1000, stock: 40, sellerId: "s3" }), // overstock / discovery gap
  product({ id: "p8", sku: "SPKR", name: "Bluetooth Speaker", category: "Electronics", price: 1500, mrp: 1800, stock: 0, sellerId: "s3" }), // stockout with demand
];

let seq = 0;
const orders: SellerOrder[] = [];

function makeOrder(sku: string, name: string, qty: number, price: number, status: SellerOrder["status"], dbId?: string): SellerOrder {
  seq += 1;
  const items: SellerOrderItem[] = [{ sku, name, quantity: qty, unitPrice: price, picked: status === "delivered" }];
  return {
    id: `ORD-${seq}`,
    dbId: dbId ?? `o-${seq}`,
    customer: "Sample Buyer",
    phone: "—",
    address: "Chennai",
    status,
    promisedInMinutes: 30,
    createdAt: seq === 1 ? EARLIEST : RECENT,
    paymentMode: "UPI",
    subtotal: qty * price,
    deliveryFee: 20,
    notes: "",
    items,
    timeline: [],
  };
}

function pushOrders(count: number, sku: string, name: string, qty: number, price: number) {
  for (let i = 0; i < count; i += 1) orders.push(makeOrder(sku, name, qty, price, "delivered"));
}

// Sales volumes (over a 30-day window) → deterministic velocities.
pushOrders(15, "TOM", "Fresh Tomatoes 1kg", 10, 40); // 150 units → 5/day
pushOrders(6, "RICE", "Basmati Rice 5kg", 10, 300); // 60 → 2/day
pushOrders(9, "EARBUD", "Wireless Earbuds", 10, 2000); // 90 → 3/day
pushOrders(3, "SPKR", "Bluetooth Speaker", 10, 1500); // 30 → 1/day (now out of stock)
pushOrders(3, "TSHIRT", "Cotton T-Shirt", 10, 400); // 30 → 1/day
orders.push(makeOrder("JEANS", "Denim Jeans", 10, 200, "delivered")); // 10 units
orders.push(makeOrder("CHARGER", "Fast Charger 65W", 6, 800, "delivered")); // 6 units

// Bargain Bazaar fulfilment problems → cancellations + disputes.
const c1 = makeOrder("TSHIRT", "Cotton T-Shirt", 1, 400, "cancelled", "o-s2-c1");
const c2 = makeOrder("JEANS", "Denim Jeans", 1, 200, "cancelled", "o-s2-c2");
const c3 = makeOrder("TSHIRT", "Cotton T-Shirt", 1, 400, "cancelled", "o-s2-c3");
const c4 = makeOrder("JEANS", "Denim Jeans", 1, 200, "cancelled", "o-s2-c4");
orders.push(c1, c2, c3, c4);

const reviews: ReviewInput[] = [
  ...Array.from({ length: 12 }, (_, i) => ({ id: `rv-p1-${i}`, productId: "p1", sellerId: "s1", rating: 5, verifiedPurchase: true, helpfulVotes: i, totalVotes: i + 1, moderationStatus: "VISIBLE" as const, createdAt: RECENT, body: "Fresh and fast." })),
  ...Array.from({ length: 10 }, (_, i) => ({ id: `rv-p6-${i}`, productId: "p6", sellerId: "s3", rating: i % 5 === 0 ? 4 : 5, verifiedPurchase: true, helpfulVotes: i, totalVotes: i + 1, moderationStatus: "VISIBLE" as const, createdAt: RECENT, body: "Great sound." })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `rv-p4-${i}`, productId: "p4", sellerId: "s2", rating: i % 2 === 0 ? 2 : 3, verifiedPurchase: i % 2 === 0, helpfulVotes: 1, totalVotes: 2, moderationStatus: "VISIBLE" as const, createdAt: RECENT, body: "Okay." })),
  { id: "rv-p5-flag1", productId: "p5", sellerId: "s2", rating: 5, verifiedPurchase: false, helpfulVotes: 40, totalVotes: 41, moderationStatus: "PENDING", createdAt: RECENT, body: "" },
  { id: "rv-p5-flag2", productId: "p5", sellerId: "s2", rating: 1, verifiedPurchase: false, helpfulVotes: 0, totalVotes: 0, moderationStatus: "HIDDEN", createdAt: RECENT, body: "" },
];

const returns: ReturnInput[] = [
  { id: "ret-1", orderId: "o-s2-c1", sellerId: "s2", buyerId: "b1", status: "requested", reason: "not as described", createdAt: RECENT },
  { id: "ret-2", orderId: "o-s2-c2", sellerId: "s2", buyerId: "b2", status: "requested", reason: "size", createdAt: RECENT },
  { id: "ret-3", orderId: "o-s2-c3", sellerId: "s2", buyerId: "b3", status: "approved", reason: "defective", createdAt: RECENT },
];

const refunds: RefundInput[] = [
  { id: "rf-1", orderId: "o-s2-c1", sellerId: "s2", buyerId: "b1", status: "requested", amount: 400, createdAt: RECENT },
  { id: "rf-2", orderId: "o-s2-c2", sellerId: "s2", buyerId: "b2", status: "processing", amount: 200, createdAt: RECENT },
];

const disputes: DisputeInput[] = [
  { id: "d1", orderId: "o-s2-c1", state: "arbitration", createdAt: RECENT },
  { id: "d2", orderId: "o-s2-c3", state: "open", createdAt: RECENT },
];

const tickets: SupportTicketInput[] = [
  { id: "t1", category: "delivery", priority: "urgent", status: "open", createdAt: RECENT },
  { id: "t2", category: "payment", priority: "high", status: "in_progress", createdAt: RECENT, firstResponseMinutes: 90 },
  { id: "t3", category: "order", priority: "medium", status: "resolved", createdAt: RECENT, firstResponseMinutes: 200 },
];

const behavior: BehaviorEvent[] = [
  ...Array.from({ length: 30 }, () => ({ productId: "p7", type: "view" as const, createdAt: RECENT })), // many views
  ...Array.from({ length: 2 }, () => ({ productId: "p7", type: "purchase" as const, createdAt: RECENT })), // low conversion → discovery gap
  ...Array.from({ length: 18 }, () => ({ productId: "p1", type: "view" as const, createdAt: RECENT })),
  ...Array.from({ length: 16 }, () => ({ productId: "p6", type: "view" as const, createdAt: RECENT })),
];

export const SAMPLE_MARKETPLACE_INPUT: MarketplaceActivityInput = {
  generatedAt: GENERATED_AT,
  products,
  inventory: [],
  orders,
  sellers,
  reviews,
  returns,
  refunds,
  disputes,
  tickets,
  promotions: [
    { code: "FRESH10", sellerId: "s1", type: "percent", value: 10, redemptions: 42, active: true },
    { code: "BARGAIN", sellerId: "s2", type: "flat", value: 50, redemptions: 3, active: true },
  ],
  searches: [
    { query: "tomatoes", category: "Groceries", results: 4, clicked: true, createdAt: RECENT },
    { query: "earbuds", category: "Electronics", results: 6, clicked: true, createdAt: RECENT },
    { query: "winter jacket", category: "Fashion", results: 0, clicked: false, createdAt: RECENT },
  ],
  behavior,
};
