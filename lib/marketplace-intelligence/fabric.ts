// MCP-0E.2 — Live Marketplace Data Fabric.
//
// buildMarketplaceFabric() normalizes raw marketplace activity (products,
// inventory, orders, reviews, returns, refunds, disputes, tickets, behaviour)
// into a single indexed snapshot that every intelligence engine consumes.
// Pure + deterministic so it runs identically on live and sample data.

import type {
  CategoryFacts,
  FabricProductInput,
  MarketplaceActivityInput,
  MarketplaceFabric,
  MarketplaceTotals,
  ProductFacts,
  StoreFacts,
} from "./types";
import type { SellerOrder } from "@/features/seller/types";

/** Cost is not stored on products; assume cost = 60% of MRP for margin math. */
export const ASSUMED_COST_RATIO = 0.6;
const DAY_MS = 86_400_000;

function round(value: number, dp = 0) {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

function clampPct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseTime(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : fallback;
}

function isCancelled(status: string) {
  return status === "cancelled" || status === "refunded";
}

const OPEN_RETURN = new Set(["requested", "approved", "in_transit", "received"]);
const OPEN_REFUND = new Set(["requested", "approved", "processing"]);
const OPEN_DISPUTE = new Set(["open", "evidence", "arbitration"]);
const OPEN_TICKET = new Set(["open", "in_progress", "waiting"]);

function productCost(price: number, mrp: number) {
  const base = mrp > 0 ? mrp : price;
  return base * ASSUMED_COST_RATIO;
}

/** Attribute each order to a single seller via its first resolvable line item. */
function indexOrderSellers(orders: SellerOrder[], productBySku: Map<string, FabricProductInput>, productById: Map<string, FabricProductInput>) {
  const orderSeller = new Map<string, string>();
  for (const order of orders) {
    for (const item of order.items) {
      const product = productBySku.get(item.sku) ?? productById.get(item.sku);
      if (product) {
        orderSeller.set(order.dbId ?? order.id, product.sellerId);
        break;
      }
    }
  }
  return orderSeller;
}

export function buildMarketplaceFabric(input: MarketplaceActivityInput): MarketplaceFabric {
  const now = parseTime(input.generatedAt, Date.now());

  const productBySku = new Map<string, FabricProductInput>();
  const productById = new Map<string, FabricProductInput>();
  for (const product of input.products) {
    productBySku.set(product.sku, product);
    productById.set(product.id, product);
  }

  // Window: span between earliest order and now, clamped to [1, 90] days.
  const orderTimes = input.orders.map((o) => parseTime(o.createdAt, now));
  const earliest = orderTimes.length ? Math.min(...orderTimes) : now;
  const windowDays = Math.max(1, Math.min(90, Math.ceil((now - earliest) / DAY_MS) || 1));

  // ── Per-product sales aggregation from orders ──
  type Agg = { units: number; revenue: number };
  const salesByProductId = new Map<string, Agg>();
  const salesBySku = new Map<string, Agg>();
  for (const order of input.orders) {
    if (isCancelled(order.status)) continue;
    for (const item of order.items) {
      const product = productBySku.get(item.sku) ?? productById.get(item.sku);
      const revenue = item.quantity * item.unitPrice;
      if (product) {
        const agg = salesByProductId.get(product.id) ?? { units: 0, revenue: 0 };
        agg.units += item.quantity;
        agg.revenue += revenue;
        salesByProductId.set(product.id, agg);
      }
      const skuAgg = salesBySku.get(item.sku) ?? { units: 0, revenue: 0 };
      skuAgg.units += item.quantity;
      skuAgg.revenue += revenue;
      salesBySku.set(item.sku, skuAgg);
    }
  }

  // Behaviour (views / purchases) per product.
  const viewsByProduct = new Map<string, number>();
  const purchasesByProduct = new Map<string, number>();
  for (const event of input.behavior ?? []) {
    if (event.type === "view") viewsByProduct.set(event.productId, (viewsByProduct.get(event.productId) ?? 0) + 1);
    if (event.type === "purchase") purchasesByProduct.set(event.productId, (purchasesByProduct.get(event.productId) ?? 0) + 1);
  }

  // Reviews per product.
  const reviewsByProduct = new Map<string, { sum: number; count: number }>();
  for (const review of input.reviews) {
    if (review.moderationStatus !== "VISIBLE") continue;
    const r = reviewsByProduct.get(review.productId) ?? { sum: 0, count: 0 };
    r.sum += review.rating;
    r.count += 1;
    reviewsByProduct.set(review.productId, r);
  }

  // Store-level aggregates that feed product return-rate proxy.
  const orderSeller = indexOrderSellers(input.orders, productBySku, productById);
  const ordersBySeller = new Map<string, { total: number; cancelled: number; revenue: number }>();
  for (const order of input.orders) {
    const sellerId = orderSeller.get(order.dbId ?? order.id);
    if (!sellerId) continue;
    const agg = ordersBySeller.get(sellerId) ?? { total: 0, cancelled: 0, revenue: 0 };
    agg.total += 1;
    if (isCancelled(order.status)) agg.cancelled += 1;
    else agg.revenue += order.subtotal + order.deliveryFee;
    ordersBySeller.set(sellerId, agg);
  }
  const returnsBySeller = new Map<string, number>();
  for (const ret of input.returns) returnsBySeller.set(ret.sellerId, (returnsBySeller.get(ret.sellerId) ?? 0) + 1);
  const refundsBySeller = new Map<string, number>();
  for (const refund of input.refunds) refundsBySeller.set(refund.sellerId, (refundsBySeller.get(refund.sellerId) ?? 0) + 1);
  const disputesBySeller = new Map<string, number>();
  for (const dispute of input.disputes) {
    const sellerId = orderSeller.get(dispute.orderId);
    if (sellerId) disputesBySeller.set(sellerId, (disputesBySeller.get(sellerId) ?? 0) + 1);
  }

  function sellerReturnRate(sellerId: string) {
    const orders = ordersBySeller.get(sellerId)?.total ?? 0;
    const returns = returnsBySeller.get(sellerId) ?? 0;
    return orders ? round((returns / orders) * 100, 1) : 0;
  }

  // ── ProductFacts ──
  const products: ProductFacts[] = input.products.map((product) => {
    const sales = salesByProductId.get(product.id) ?? salesBySku.get(product.sku) ?? { units: 0, revenue: 0 };
    const available = Math.max(0, product.stock - product.reserved);
    const velocityPerDay = round(sales.units / windowDays, 2);
    const daysOfCover = velocityPerDay > 0 ? round(available / velocityPerDay, 1) : null;
    const reviews = reviewsByProduct.get(product.id) ?? { sum: 0, count: 0 };
    const views = viewsByProduct.get(product.id) ?? 0;
    const purchases = purchasesByProduct.get(product.id) ?? sales.units;
    const cost = productCost(product.price, product.mrp);
    const marginPct = product.price > 0 ? round(((product.price - cost) / product.price) * 100) : 0;
    const discountPct = product.mrp > product.price && product.mrp > 0 ? round(((product.mrp - product.price) / product.mrp) * 100) : 0;

    return {
      productId: product.id,
      name: product.name,
      category: product.category,
      sellerId: product.sellerId,
      sellerName: product.sellerName ?? product.sellerId,
      price: product.price,
      mrp: product.mrp,
      marginPct,
      discountPct,
      available,
      reserved: product.reserved,
      lowStockThreshold: product.lowStockThreshold,
      unitsSold: sales.units,
      revenue: round(sales.revenue),
      velocityPerDay,
      daysOfCover,
      views,
      conversionPct: views > 0 ? clampPct((purchases / views) * 100) : 0,
      rating: reviews.count ? round(reviews.sum / reviews.count, 1) : 0,
      reviewCount: reviews.count,
      returnRate: sellerReturnRate(product.sellerId),
      status: product.status,
      windowDays,
    } satisfies ProductFacts;
  });

  // ── CategoryFacts ──
  const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
  const byCategory = new Map<string, ProductFacts[]>();
  for (const product of products) {
    const list = byCategory.get(product.category) ?? [];
    list.push(product);
    byCategory.set(product.category, list);
  }
  const categories: CategoryFacts[] = [...byCategory.entries()]
    .map(([category, list]) => {
      const revenue = list.reduce((s, p) => s + p.revenue, 0);
      const unitsSold = list.reduce((s, p) => s + p.unitsSold, 0);
      const ratings = list.filter((p) => p.reviewCount > 0);
      return {
        category,
        products: list.length,
        unitsSold,
        revenue: round(revenue),
        velocityPerDay: round(list.reduce((s, p) => s + p.velocityPerDay, 0), 2),
        avgPrice: list.length ? round(list.reduce((s, p) => s + p.price, 0) / list.length) : 0,
        avgRating: ratings.length ? round(ratings.reduce((s, p) => s + p.rating, 0) / ratings.length, 1) : 0,
        outOfStock: list.filter((p) => p.available <= 0).length,
        share: totalRevenue > 0 ? round((revenue / totalRevenue) * 100, 1) : 0,
      } satisfies CategoryFacts;
    })
    .sort((a, b) => b.revenue - a.revenue);

  // ── StoreFacts ──
  const productsBySeller = new Map<string, ProductFacts[]>();
  for (const product of products) {
    const list = productsBySeller.get(product.sellerId) ?? [];
    list.push(product);
    productsBySeller.set(product.sellerId, list);
  }
  const reviewsBySeller = new Map<string, { sum: number; count: number }>();
  for (const review of input.reviews) {
    if (review.moderationStatus !== "VISIBLE") continue;
    const r = reviewsBySeller.get(review.sellerId) ?? { sum: 0, count: 0 };
    r.sum += review.rating;
    r.count += 1;
    reviewsBySeller.set(review.sellerId, r);
  }
  const stores: StoreFacts[] = input.sellers.map((seller) => {
    const list = productsBySeller.get(seller.sellerId) ?? [];
    const orderAgg = ordersBySeller.get(seller.sellerId) ?? { total: 0, cancelled: 0, revenue: 0 };
    const reviews = reviewsBySeller.get(seller.sellerId) ?? { sum: 0, count: 0 };
    return {
      sellerId: seller.sellerId,
      name: seller.name,
      verified: seller.verified,
      products: list.length,
      unitsSold: list.reduce((s, p) => s + p.unitsSold, 0),
      revenue: round(orderAgg.revenue),
      orders: orderAgg.total,
      cancellations: orderAgg.cancelled,
      cancellationRate: orderAgg.total ? round((orderAgg.cancelled / orderAgg.total) * 100, 1) : 0,
      returnRate: sellerReturnRate(seller.sellerId),
      refundRate: orderAgg.total ? round(((refundsBySeller.get(seller.sellerId) ?? 0) / orderAgg.total) * 100, 1) : 0,
      disputes: disputesBySeller.get(seller.sellerId) ?? 0,
      avgRating: reviews.count ? round(reviews.sum / reviews.count, 1) : 0,
      responseMinutes: seller.responseMinutes,
    } satisfies StoreFacts;
  });

  // ── Totals ──
  const nonCancelled = input.orders.filter((o) => !isCancelled(o.status));
  const gmv = round(nonCancelled.reduce((s, o) => s + o.subtotal + o.deliveryFee, 0));
  const totals: MarketplaceTotals = {
    gmv,
    orders: input.orders.length,
    averageOrderValue: nonCancelled.length ? round(gmv / nonCancelled.length) : 0,
    unitsSold: products.reduce((s, p) => s + p.unitsSold, 0),
    activeProducts: products.filter((p) => p.status === "published").length,
    totalProducts: products.length,
    sellers: input.sellers.length,
    verifiedSellers: input.sellers.filter((s) => s.verified).length,
    categories: categories.length,
    outOfStock: products.filter((p) => p.available <= 0).length,
    reviews: input.reviews.length,
    flaggedReviews: input.reviews.filter((r) => r.moderationStatus !== "VISIBLE").length,
    openReturns: input.returns.filter((r) => OPEN_RETURN.has(r.status)).length,
    openRefunds: input.refunds.filter((r) => OPEN_REFUND.has(r.status)).length,
    openDisputes: input.disputes.filter((d) => OPEN_DISPUTE.has(d.state)).length,
    openTickets: input.tickets.filter((t) => OPEN_TICKET.has(t.status)).length,
    windowDays,
  };

  return {
    generatedAt: new Date(now).toISOString(),
    windowDays,
    products,
    categories,
    stores,
    totals,
    hasActivity: products.length > 0 || input.orders.length > 0,
  };
}
