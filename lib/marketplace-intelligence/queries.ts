// MCP-0E — Live marketplace data access for the intelligence engine.
//
// Reads REAL marketplace tables when Supabase is configured and feeds the
// deterministic engine. Honest degradation: when unconfigured (or on auth
// failure at a public surface) it falls back to the clearly-labelled sample —
// it never substitutes demo data into a "live" result (sampled flag is true).

import { requireRole } from "@/lib/api/auth";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SellerOrder, SellerOrderItem } from "@/features/seller/types";
import type { DisputeInput, RefundInput, ReviewInput } from "@/lib/trust/types";
import { buildMarketplaceIntelligence } from "./index";
import { buildMarketplaceFabric } from "./fabric";
import { buildBuyerIntelligence, type BuyerContext } from "./buyer";
import { SAMPLE_MARKETPLACE_INPUT } from "./sample";
import type {
  BuyerIntelligence,
  FabricProductInput,
  MarketplaceActivityInput,
  MarketplaceIntelligenceSnapshot,
  StoreActivity,
} from "./types";

export interface MarketplaceIntelligenceResult {
  configured: boolean;
  /** True when the snapshot is built from the labelled sample (preview only). */
  sampled: boolean;
  generatedAt: string;
  intelligence: MarketplaceIntelligenceSnapshot;
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}
function str(source: Record<string, unknown>, key: string, fallback = ""): string {
  const v = source[key];
  return typeof v === "string" ? v : fallback;
}
function num(source: Record<string, unknown>, key: string, fallback = 0): number {
  const v = source[key];
  return typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : fallback;
}

function mapProductStatus(status: string): FabricProductInput["status"] {
  if (status === "ACTIVE") return "published";
  if (status === "ARCHIVED") return "archived";
  return "draft";
}

function isConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

// ── Row → engine-input mapping (defensive: casts rows to permissive records) ──

function mapProductRow(row: Record<string, unknown>): FabricProductInput {
  const category = rec(first(row.category as unknown));
  const inventory = rec(first(row.inventory as unknown));
  const vendor = rec(first(row.vendor as unknown));
  const meta = rec(row.ai_index_metadata);
  const basePrice = num(row, "base_price");
  const stock = num(inventory, "stock_quantity");
  const reserved = num(inventory, "reserved_quantity");
  const status = str(row, "status", "DRAFT");
  return {
    id: str(row, "id"),
    sku: str(meta, "sku", str(row, "slug").toUpperCase() || str(row, "id")),
    name: str(row, "name", "Product"),
    category: str(category, "name", "Uncategorized"),
    price: basePrice,
    mrp: num(meta, "originalPrice", basePrice),
    status: mapProductStatus(status),
    visibility: status === "ACTIVE" ? "marketplace" : "hidden",
    stock,
    reserved,
    lowStockThreshold: num(inventory, "low_stock_threshold", 5),
    soldToday: 0,
    imageHint: str(row, "name"),
    updatedAt: str(row, "updated_at", new Date().toISOString()),
    sellerId: str(row, "vendor_id", "marketplace"),
    sellerName: str(vendor, "name", "Seller"),
  };
}

function mapOrderRow(row: Record<string, unknown>): SellerOrder {
  const items = Array.isArray(row.items) ? (row.items as unknown[]).map((i) => rec(i)) : [];
  const mappedItems: SellerOrderItem[] = items.map((item) => ({
    sku: str(item, "product_id", str(item, "variant_id")),
    name: str(item, "product_name", "Item"),
    quantity: num(item, "quantity", 1),
    unitPrice: num(item, "unit_price"),
    picked: str(item, "fulfillment_status", "PENDING") !== "PENDING",
  }));
  return {
    id: str(row, "order_number", str(row, "id")),
    dbId: str(row, "id"),
    customer: "Buyer",
    phone: "—",
    address: "On order",
    status: str(row, "status", "pending").toLowerCase() as SellerOrder["status"],
    promisedInMinutes: 30,
    createdAt: str(row, "created_at", new Date().toISOString()),
    paymentMode: "UPI",
    subtotal: num(row, "subtotal_amount"),
    deliveryFee: num(row, "delivery_fee_amount"),
    notes: "",
    items: mappedItems,
    timeline: [],
  };
}

function mapReviewRow(row: Record<string, unknown>): ReviewInput {
  const moderation = str(row, "moderation_status", "VISIBLE");
  const allowed = ["VISIBLE", "PENDING", "HIDDEN", "REJECTED"];
  return {
    id: str(row, "id"),
    productId: str(row, "product_id"),
    sellerId: str(row, "vendor_id", str(row, "seller_id")),
    rating: num(row, "rating", 5),
    verifiedPurchase: Boolean(row.verified_purchase ?? row.is_verified_purchase ?? false),
    helpfulVotes: num(row, "helpful_count", num(row, "helpful_votes")),
    totalVotes: num(row, "total_votes"),
    moderationStatus: (allowed.includes(moderation) ? moderation : "VISIBLE") as ReviewInput["moderationStatus"],
    createdAt: str(row, "created_at", new Date().toISOString()),
  };
}

function mapRefundRow(row: Record<string, unknown>): RefundInput {
  const status = str(row, "status", "requested").toLowerCase();
  const allowed = ["requested", "approved", "rejected", "processing", "refunded", "failed"];
  return {
    id: str(row, "id"),
    orderId: str(row, "order_id"),
    sellerId: str(row, "vendor_id", str(row, "seller_id")),
    status: (allowed.includes(status) ? status : "requested") as RefundInput["status"],
    amount: num(row, "amount", num(row, "amount_paise") / 100),
    createdAt: str(row, "created_at", new Date().toISOString()),
  };
}

function mapDisputeRow(row: Record<string, unknown>): DisputeInput {
  const raw = str(row, "state", str(row, "status", "open")).toLowerCase();
  const allowed = ["open", "evidence", "arbitration", "resolved_buyer", "resolved_seller", "dismissed"];
  return {
    id: str(row, "id"),
    orderId: str(row, "order_id"),
    state: (allowed.includes(raw) ? raw : "open") as DisputeInput["state"],
    createdAt: str(row, "created_at", new Date().toISOString()),
  };
}

// ── Admin marketplace intelligence (full, admin-gated) ──

async function readMarketplaceActivity(): Promise<MarketplaceActivityInput> {
  const supabase = await createSupabaseServerClient();
  const [productsResult, ordersResult, vendorsResult, reviewsResult, refundsResult, disputesResult] = await Promise.all([
    supabase.from("products").select("*, category:categories(name, slug), inventory(*), vendor:vendors(name, status)").is("deleted_at", null).order("updated_at", { ascending: false }).limit(400),
    supabase.from("orders").select("*, items:order_items(*)").is("deleted_at", null).order("created_at", { ascending: false }).limit(500),
    supabase.from("vendors").select("id, name, status").is("deleted_at", null).limit(200),
    supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(1000),
    supabase.from("refund_requests").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("marketplace_disputes").select("*").order("created_at", { ascending: false }).limit(500),
  ]);

  const products = ((productsResult.data ?? []) as unknown as Record<string, unknown>[]).map(mapProductRow);
  const orders = ((ordersResult.data ?? []) as unknown as Record<string, unknown>[]).map(mapOrderRow);
  const sellers: StoreActivity[] = ((vendorsResult.data ?? []) as unknown as Record<string, unknown>[]).map((v) => ({
    sellerId: str(v, "id"),
    name: str(v, "name", "Seller"),
    verified: str(v, "status") === "ACTIVE",
    responseMinutes: 60,
    status: str(v, "status"),
  }));
  const reviews = ((reviewsResult.data ?? []) as unknown as Record<string, unknown>[]).map(mapReviewRow);
  const refunds = ((refundsResult.data ?? []) as unknown as Record<string, unknown>[]).map(mapRefundRow);
  const disputes = ((disputesResult.data ?? []) as unknown as Record<string, unknown>[]).map(mapDisputeRow);

  return {
    generatedAt: new Date().toISOString(),
    products,
    inventory: [],
    orders,
    sellers,
    reviews,
    returns: [],
    refunds,
    disputes,
    tickets: [],
  };
}

/** Admin-gated live marketplace intelligence; honest sample fallback otherwise. */
export async function getMarketplaceIntelligenceSnapshot(): Promise<MarketplaceIntelligenceResult> {
  if (!isConfigured()) {
    return { configured: false, sampled: true, generatedAt: new Date().toISOString(), intelligence: buildMarketplaceIntelligence(SAMPLE_MARKETPLACE_INPUT) };
  }
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const activity = await readMarketplaceActivity();
  const intelligence = buildMarketplaceIntelligence(activity);
  return { configured: true, sampled: !intelligence.fabric.hasActivity, generatedAt: intelligence.generatedAt, intelligence };
}

// ── Seller intelligence briefing (reuses the live seller snapshot) ──

/** Live seller intelligence briefing built from the seller's real snapshot. */
export async function getSellerIntelligenceBriefing(): Promise<MarketplaceIntelligenceResult> {
  if (!isConfigured()) {
    return { configured: false, sampled: true, generatedAt: new Date().toISOString(), intelligence: buildMarketplaceIntelligence(SAMPLE_MARKETPLACE_INPUT) };
  }
  // Imported lazily to avoid pulling the seller snapshot graph into other callers.
  const { getSellerOperationalSnapshot } = await import("@/lib/api/queries/seller");
  const snapshot = await getSellerOperationalSnapshot();
  const vendor = snapshot.vendor;
  if (!vendor) {
    return { configured: true, sampled: true, generatedAt: new Date().toISOString(), intelligence: buildMarketplaceIntelligence(SAMPLE_MARKETPLACE_INPUT) };
  }
  const seller: StoreActivity = { sellerId: vendor.id, name: vendor.name, verified: vendor.status === "ACTIVE", responseMinutes: 45, status: vendor.status };
  const products: FabricProductInput[] = snapshot.products.map((p) => ({ ...p, sellerId: vendor.id, sellerName: vendor.name }));
  const activity: MarketplaceActivityInput = {
    generatedAt: new Date().toISOString(),
    products,
    inventory: snapshot.inventory,
    orders: snapshot.orders,
    sellers: [seller],
    reviews: [],
    returns: [],
    refunds: [],
    disputes: [],
    tickets: [],
  };
  const intelligence = buildMarketplaceIntelligence(activity);
  return { configured: true, sampled: !intelligence.fabric.hasActivity, generatedAt: intelligence.generatedAt, intelligence };
}

// ── Buyer discovery intelligence (public catalog) ──

export interface BuyerDiscoveryResult {
  configured: boolean;
  sampled: boolean;
  intelligence: BuyerIntelligence;
}

/** Buyer-facing discovery intelligence from the public catalog; sample otherwise. */
export async function getBuyerDiscoveryIntelligence(ctx: BuyerContext = {}): Promise<BuyerDiscoveryResult> {
  if (!isConfigured()) {
    const fabric = buildMarketplaceFabric(SAMPLE_MARKETPLACE_INPUT);
    return { configured: false, sampled: true, intelligence: buildBuyerIntelligence(fabric, ctx) };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const [productsResult, reviewsResult] = await Promise.all([
      supabase.from("products").select("*, category:categories(name, slug), inventory(*), vendor:vendors(name, status)").eq("status", "ACTIVE").is("deleted_at", null).limit(400),
      supabase.from("reviews").select("*").eq("moderation_status", "VISIBLE").limit(1000),
    ]);
    const products = ((productsResult.data ?? []) as unknown as Record<string, unknown>[]).map(mapProductRow);
    const reviews = ((reviewsResult.data ?? []) as unknown as Record<string, unknown>[]).map(mapReviewRow);
    const fabric = buildMarketplaceFabric({ products, inventory: [], orders: [], sellers: [], reviews, returns: [], refunds: [], disputes: [], tickets: [] });
    if (!fabric.hasActivity) {
      const sample = buildMarketplaceFabric(SAMPLE_MARKETPLACE_INPUT);
      return { configured: true, sampled: true, intelligence: buildBuyerIntelligence(sample, ctx) };
    }
    return { configured: true, sampled: false, intelligence: buildBuyerIntelligence(fabric, ctx) };
  } catch {
    const fabric = buildMarketplaceFabric(SAMPLE_MARKETPLACE_INPUT);
    return { configured: false, sampled: true, intelligence: buildBuyerIntelligence(fabric, ctx) };
  }
}
