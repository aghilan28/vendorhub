import type { BrandEngine } from "./engine";

export interface BrandAffinityEdge {
  source: string;
  target: string;
  relation: "same_company" | "substitute" | "cross_sell";
  weight: number;
}

export interface BrandGroup {
  key: string;
  kind: "company" | "industry";
  members: string[];
}

export interface BrandAffinityGraph {
  edges: BrandAffinityEdge[];
  groups: BrandGroup[];
}

/**
 * Recommendation-readiness projection (Phase 7). Emits affinity edges and brand groups that a
 * recommendation engine can consume. It does not compute recommendations.
 *
 * - same_company: brands sharing an owning company (cross-sell within a portfolio).
 * - substitute: brands sharing a primary department but owned by different companies (competitors).
 * - cross_sell: complementary structural hook (left for behavioural data to weight).
 */
export function buildBrandAffinityGraph(engine: BrandEngine): BrandAffinityGraph {
  const edges: BrandAffinityEdge[] = [];
  const groups: BrandGroup[] = [];

  // Same-company groups + affinity edges.
  for (const company of engine.companies()) {
    const members = engine.getBrandsByCompany(company.id).map((brand) => brand.id);
    if (members.length > 1) {
      groups.push({ key: company.id, kind: "company", members });
      for (let i = 0; i < members.length; i += 1) {
        for (let j = i + 1; j < members.length; j += 1) {
          edges.push({ source: members[i], target: members[j], relation: "same_company", weight: 0.7 });
        }
      }
    }
  }

  // Substitution edges within a primary department across different companies.
  const byDepartment = new Map<string, string[]>();
  for (const brand of engine.brands()) {
    const primary = brand.departments[0];
    if (!primary) continue;
    const bucket = byDepartment.get(primary) ?? [];
    bucket.push(brand.id);
    byDepartment.set(primary, bucket);
  }
  for (const [department, brandIds] of byDepartment) {
    if (brandIds.length > 1) groups.push({ key: department, kind: "industry", members: brandIds });
    for (let i = 0; i < brandIds.length; i += 1) {
      for (let j = i + 1; j < brandIds.length; j += 1) {
        const a = engine.getBrand(brandIds[i]);
        const b = engine.getBrand(brandIds[j]);
        if (a && b && a.companyId !== b.companyId) {
          edges.push({ source: a.id, target: b.id, relation: "substitute", weight: 0.5 });
        }
      }
    }
  }

  return { edges, groups };
}

/**
 * Deterministic brand similarity in [0,1] combining shared ownership, shared departments and
 * shared industry. A cold-start similarity prior before behavioural signals exist.
 */
export function brandSimilarity(engine: BrandEngine, idA: string, idB: string): number {
  const a = engine.getBrand(idA);
  const b = engine.getBrand(idB);
  if (!a || !b) return 0;
  if (a.id === b.id) return 1;

  const sameCompany = a.companyId && a.companyId === b.companyId ? 1 : 0;
  const sameIndustry = a.industry === b.industry ? 1 : 0;
  const setA = new Set(a.departments);
  const setB = new Set(b.departments);
  const union = new Set([...a.departments, ...b.departments]);
  let intersection = 0;
  for (const value of setA) if (setB.has(value)) intersection += 1;
  const deptJaccard = union.size ? intersection / union.size : 0;

  return Number((sameCompany * 0.5 + deptJaccard * 0.3 + sameIndustry * 0.2).toFixed(4));
}
