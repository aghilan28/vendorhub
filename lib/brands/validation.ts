import { slugify, type TaxonomyEngine } from "@/lib/taxonomy";
import type { Brand, BrandValidationIssue, BrandValidationReport, Company } from "./types";

export interface BrandValidationOptions {
  /** When provided, brand department/category slugs are validated against the PP-1 taxonomy. */
  taxonomy?: TaxonomyEngine;
}

/**
 * Deterministic brand-universe validator (Phase 10). Detects duplicate brands/slugs, broken or
 * circular ownership, orphan companies, invalid taxonomy mappings, alias conflicts and
 * unclassified brands. Pure: identical input yields identical output.
 */
export function validateBrandUniverse(
  brands: Brand[],
  companies: Company[],
  options: BrandValidationOptions = {},
): BrandValidationReport {
  const issues: BrandValidationIssue[] = [];

  const companyById = new Map<string, Company>();
  const brandIdCounts = new Map<string, number>();
  const brandSlugOwners = new Map<string, string[]>();
  const companySlugOwners = new Map<string, string[]>();

  for (const company of companies) {
    companyById.set(company.id, company);
    companySlugOwners.set(company.slug, [...(companySlugOwners.get(company.slug) ?? []), company.id]);
  }
  for (const brand of brands) {
    brandIdCounts.set(brand.id, (brandIdCounts.get(brand.id) ?? 0) + 1);
    brandSlugOwners.set(brand.slug, [...(brandSlugOwners.get(brand.slug) ?? []), brand.id]);
  }

  for (const [id, count] of brandIdCounts) {
    if (count > 1) issues.push({ code: "DUPLICATE_BRAND_ID", severity: "error", entityId: id, message: `Brand id "${id}" used ${count} times.`, detail: { count } });
  }
  for (const [slug, owners] of brandSlugOwners) {
    if (owners.length > 1) issues.push({ code: "DUPLICATE_BRAND_SLUG", severity: "error", entityId: owners[0], message: `Brand slug "${slug}" shared by ${owners.length} brands.`, detail: { slug, owners } });
  }
  for (const [slug, owners] of companySlugOwners) {
    if (owners.length > 1) issues.push({ code: "DUPLICATE_COMPANY_SLUG", severity: "error", entityId: owners[0], message: `Company slug "${slug}" shared by ${owners.length} companies.`, detail: { slug, owners } });
  }

  // Ownership integrity (brand -> company, company -> parent company).
  for (const brand of brands) {
    if (brand.companyId && !companyById.has(brand.companyId)) {
      issues.push({ code: "BROKEN_OWNERSHIP", severity: "error", entityId: brand.id, message: `Brand "${brand.id}" references missing company "${brand.companyId}".`, detail: { companyId: brand.companyId } });
    }
    if (brand.departments.length === 0 && brand.categories.length === 0) {
      issues.push({ code: "UNCLASSIFIED_BRAND", severity: "error", entityId: brand.id, message: `Brand "${brand.id}" is not mapped to any taxonomy node.` });
    }
    if (options.taxonomy) {
      for (const slug of brand.departments) {
        const node = options.taxonomy.getBySlug(slug) ?? options.taxonomy.getNode(slug);
        if (!node || node.level !== "DEPARTMENT") {
          issues.push({ code: "INVALID_TAXONOMY_MAPPING", severity: "error", entityId: brand.id, message: `Brand "${brand.id}" maps to unknown department "${slug}".`, detail: { slug } });
        }
      }
      for (const slug of brand.categories) {
        const node = options.taxonomy.getBySlug(slug) ?? options.taxonomy.getNode(slug);
        if (!node || node.level !== "CATEGORY") {
          issues.push({ code: "INVALID_TAXONOMY_MAPPING", severity: "error", entityId: brand.id, message: `Brand "${brand.id}" maps to unknown category "${slug}".`, detail: { slug } });
        }
      }
    }
  }

  for (const company of companies) {
    if (company.parentCompanyId && !companyById.has(company.parentCompanyId)) {
      issues.push({ code: "BROKEN_OWNERSHIP", severity: "error", entityId: company.id, message: `Company "${company.id}" references missing parent "${company.parentCompanyId}".`, detail: { parentCompanyId: company.parentCompanyId } });
    }
  }

  // Orphan companies: no brands and no subsidiaries.
  const companiesWithBrands = new Set(brands.map((brand) => brand.companyId).filter(Boolean) as string[]);
  const parents = new Set(companies.map((company) => company.parentCompanyId).filter(Boolean) as string[]);
  for (const company of companies) {
    if (!companiesWithBrands.has(company.id) && !parents.has(company.id)) {
      issues.push({ code: "ORPHAN_COMPANY", severity: "warning", entityId: company.id, message: `Company "${company.id}" owns no brands and has no subsidiaries.` });
    }
  }

  // Circular ownership in the company hierarchy.
  for (const company of companies) {
    const seen = new Set<string>();
    let current: Company | undefined = company;
    while (current && current.parentCompanyId) {
      if (seen.has(current.id)) {
        issues.push({ code: "CIRCULAR_OWNERSHIP", severity: "error", entityId: company.id, message: `Circular company ownership detected at "${company.id}".`, detail: { chain: Array.from(seen) } });
        break;
      }
      seen.add(current.id);
      const next: Company | undefined = companyById.get(current.parentCompanyId);
      if (!next) break;
      if (next.id === company.id) {
        issues.push({ code: "CIRCULAR_OWNERSHIP", severity: "error", entityId: company.id, message: `Circular company ownership detected at "${company.id}".`, detail: { chain: [...Array.from(seen), next.id] } });
        break;
      }
      current = next;
    }
  }

  // Alias conflicts: a normalized alias resolving to more than one distinct brand.
  const aliasOwners = new Map<string, Set<string>>();
  for (const brand of brands) {
    for (const alias of brand.aliases) {
      const normalized = slugify(alias);
      if (!normalized) continue;
      const owners = aliasOwners.get(normalized) ?? new Set<string>();
      owners.add(brand.id);
      aliasOwners.set(normalized, owners);
    }
  }
  for (const [alias, owners] of aliasOwners) {
    if (owners.size > 1) {
      issues.push({ code: "ALIAS_CONFLICT", severity: "warning", entityId: Array.from(owners)[0], message: `Alias "${alias}" maps to ${owners.size} brands.`, detail: { alias, owners: Array.from(owners) } });
    }
  }

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  return { valid: errorCount === 0, checkedBrands: brands.length, checkedCompanies: companies.length, errorCount, warningCount, issues };
}
