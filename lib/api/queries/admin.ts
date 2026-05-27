import { AlertTriangle, BadgeIndianRupee, Boxes, ClipboardList, Flag, ShieldCheck, Store, Users } from "lucide-react";
import { requireRole } from "@/lib/api/auth";
import { stableCacheKey, withRequestCache } from "@/lib/performance/request-cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import type {
  AdminNotification,
  CategoryNode,
  GovernanceFlag,
  GovernanceMetric,
  ModerationCase,
  PlatformOrder,
  RefundCase,
  VendorApplication,
} from "@/features/admin/types";

type VendorRow = Tables<"vendors"> & {
  owner: Pick<Tables<"profiles">, "full_name" | "email"> | Pick<Tables<"profiles">, "full_name" | "email">[] | null;
};

type OrderRow = Tables<"orders"> & {
  vendor: Pick<Tables<"vendors">, "name"> | Pick<Tables<"vendors">, "name">[] | null;
  buyer: Pick<Tables<"profiles">, "full_name"> | Pick<Tables<"profiles">, "full_name">[] | null;
};

type RefundRow = Tables<"refund_requests"> & {
  order: OrderRow | OrderRow[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function vendorStatus(status: Tables<"vendors">["status"]): VendorApplication["status"] {
  if (status === "ACTIVE") return "approved";
  if (status === "SUSPENDED" || status === "CLOSED") return "suspended";
  if (status === "PENDING_VERIFICATION") return "pending";
  return "needs_review";
}

function orderStatus(status: Tables<"orders">["status"]): PlatformOrder["status"] {
  return status.toLowerCase() as PlatformOrder["status"];
}

function refundStatus(status: Tables<"refund_requests">["state"]): RefundCase["status"] {
  if (status === "REFUND_REQUESTED") return "open";
  if (status === "REFUND_REJECTED" || status === "REFUND_FAILED") return "rejected_placeholder";
  if (status === "REFUND_APPROVED" || status === "REFUND_SUCCEEDED") return "approved_placeholder";
  return "under_review";
}

function severity(index: number): GovernanceFlag["severity"] {
  return (["critical", "high", "medium", "low"] as const)[Math.min(index, 3)];
}

export async function getAdminOperationalSnapshot() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  return withRequestCache(stableCacheKey(["admin-snapshot"]), { ttlMs: 15_000, maxEntries: 20 }, getAdminOperationalSnapshotUncached);
}

async function getAdminOperationalSnapshotUncached() {
  const supabase = await createSupabaseServerClient();

  const [vendorsResult, ordersResult, productsResult, categoriesResult, refundsResult, alertsResult, notificationsResult, auditResult] = await Promise.all([
    supabase.from("vendors").select("*, owner:profiles(full_name, email)").is("deleted_at", null).order("created_at", { ascending: false }).limit(100),
    supabase
      .from("orders")
      .select("*, vendor:vendors(name), buyer:profiles(full_name)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("products").select("*, vendor:vendors(name)").is("deleted_at", null).order("updated_at", { ascending: false }).limit(100),
    supabase.from("categories").select("*").is("deleted_at", null).order("sort_order", { ascending: true }),
    supabase
      .from("refund_requests")
      .select("*, order:orders(*, vendor:vendors(name), buyer:profiles(full_name))")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("transaction_integrity_alerts").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("notifications").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(20),
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(20),
  ]);

  for (const result of [vendorsResult, ordersResult, productsResult, categoriesResult, refundsResult, alertsResult, notificationsResult, auditResult]) {
    if (result.error) throw result.error;
  }

  const vendorRows = (vendorsResult.data ?? []) as unknown as VendorRow[];
  const orderRows = (ordersResult.data ?? []) as unknown as OrderRow[];
  const productRows = (productsResult.data ?? []) as Array<Tables<"products"> & { vendor?: { name?: string } | { name?: string }[] | null }>;
  const refundRows = (refundsResult.data ?? []) as unknown as RefundRow[];
  const alertRows = (alertsResult.data ?? []) as Tables<"transaction_integrity_alerts">[];

  const vendors: VendorApplication[] = vendorRows.map((vendor) => {
    const owner = first(vendor.owner);
    const metadata = asObject(vendor.metadata);

    return {
      id: vendor.id,
      businessName: vendor.name,
      owner: owner?.full_name ?? owner?.email ?? "Unassigned owner",
      category: typeof metadata.category === "string" ? metadata.category : "Marketplace seller",
      zone: typeof metadata.locality === "string" ? metadata.locality : `Radius ${vendor.service_radius_km} km`,
      status: vendorStatus(vendor.status),
      risk: vendor.status === "SUSPENDED" ? "high" : vendor.status === "PENDING_VERIFICATION" ? "medium" : "low",
      submittedAt: vendor.created_at,
      documents: Array.isArray(metadata.documents) ? metadata.documents.filter((item): item is string => typeof item === "string") : ["Verification record"],
      notes: typeof metadata.lastModerationNote === "string" ? metadata.lastModerationNote : "Live seller record",
      orders30d: orderRows.filter((order) => order.vendor_id === vendor.id).length,
      fulfillmentRate: orderRows.length ? Math.round((orderRows.filter((order) => order.vendor_id === vendor.id && order.status === "DELIVERED").length / Math.max(1, orderRows.filter((order) => order.vendor_id === vendor.id).length)) * 100) : 0,
      ratingPlaceholder: `${vendor.rating_average} rating`,
    };
  });

  const platformOrders: PlatformOrder[] = orderRows.map((order) => ({
    id: order.order_number,
    seller: first(order.vendor)?.name ?? "Seller",
    customer: first(order.buyer)?.full_name ?? "Buyer",
    status: orderStatus(order.status),
    value: Number(order.total_amount),
    zone: typeof asObject(order.delivery_address).locality === "string" ? String(asObject(order.delivery_address).locality) : "Live zone",
    signal: order.payment_status,
    paymentState: order.payment_status,
    transactionReference: order.payment_reference ?? undefined,
  }));

  const refunds: RefundCase[] = refundRows.map((refund) => {
    const order = first(refund.order);
    return {
      id: refund.id,
      orderId: order?.order_number ?? refund.order_id,
      customer: first(order?.buyer)?.full_name ?? "Buyer",
      seller: first(order?.vendor)?.name ?? "Seller",
      amount: Number(refund.amount),
      status: refundStatus(refund.state),
      reason: refund.reason,
      openedAt: refund.created_at,
    };
  });

  const categories: CategoryNode[] = ((categoriesResult.data ?? []) as Tables<"categories">[]).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    parent: category.parent_id ?? "Marketplace root",
    status: category.is_active ? "active" : "inactive",
    productCount: productRows.filter((product) => product.category_id === category.id).length,
    imagePlaceholder: category.image_url ?? "Live category media",
  }));

  const moderationCases: ModerationCase[] = productRows
    .filter((product) => product.status === "SUSPENDED" || product.status === "DRAFT")
    .slice(0, 20)
    .map((product, index) => ({
      id: product.id,
      type: "product",
      title: product.name,
      seller: first(product.vendor)?.name ?? "Seller",
      status: product.status === "SUSPENDED" ? "suspended" : "pending_review",
      priority: severity(index),
      reason: typeof asObject(product.ai_index_metadata).lastModerationNote === "string" ? String(asObject(product.ai_index_metadata).lastModerationNote) : "Awaiting catalog governance review.",
      reportedAt: product.updated_at,
      history: "Loaded from live product moderation state.",
    }));

  const flags: GovernanceFlag[] = alertRows.map((alert, index) => ({
    id: alert.id,
    type: "operational_anomaly",
    severity: severity(index),
    subject: alert.code,
    detail: alert.message,
    createdAt: alert.created_at,
    owner: "Platform Ops",
  }));

  const adminNotifications: AdminNotification[] = ((notificationsResult.data ?? []) as Tables<"notifications">[]).map((notification) => ({
    id: notification.id,
    title: notification.title,
    detail: notification.body,
    type: notification.type === "ADMIN_ALERT" ? "seller" : notification.type === "ORDER_UPDATE" ? "operations" : "system",
    time: notification.created_at,
    read: Boolean(notification.read_at),
  }));

  const gmv = orderRows.reduce((sum, order) => sum + Number(order.total_amount), 0);
  const activeSellers = vendorRows.filter((vendor) => vendor.status === "ACTIVE").length;
  const pending = vendorRows.filter((vendor) => vendor.status === "PENDING_VERIFICATION").length;
  const openRefunds = refundRows.filter((refund) => !["REFUND_SUCCEEDED", "REFUND_REJECTED"].includes(refund.state)).length;
  const openFlags = alertRows.filter((alert) => alert.state === "OPEN").length;
  const buyers = new Set(orderRows.map((order) => order.buyer_id)).size;

  const governanceMetrics: GovernanceMetric[] = [
    { label: "Total GMV", value: `Rs ${gmv.toLocaleString("en-IN")}`, helper: "From live orders", tone: "neutral", icon: BadgeIndianRupee },
    { label: "Active sellers", value: String(activeSellers), helper: `${pending} pending review`, tone: "success", icon: Store },
    { label: "Pending approvals", value: String(pending), helper: "Seller verification queue", tone: pending ? "warning" : "success", icon: ShieldCheck },
    { label: "Total orders", value: String(orderRows.length), helper: "Live platform orders", tone: "info", icon: ClipboardList },
    { label: "Flagged content", value: String(openFlags + moderationCases.length), helper: "Moderation and integrity alerts", tone: openFlags ? "danger" : "neutral", icon: Flag },
    { label: "Refund requests", value: String(openRefunds), helper: "Payment governance queue", tone: openRefunds ? "warning" : "success", icon: AlertTriangle },
    { label: "Active buyers", value: String(buyers), helper: "Distinct live order buyers", tone: "neutral", icon: Users },
    { label: "Operational health", value: openFlags ? "Degraded" : "Stable", helper: "Integrity alert state", tone: openFlags ? "warning" : "success", icon: Boxes },
  ];

  return {
    governanceMetrics,
    vendors,
    moderationCases,
    refunds,
    platformOrders,
    categories,
    flags,
    adminNotifications,
    analytics: {
      growth: vendorRows.slice(0, 12).map((_, index) => index + 1),
      orders: orderRows.slice(0, 7).map((order) => Number(order.total_amount)),
      moderation: [moderationCases.length, flags.length, openRefunds, pending],
    },
  };
}
