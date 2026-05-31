import type { BrandEngine } from "./engine";

export interface BrandIntelligenceHook {
  key: string;
  label: string;
  granularity: "BRAND" | "COMPANY" | "DEPARTMENT" | "REGION";
  consumes: string[];
}

/**
 * Declarative brand-intelligence hooks (Phase 8). The brand universe exposes the aggregation
 * surfaces future intelligence systems attach to. No analysis is performed here.
 */
export const BRAND_INTELLIGENCE_HOOKS: BrandIntelligenceHook[] = [
  { key: "brand_demand", label: "Brand Demand", granularity: "BRAND", consumes: ["orders", "search"] },
  { key: "brand_growth", label: "Brand Growth", granularity: "BRAND", consumes: ["orders", "catalog"] },
  { key: "brand_share", label: "Brand Share", granularity: "DEPARTMENT", consumes: ["orders"] },
  { key: "brand_risk", label: "Brand Risk", granularity: "BRAND", consumes: ["governance", "moderation"] },
  { key: "regional_brand", label: "Regional Brand Analysis", granularity: "REGION", consumes: ["orders", "regions"] },
  { key: "emerging_brand", label: "Emerging Brand Detection", granularity: "BRAND", consumes: ["catalog", "search"] },
  { key: "hyperlocal_brand", label: "Hyperlocal Brand Analysis", granularity: "REGION", consumes: ["seller_inventory", "geo"] },
  { key: "market_penetration", label: "Market Penetration", granularity: "COMPANY", consumes: ["orders", "catalog"] },
];

export interface BrandIntelligenceProjection {
  hooks: BrandIntelligenceHook[];
  totalBrands: number;
  totalCompanies: number;
  byIndustry: Record<string, number>;
  byRegion: Record<string, number>;
  byDepartment: Record<string, number>;
  localVsNational: { local: number; national: number };
  topCompaniesByBrandCount: { companyId: string; name: string; brandCount: number }[];
}

/** Builds deterministic aggregation buckets and company rollups for analytics/intelligence. */
export function buildBrandIntelligenceProjection(engine: BrandEngine): BrandIntelligenceProjection {
  const stats = engine.stats();
  const byDepartment: Record<string, number> = {};
  let local = 0;
  for (const brand of engine.brands()) {
    for (const department of brand.departments) {
      byDepartment[department] = (byDepartment[department] ?? 0) + 1;
    }
    if (brand.isLocalBrand) local += 1;
  }

  const topCompaniesByBrandCount = engine
    .companies()
    .map((company) => ({ companyId: company.id, name: company.name, brandCount: engine.getBrandsByCompany(company.id).length }))
    .filter((entry) => entry.brandCount > 0)
    .sort((a, b) => (b.brandCount - a.brandCount) || (a.companyId < b.companyId ? -1 : 1))
    .slice(0, 10);

  return {
    hooks: BRAND_INTELLIGENCE_HOOKS,
    totalBrands: stats.brands,
    totalCompanies: stats.companies,
    byIndustry: stats.byIndustry,
    byRegion: stats.byRegion,
    byDepartment,
    localVsNational: { local, national: stats.brands - local },
    topCompaniesByBrandCount,
  };
}
