import type { ProductEngine } from "./engine";
import type { ProductLifecycleStatus } from "./types";

export interface ProductIntelligenceHook {
  key: string;
  label: string;
  granularity: "PRODUCT" | "VARIANT" | "BRAND" | "DEPARTMENT" | "REGION";
  consumes: string[];
}

/** Declarative product-intelligence hooks (Phase 10). No analysis performed here. */
export const PRODUCT_INTELLIGENCE_HOOKS: ProductIntelligenceHook[] = [
  { key: "demand_forecasting", label: "Demand Forecasting", granularity: "PRODUCT", consumes: ["orders", "search"] },
  { key: "inventory_forecasting", label: "Inventory Forecasting", granularity: "VARIANT", consumes: ["inventory", "orders"] },
  { key: "price_optimization", label: "Price Optimization", granularity: "VARIANT", consumes: ["orders", "competitor_price"] },
  { key: "risk_analysis", label: "Risk Analysis", granularity: "PRODUCT", consumes: ["governance", "quality"] },
  { key: "regional_demand", label: "Regional Demand", granularity: "REGION", consumes: ["orders", "regions"] },
  { key: "hyperlocal_demand", label: "Hyperlocal Demand", granularity: "REGION", consumes: ["seller_inventory", "geo"] },
  { key: "category_analysis", label: "Category Analysis", granularity: "DEPARTMENT", consumes: ["catalog", "orders"] },
  { key: "brand_analysis", label: "Brand Analysis", granularity: "BRAND", consumes: ["catalog", "orders"] },
  { key: "product_analysis", label: "Product Analysis", granularity: "PRODUCT", consumes: ["catalog", "reviews"] },
];

export interface ProductIntelligenceProjection {
  hooks: ProductIntelligenceHook[];
  totalProducts: number;
  totalVariants: number;
  byDepartment: Record<string, number>;
  byBrand: Record<string, number>;
  byLifecycle: Record<ProductLifecycleStatus, number>;
  averageVariantsPerProduct: number;
}

/** Builds deterministic aggregation buckets for analytics/intelligence consumers. */
export function buildProductIntelligenceProjection(engine: ProductEngine): ProductIntelligenceProjection {
  const byDepartment: Record<string, number> = {};
  const byBrand: Record<string, number> = {};
  const byLifecycle = { PLANNED: 0, ACTIVE: 0, DISCONTINUED: 0, END_OF_LIFE: 0 } as Record<ProductLifecycleStatus, number>;
  let variants = 0;
  for (const product of engine.products()) {
    byDepartment[product.departmentId] = (byDepartment[product.departmentId] ?? 0) + 1;
    if (product.brandId) byBrand[product.brandId] = (byBrand[product.brandId] ?? 0) + 1;
    byLifecycle[product.lifecycleStatus] += 1;
    variants += product.variants.length;
  }
  const totalProducts = engine.productCount;
  return {
    hooks: PRODUCT_INTELLIGENCE_HOOKS,
    totalProducts,
    totalVariants: variants,
    byDepartment,
    byBrand,
    byLifecycle,
    averageVariantsPerProduct: totalProducts ? Number((variants / totalProducts).toFixed(2)) : 0,
  };
}
