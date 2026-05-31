// MCP-1A Phase 9 — Marketplace Population Operations engine (deterministic, pure).
//
// Makes marketplace population measurable: the recruitment→activation funnel,
// operational KPIs, capacity progress toward the 100-seller / 10k-product
// targets, and category expansion tracking.

import type {
  MarketplacePopulationSnapshot,
  PopulationFunnel,
  PopulationKpis,
  Tone,
} from "./types";

export interface PopulationSellerInput {
  sellerId: string;
  registered: boolean;
  verified: boolean;
  products: number;
  publishedProducts: number;
  active: boolean;
  categories: string[];
  catalogQuality: number; // 0..100
}

export interface PopulationTargets {
  sellerTarget?: number; // default 100
  productTarget?: number; // default 10_000
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function tone(score: number): Tone {
  if (score >= 85) return "healthy";
  if (score >= 60) return "watch";
  if (score >= 35) return "degraded";
  return "critical";
}

export function buildPopulationSnapshot(sellers: PopulationSellerInput[], targets: PopulationTargets = {}): MarketplacePopulationSnapshot {
  const sellerTarget = targets.sellerTarget ?? 100;
  const productTarget = targets.productTarget ?? 10_000;

  const registered = sellers.filter((s) => s.registered).length;
  const verified = sellers.filter((s) => s.verified).length;
  const withCatalog = sellers.filter((s) => s.products > 0).length;
  const active = sellers.filter((s) => s.active).length;

  const funnel: PopulationFunnel = {
    registered,
    verified,
    withCatalog,
    active,
    registeredToVerified: pct(verified, registered),
    verifiedToCatalog: pct(withCatalog, verified),
    catalogToActive: pct(active, withCatalog),
  };

  const products = sellers.reduce((sum, s) => sum + s.products, 0);
  const publishedProducts = sellers.reduce((sum, s) => sum + s.publishedProducts, 0);
  const categories = new Set(sellers.flatMap((s) => s.categories));
  const qualitySellers = sellers.filter((s) => s.products > 0);
  const averageCatalogQuality = qualitySellers.length ? Math.round(qualitySellers.reduce((sum, s) => sum + s.catalogQuality, 0) / qualitySellers.length) : 0;

  const kpis: PopulationKpis = {
    sellers: sellers.length,
    activeSellers: active,
    products,
    publishedProducts,
    categoriesCovered: categories.size,
    averageProductsPerSeller: sellers.length ? Math.round(products / sellers.length) : 0,
    averageCatalogQuality,
    sellerActivationRate: pct(active, sellers.length),
    catalogFillRate: pct(publishedProducts, products),
  };

  // Category expansion tracking.
  const categoryMap = new Map<string, { products: number; sellers: Set<string> }>();
  for (const seller of sellers) {
    for (const category of seller.categories) {
      const entry = categoryMap.get(category) ?? { products: 0, sellers: new Set<string>() };
      entry.sellers.add(seller.sellerId);
      categoryMap.set(category, entry);
    }
  }
  // distribute product counts roughly across a seller's categories
  for (const seller of sellers) {
    const per = seller.categories.length ? seller.products / seller.categories.length : 0;
    for (const category of seller.categories) {
      const entry = categoryMap.get(category);
      if (entry) entry.products += per;
    }
  }
  const expansion = [...categoryMap.entries()]
    .map(([category, e]) => ({ category, products: Math.round(e.products), sellers: e.sellers.size, coverage: pct(e.sellers.size, sellers.length || 1) }))
    .sort((a, b) => b.products - a.products);

  const sellerProgress = Math.min(100, pct(active, sellerTarget));
  const productProgress = Math.min(100, pct(publishedProducts, productTarget));
  const overall = Math.round(funnel.catalogToActive * 0.4 + kpis.sellerActivationRate * 0.3 + kpis.catalogFillRate * 0.3);

  return {
    funnel,
    kpis,
    capacity: { sellerTarget, productTarget, sellerProgress, productProgress },
    tone: tone(overall),
    expansion,
  };
}
