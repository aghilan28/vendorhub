import {
  BadgeCheck,
  Boxes,
  ClipboardList,
  IndianRupee,
  PackageCheck,
  RotateCcw,
  Truck,
} from "lucide-react";
import { requireUser } from "@/lib/api/auth";
import { buildMerchantIntelligence } from "@/features/merchant-intelligence";
import type { MerchantInsight, MerchantIntelligenceSnapshot } from "@/features/merchant-intelligence";
import { stableCacheKey, withRequestCache } from "@/lib/performance/request-cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordOperationalEvent } from "@/lib/production/observability";
import type { Tables } from "@/types/database";
import type { InventoryItem, SellerMetric, SellerNotification, SellerOrder, SellerProduct } from "@/features/seller/types";

type VendorMemberRow = {
  role: string;
  vendor: Tables<"vendors"> | Tables<"vendors">[] | null;
};

type ProductRow = Tables<"products"> & {
  category: Pick<Tables<"categories">, "name" | "slug"> | Pick<Tables<"categories">, "name" | "slug">[] | null;
  inventory: Tables<"inventory">[] | null;
  variants: Pick<Tables<"product_variants">, "sku">[] | null;
};

type OrderRow = Tables<"orders"> & {
  buyer: Pick<Tables<"profiles">, "full_name" | "phone" | "email"> | Pick<Tables<"profiles">, "full_name" | "phone" | "email">[] | null;
  items: Tables<"order_items">[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: Record<string, unknown>, key: string, fallback = "") {
  return typeof value[key] === "string" ? value[key] : fallback;
}

function asNumber(value: Record<string, unknown>, key: string, fallback = 0) {
  return typeof value[key] === "number" ? value[key] : fallback;
}

function productStatus(status: Tables<"products">["status"]): SellerProduct["status"] {
  if (status === "ACTIVE") return "published";
  if (status === "ARCHIVED") return "archived";
  return "draft";
}

function orderStatus(status: Tables<"orders">["status"]): SellerOrder["status"] {
  return status.toLowerCase() as SellerOrder["status"];
}

function money(value: number | string) {
  return Number(value ?? 0);
}

function snapshotStaleAt(snapshot: MerchantIntelligenceSnapshot) {
  return new Date(new Date(snapshot.generatedAt).getTime() + snapshot.observability.snapshotTtlMinutes * 60_000).toISOString();
}

function productIdFromInsight(insight: MerchantInsight, products: SellerProduct[]) {
  const product = products.find((item) => insight.id.endsWith(item.id));
  return product?.id ?? null;
}

function alertFingerprint(insight: MerchantInsight) {
  return `${insight.domain}:${insight.id}:${insight.severity}`;
}

function highSignalAlerts(snapshot: MerchantIntelligenceSnapshot) {
  return snapshot.insights.filter((insight) => insight.severity === "critical" || insight.severity === "warning" || insight.domain === "fairness");
}

async function persistMerchantIntelligenceSnapshot(vendor: Tables<"vendors">, products: SellerProduct[], snapshot: MerchantIntelligenceSnapshot, latencyMs: number) {
  const supabase = await createSupabaseServerClient();
  const alerts = highSignalAlerts(snapshot);

  const [snapshotResult, alertsResult, observabilityResult] = await Promise.all([
    supabase.from("seller_intelligence_snapshots").upsert(
      {
        vendor_id: vendor.id,
        generated_for_date: snapshot.generatedAt.slice(0, 10),
        health_score: snapshot.summary.healthScore,
        demand_score: snapshot.summary.demandScore,
        inventory_score: snapshot.summary.inventoryScore,
        fulfillment_score: snapshot.summary.fulfillmentScore,
        discoverability_score: snapshot.summary.discoverabilityScore,
        fairness_score: snapshot.summary.fairnessScore,
        snapshot,
        stale_at: snapshotStaleAt(snapshot),
      },
      { onConflict: "vendor_id,generated_for_date" },
    ),
    alerts.length
      ? supabase.from("seller_intelligence_alerts").upsert(
          alerts.map((insight) => ({
            vendor_id: vendor.id,
            product_id: productIdFromInsight(insight, products),
            domain: insight.domain,
            severity: insight.severity,
            title: insight.title,
            explanation: insight.explanation,
            action: insight.action,
            evidence: insight.evidence,
            state: "OPEN" as const,
            metadata: {
              fingerprint: alertFingerprint(insight),
              confidence: insight.confidence,
              localeText: insight.localeText,
              generatedAt: snapshot.generatedAt,
            },
          })),
          { onConflict: "vendor_id,domain,title,state" },
        )
      : Promise.resolve({ error: null }),
    supabase.rpc("record_seller_forecast_observability", {
      target_vendor_id: vendor.id,
      event_metric: "seller_intelligence.snapshot_refresh",
      latency_ms: latencyMs,
      forecast_count: snapshot.forecasts.length,
      alert_count: alerts.length,
      stale: snapshot.stale,
      event_metadata: {
        inventoryCount: snapshot.inventory.length,
        insightCount: snapshot.insights.length,
        source: snapshot.observability.source,
        refreshReasons: snapshot.observability.refreshReasons,
      },
    }),
  ]);

  for (const [name, result] of Object.entries({ snapshot: snapshotResult, alerts: alertsResult, observability: observabilityResult })) {
    if (result.error) {
      recordOperationalEvent("warn", "merchant_intelligence.persistence_failed", {
        vendorId: vendor.id,
        target: name,
        message: result.error.message,
      }, { domain: "seller", subjectId: vendor.id, error: result.error });
    }
  }
}

export async function getCurrentSellerVendor() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vendor_members")
    .select("role, vendor:vendors(*)")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const vendor = first((data as unknown as VendorMemberRow | null)?.vendor);
  return vendor;
}

export async function getSellerOperationalSnapshot() {
  const vendor = await getCurrentSellerVendor();

  if (!vendor) {
    const emptyProducts: SellerProduct[] = [];
    const emptyInventory: InventoryItem[] = [];
    const emptyOrders: SellerOrder[] = [];
    return {
      vendor: null,
      metrics: [] as SellerMetric[],
      products: emptyProducts,
      inventory: emptyInventory,
      orders: emptyOrders,
      notifications: [] as SellerNotification[],
      analytics: { sales: [] as number[], orders: [] as number[], category: [] as Array<{ label: string; value: string }> },
      intelligence: buildMerchantIntelligence({
        vendor: { id: "no-vendor", name: "Seller onboarding", locality: "Local operating area", city: "Chennai", delivery_radius_km: 5 },
        products: emptyProducts,
        inventory: emptyInventory,
        orders: emptyOrders,
      }),
    };
  }

  return withRequestCache(stableCacheKey(["seller-snapshot", vendor.id]), { ttlMs: 20_000, maxEntries: 100 }, () => getSellerOperationalSnapshotForVendor(vendor));
}

async function getSellerOperationalSnapshotForVendor(vendor: Tables<"vendors">) {
  const startedAt = Date.now();
  const supabase = await createSupabaseServerClient();
  const [productsResult, ordersResult, notificationsResult, movementsResult, payoutsResult] = await Promise.all([
    supabase
      .from("products")
      .select(
        `
          *,
          category:categories(name, slug),
          inventory(*),
          variants:product_variants(sku)
        `,
      )
      .eq("vendor_id", vendor.id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(150),
    supabase
      .from("orders")
      .select("*, buyer:profiles(full_name, phone, email), items:order_items(*)")
      .eq("vendor_id", vendor.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("notifications")
      .select("*")
      .eq("vendor_id", vendor.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("inventory_movements")
      .select("*")
      .eq("vendor_id", vendor.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("seller_payout_attributions").select("gross_amount, net_amount, state").eq("vendor_id", vendor.id).order("created_at", { ascending: false }).limit(100),
  ]);

  for (const result of [productsResult, ordersResult, notificationsResult, movementsResult, payoutsResult]) {
    if (result.error) throw result.error;
  }

  const movementsByInventory = new Map<string, Tables<"inventory_movements">>();
  for (const movement of (movementsResult.data ?? []) as Tables<"inventory_movements">[]) {
    if (!movementsByInventory.has(movement.inventory_id)) movementsByInventory.set(movement.inventory_id, movement);
  }

  const products = ((productsResult.data ?? []) as unknown as ProductRow[]).map((product) => {
    const inventory = product.inventory?.[0];
    const meta = asObject(product.ai_index_metadata);
    const discovery = asObject(product.discovery_metadata);
    const sku = product.variants?.[0]?.sku ?? asString(meta, "sku", product.slug.toUpperCase());
    const stock = inventory?.stock_quantity ?? 0;
    const reserved = inventory?.reserved_quantity ?? 0;

    return {
      id: product.id,
      sku,
      name: product.name,
      category: first(product.category)?.name ?? "Uncategorized",
      price: money(product.base_price),
      mrp: asNumber(meta, "originalPrice", money(product.base_price)),
      status: productStatus(product.status),
      visibility: product.status === "ACTIVE" ? "marketplace" : product.status === "SUSPENDED" ? "store_only" : "hidden",
      stock,
      reserved,
      lowStockThreshold: inventory?.low_stock_threshold ?? 5,
      soldToday: asNumber(discovery, "soldToday", 0),
      imageHint: asString(meta, "imageHint", product.name),
      updatedAt: product.updated_at,
      inventoryId: inventory?.id,
    } satisfies SellerProduct;
  });

  const inventory = ((productsResult.data ?? []) as unknown as ProductRow[]).flatMap((product) => {
    const mapped = products.find((item) => item.id === product.id);
    const stock = product.inventory?.[0];
    if (!mapped || !stock) return [];
    const meta = asObject(product.discovery_metadata);
    const movement = movementsByInventory.get(stock.id);

    return [
      {
        ...mapped,
        inventoryId: stock.id,
        aisle: asString(meta, "aisle", "Primary shelf"),
        batch: asString(meta, "batch", "LIVE-STOCK"),
        expiry: asString(meta, "expiry", stock.restock_eta?.slice(0, 10) ?? "No expiry set"),
        lastMovement: movement ? `${movement.movement_type} ${movement.quantity_delta} (${movement.reason ?? "live stock event"})` : "No movement recorded yet",
      },
    ];
  });

  const orders = ((ordersResult.data ?? []) as unknown as OrderRow[]).map((order) => {
    const buyer = first(order.buyer);
    const address = asObject(order.delivery_address);
    const metadata = asObject(order.metadata);

    return {
      id: order.order_number,
      dbId: order.id,
      customer: buyer?.full_name ?? "Buyer",
      phone: buyer?.phone ?? buyer?.email ?? "Contact in profile",
      address: [asString(address, "line1"), asString(address, "locality"), asString(address, "city")].filter(Boolean).join(", ") || "Delivery address on order",
      status: orderStatus(order.status),
      promisedInMinutes: asNumber(metadata, "promisedInMinutes", 30),
      createdAt: order.created_at,
      paymentMode: order.payment_reference?.startsWith("cod") ? "COD" : order.payment_reference?.startsWith("card") ? "Card" : "UPI",
      subtotal: money(order.subtotal_amount),
      deliveryFee: money(order.delivery_fee_amount),
      notes: asString(metadata, "note", "No seller note"),
      items: (order.items ?? []).map((item) => ({
        sku: item.variant_id ?? item.product_id,
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: money(item.unit_price),
        picked: item.fulfillment_status !== "PENDING",
      })),
      timeline: [
        { label: "Order received", time: order.created_at, state: "done" },
        { label: order.status, time: "Live", state: "current" },
        { label: "Next fulfillment step", time: "Queued", state: "next" },
      ],
    } satisfies SellerOrder;
  });

  const notifications = ((notificationsResult.data ?? []) as Tables<"notifications">[]).map((notification) => ({
    id: notification.id,
    type: notification.type === "INVENTORY_ALERT" ? "inventory" : notification.type === "ADMIN_ALERT" ? "admin" : notification.type === "ORDER_UPDATE" ? "order" : "payout",
    title: notification.title,
    detail: notification.body,
    time: notification.created_at,
    read: Boolean(notification.read_at),
  } satisfies SellerNotification));

  const activeOrders = orders.filter((order) => !["delivered", "cancelled", "refunded"].includes(order.status));
  const lowStock = inventory.filter((item) => item.stock - item.reserved <= item.lowStockThreshold);
  const gross = ((payoutsResult.data ?? []) as Array<{ gross_amount: number | string }>).reduce((sum, row) => sum + money(row.gross_amount), 0);
  const cancellations = orders.length ? Math.round((orders.filter((order) => order.status === "cancelled").length / orders.length) * 1000) / 10 : 0;
  const delivered = orders.filter((order) => order.status === "delivered").length;
  const fulfillmentRate = orders.length ? Math.round((delivered / orders.length) * 100) : 0;

  const metrics: SellerMetric[] = [
    { label: "Orders today", value: String(orders.length), helper: `${activeOrders.length} need action`, tone: activeOrders.length ? "warning" : "success", icon: ClipboardList },
    { label: "Pending fulfillment", value: String(activeOrders.length), helper: "Live order queue", tone: activeOrders.length ? "warning" : "success", icon: PackageCheck },
    { label: "Low stock products", value: String(lowStock.length), helper: "Database stock thresholds", tone: lowStock.length ? "warning" : "success", icon: Boxes },
    { label: "Revenue tracked", value: `Rs ${gross.toLocaleString("en-IN")}`, helper: "From payout attributions", tone: "neutral", icon: IndianRupee },
    { label: "Cancellation rate", value: `${cancellations}%`, helper: "From live orders", tone: cancellations > 5 ? "danger" : "success", icon: RotateCcw },
    { label: "Fulfillment rate", value: `${fulfillmentRate}%`, helper: "Delivered against live order count", tone: "success", icon: Truck },
  ];

  const categoryCounts = new Map<string, number>();
  for (const product of products) categoryCounts.set(product.category, (categoryCounts.get(product.category) ?? 0) + 1);

  const snapshot = {
    vendor,
    metrics,
    products,
    inventory,
    orders,
    notifications,
    trustSignals: [
      { label: "Verification", value: vendor.status === "ACTIVE" ? "Store profile verified" : "Verification pending", icon: BadgeCheck },
      { label: "Fulfillment health", value: `${fulfillmentRate}% delivered`, icon: Truck },
      { label: "Operating state", value: vendor.status, icon: PackageCheck },
    ],
    analytics: {
      sales: orders.slice(0, 12).map((order) => order.subtotal + order.deliveryFee).reverse(),
      orders: orders.slice(0, 7).map((order) => order.items.length).reverse(),
      category: [...categoryCounts.entries()].map(([label, value]) => ({ label, value: `${value} products` })),
    },
  };

  const intelligence = buildMerchantIntelligence({
    vendor,
    products,
    inventory,
    orders,
    generatedInMs: Date.now() - startedAt,
    snapshotSource: "generated",
    refreshReasons: ["seller_dashboard_snapshot", "tenant_scoped_operational_data"],
  });

  await persistMerchantIntelligenceSnapshot(vendor, products, intelligence, Date.now() - startedAt);

  return {
    ...snapshot,
    intelligence,
  };
}
