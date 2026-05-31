import type { CommerceRegion } from "@/types/commerce-foundation";
import type { TaxonomyEngine } from "./engine";
import type { TaxonomyNodeLevel } from "./types";

export interface IntelligenceHook {
  key: string;
  label: string;
  /** Taxonomy granularity at which this analysis aggregates. */
  granularity: TaxonomyNodeLevel | "REGION";
  consumes: string[];
}

/**
 * Declarative hooks (Phase 7). The taxonomy exposes the aggregation surfaces that future
 * intelligence subsystems attach to. No analysis is performed here — only the structures/hooks.
 */
export const TAXONOMY_INTELLIGENCE_HOOKS: IntelligenceHook[] = [
  { key: "demand_forecasting", label: "Demand Forecasting", granularity: "PRODUCT_FAMILY", consumes: ["orders", "search_tokens"] },
  { key: "inventory_forecasting", label: "Inventory Forecasting", granularity: "PRODUCT_TYPE", consumes: ["seller_inventory", "orders"] },
  { key: "risk_analysis", label: "Risk Analysis", granularity: "CATEGORY", consumes: ["governance", "moderation"] },
  { key: "category_growth", label: "Category Growth", granularity: "CATEGORY", consumes: ["orders", "catalog"] },
  { key: "regional_demand", label: "Regional Demand Analysis", granularity: "REGION", consumes: ["orders", "regions"] },
  { key: "hyperlocal_demand", label: "Hyperlocal Demand Analysis", granularity: "SUBCATEGORY", consumes: ["seller_inventory", "geo"] },
  { key: "expansion_analysis", label: "Expansion Analysis", granularity: "DEPARTMENT", consumes: ["catalog", "regions"] },
];

export interface DepartmentRollup {
  departmentId: string;
  name: string;
  categories: number;
  subcategories: number;
  productFamilies: number;
  productTypes: number;
  variantGroups: number;
  regions: CommerceRegion[];
}

export interface TaxonomyIntelligenceProjection {
  hooks: IntelligenceHook[];
  byLevel: Record<TaxonomyNodeLevel, number>;
  byRegion: Record<string, number>;
  departmentRollups: DepartmentRollup[];
}

/**
 * Builds the deterministic aggregation buckets and per-department rollups that intelligence /
 * analytics systems consume. Pure rollups over the taxonomy structure only.
 */
export function buildIntelligenceProjection(engine: TaxonomyEngine): TaxonomyIntelligenceProjection {
  const stats = engine.stats();
  const byRegion: Record<string, number> = {};
  for (const node of engine.nodes()) {
    for (const region of node.regions) {
      byRegion[region] = (byRegion[region] ?? 0) + 1;
    }
  }

  const departmentRollups: DepartmentRollup[] = engine.getDepartments().map((department) => {
    const descendants = engine.getDescendants(department.id);
    const regions = new Set<CommerceRegion>(department.regions);
    for (const descendant of descendants) for (const region of descendant.regions) regions.add(region);
    const countLevel = (level: TaxonomyNodeLevel) => descendants.filter((node) => node.level === level).length;
    return {
      departmentId: department.id,
      name: department.name,
      categories: countLevel("CATEGORY"),
      subcategories: countLevel("SUBCATEGORY"),
      productFamilies: countLevel("PRODUCT_FAMILY"),
      productTypes: countLevel("PRODUCT_TYPE"),
      variantGroups: countLevel("VARIANT_GROUP"),
      regions: Array.from(regions).sort(),
    };
  });

  return { hooks: TAXONOMY_INTELLIGENCE_HOOKS, byLevel: stats.byLevel, byRegion, departmentRollups };
}
