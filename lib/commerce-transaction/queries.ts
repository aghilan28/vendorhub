// MCP-0F — Live transaction data access for the engine.
//
// Reads REAL commerce tables when Supabase is configured and feeds the
// deterministic engine. Honest degradation: when unconfigured (or on auth
// failure at a surface) it falls back to the clearly-labelled sample — it never
// substitutes demo data into a "live" result (sampled flag is true). Mirrors
// the MCP-0E queries.ts pattern.

import { requireRole, requireUser } from "@/lib/api/auth";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DisputeInput, RefundInput, ReturnInput, ReviewInput, SupportTicketInput } from "@/lib/trust/types";
import { buildTransactionSnapshot } from "./index";
import { fromDbOrderStatus } from "./state-machine";
import { SAMPLE_TRANSACTION_INPUT } from "./sample";
import type {
  Coupon,
  PaymentAttemptRecord,
  PaymentMethod,
  PaymentState,
  Shipment,
  TransactionActivityInput,
  TransactionSnapshot,
  TxOrder,
  TxOrderItem,
} from "./types";

export interface TransactionResult {
  configured: boolean;
  /** True when the snapshot is built from the labelled sample (preview only). */
  sampled: boolean;
  generatedAt: string;
  snapshot: TransactionSnapshot;
}

function isConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
function str(source: Record<string, unknown>, key: string, fallback = ""): string {
  const v = source[key];
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : fallback;
}
function num(source: Record<string, unknown>, key: string, fallback = 0): number {
  const v = source[key];
  return typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : fallback;
}

const PAYMENT_METHODS_SET = new Set<PaymentMethod>(["upi", "card", "netbanking", "wallet", "cod"]);
function toPaymentMethod(value: string): PaymentMethod {
  const v = value.toLowerCase() as PaymentMethod;
  return PAYMENT_METHODS_SET.has(v) ? v : "upi";
}

function toPaymentState(value: string): PaymentState {
  const v = value.toLowerCase();
  const allowed: PaymentState[] = [
    "not_started", "intent_created", "pending", "processing", "succeeded", "failed",
    "cancelled", "cod_pending", "cod_confirmed", "refund_pending", "refunded",
  ];
  return (allowed.includes(v as PaymentState) ? v : "pending") as PaymentState;
}

function mapOrderRow(row: Record<string, unknown>): TxOrder {
  const itemsRaw = Array.isArray(row.items) ? (row.items as unknown[]).map(rec) : [];
  const items: TxOrderItem[] = itemsRaw.map((i) => ({
    sku: str(i, "product_id", str(i, "variant_id", "SKU")),
    name: str(i, "product_name", "Item"),
    quantity: num(i, "quantity", 1),
    unitPrice: num(i, "unit_price", num(i, "price")),
  }));
  const metadata = rec(row.metadata);
  const vendor = rec(Array.isArray(row.vendor) ? (row.vendor as unknown[])[0] : row.vendor);
  return {
    id: str(row, "id"),
    orderNumber: str(row, "order_number", str(row, "id")),
    buyerId: str(row, "buyer_id"),
    buyerName: "Buyer",
    sellerId: str(row, "vendor_id", "marketplace"),
    sellerName: str(vendor, "name", "Seller"),
    state: fromDbOrderStatus(str(row, "status", "PENDING")),
    paymentMethod: toPaymentMethod(str(metadata, "payment_method", str(row, "payment_method", "upi"))),
    paymentState: toPaymentState(str(row, "payment_status", "pending")),
    total: num(row, "total_amount", num(row, "total")),
    currency: "INR",
    createdAt: str(row, "created_at", new Date().toISOString()),
    updatedAt: str(row, "updated_at", new Date().toISOString()),
    items,
    destinationPincode: str(metadata, "pincode", "000000"),
    slaMinutes: 120,
    events: [],
  };
}

function mapPaymentRow(row: Record<string, unknown>): PaymentAttemptRecord {
  return {
    id: str(row, "id"),
    orderId: str(row, "order_id", str(row, "transaction_id")),
    method: toPaymentMethod(str(row, "method", "upi")),
    state: toPaymentState(str(row, "state", str(row, "financial_state", "pending"))),
    amount: num(row, "amount"),
    currency: "INR",
    attempts: num(row, "attempt_count", 1),
    createdAt: str(row, "created_at", new Date().toISOString()),
    updatedAt: str(row, "updated_at", new Date().toISOString()),
    providerOrderId: str(row, "provider_order_id") || undefined,
    providerPaymentId: str(row, "provider_payment_id") || undefined,
    failureReason: str(row, "failure_reason") || undefined,
  };
}

function mapRefundRow(row: Record<string, unknown>): RefundInput {
  const status = str(row, "state", str(row, "status", "requested")).toLowerCase();
  const map: Record<string, RefundInput["status"]> = {
    refund_succeeded: "refunded", refund_processing: "processing", refund_initiated: "processing",
    refund_failed: "failed", refund_reconciling: "processing",
  };
  const allowed = ["requested", "approved", "rejected", "processing", "refunded", "failed"];
  const normalized = map[status] ?? (allowed.includes(status) ? (status as RefundInput["status"]) : "requested");
  return {
    id: str(row, "id"),
    orderId: str(row, "order_id"),
    sellerId: str(row, "vendor_id", str(row, "seller_id")),
    status: normalized,
    amount: num(row, "amount"),
    createdAt: str(row, "created_at", new Date().toISOString()),
  };
}

async function readActivity(scope: "marketplace" | "seller" | "buyer", userId?: string): Promise<TransactionActivityInput> {
  const supabase = await createSupabaseServerClient();
  let ordersQuery = supabase
    .from("orders")
    .select("*, items:order_items(*), vendor:vendors(name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);
  if (scope === "buyer" && userId) ordersQuery = ordersQuery.eq("buyer_id", userId);

  const [ordersResult, refundsResult, paymentsResult] = await Promise.all([
    ordersQuery,
    supabase.from("refund_requests").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("payment_attempts").select("*").order("created_at", { ascending: false }).limit(500),
  ]);

  const orders = ((ordersResult.data ?? []) as unknown as Record<string, unknown>[]).map(mapOrderRow);
  const refunds = ((refundsResult.data ?? []) as unknown as Record<string, unknown>[]).map(mapRefundRow);
  const payments = ((paymentsResult.data ?? []) as unknown as Record<string, unknown>[]).map(mapPaymentRow);

  // Returns / reviews / tickets / disputes / shipments degrade to empty when the
  // tables are unavailable in generated types — no column guessing.
  const returns: ReturnInput[] = [];
  const reviews: ReviewInput[] = [];
  const tickets: SupportTicketInput[] = [];
  const disputes: DisputeInput[] = [];
  const shipments: Shipment[] = [];
  const coupons: Coupon[] = [];

  return { generatedAt: new Date().toISOString(), orders, payments, shipments, coupons, returns, refunds, reviews, tickets, disputes };
}

function sampleResult(configured: boolean): TransactionResult {
  const snapshot = buildTransactionSnapshot(SAMPLE_TRANSACTION_INPUT);
  return { configured, sampled: true, generatedAt: snapshot.generatedAt, snapshot };
}

/** Admin-gated commerce governance snapshot; honest sample fallback otherwise. */
export async function getCommerceGovernanceSnapshot(): Promise<TransactionResult> {
  if (!isConfigured()) return sampleResult(false);
  try {
    await requireRole(["ADMIN", "SUPER_ADMIN"]);
    const activity = await readActivity("marketplace");
    const snapshot = buildTransactionSnapshot(activity);
    if (!snapshot.hasActivity) return { configured: true, sampled: true, generatedAt: snapshot.generatedAt, snapshot: buildTransactionSnapshot(SAMPLE_TRANSACTION_INPUT) };
    return { configured: true, sampled: false, generatedAt: snapshot.generatedAt, snapshot };
  } catch {
    return sampleResult(true);
  }
}

/** Seller fulfillment snapshot (orders the seller must fulfill). */
export async function getSellerFulfillmentSnapshot(): Promise<TransactionResult> {
  if (!isConfigured()) return sampleResult(false);
  try {
    await requireRole(["SELLER", "ADMIN", "SUPER_ADMIN"]);
    const activity = await readActivity("seller");
    const snapshot = buildTransactionSnapshot(activity);
    if (!snapshot.hasActivity) return { configured: true, sampled: true, generatedAt: snapshot.generatedAt, snapshot: buildTransactionSnapshot(SAMPLE_TRANSACTION_INPUT) };
    return { configured: true, sampled: false, generatedAt: snapshot.generatedAt, snapshot };
  } catch {
    return sampleResult(true);
  }
}

/** Buyer order center snapshot (the signed-in buyer's own orders). */
export async function getBuyerOrderCenterSnapshot(): Promise<TransactionResult> {
  if (!isConfigured()) return sampleResult(false);
  try {
    const user = await requireUser();
    const activity = await readActivity("buyer", user.id);
    const snapshot = buildTransactionSnapshot(activity);
    if (!snapshot.hasActivity) return { configured: true, sampled: true, generatedAt: snapshot.generatedAt, snapshot: buildTransactionSnapshot(SAMPLE_TRANSACTION_INPUT) };
    return { configured: true, sampled: false, generatedAt: snapshot.generatedAt, snapshot };
  } catch {
    return sampleResult(true);
  }
}
