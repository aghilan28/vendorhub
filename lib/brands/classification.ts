import type { TaxonomyEngine, TaxonomyNode } from "@/lib/taxonomy";
import type { BrandEngine } from "./engine";
import type { Brand } from "./types";

export interface BrandClassificationIssue {
  brandId: string;
  slug: string;
  kind: "department" | "category";
}

/**
 * Maps brands onto the PP-1 taxonomy (Phase 4). Validates that every brand resolves to real
 * taxonomy nodes and provides bidirectional lookups. Consumes a PP-1 `TaxonomyEngine` — it does not
 * modify or duplicate the taxonomy.
 */
export class BrandClassification {
  private readonly brandsByDepartment = new Map<string, string[]>();
  private readonly brandsByCategory = new Map<string, string[]>();

  constructor(
    private readonly brands: BrandEngine,
    private readonly taxonomy: TaxonomyEngine,
  ) {
    for (const brand of this.brands.brands()) {
      for (const dept of brand.departments) {
        const bucket = this.brandsByDepartment.get(dept) ?? [];
        bucket.push(brand.id);
        this.brandsByDepartment.set(dept, bucket);
      }
      for (const category of brand.categories) {
        const bucket = this.brandsByCategory.get(category) ?? [];
        bucket.push(brand.id);
        this.brandsByCategory.set(category, bucket);
      }
    }
  }

  private resolveNode(slug: string): TaxonomyNode | undefined {
    return this.taxonomy.getBySlug(slug) ?? this.taxonomy.getNode(slug);
  }

  getDepartmentsForBrand(brandId: string): TaxonomyNode[] {
    const brand = this.brands.getBrand(brandId);
    if (!brand) return [];
    return brand.departments
      .map((slug) => this.resolveNode(slug))
      .filter((node): node is TaxonomyNode => Boolean(node));
  }

  getCategoriesForBrand(brandId: string): TaxonomyNode[] {
    const brand = this.brands.getBrand(brandId);
    if (!brand) return [];
    return brand.categories
      .map((slug) => this.resolveNode(slug))
      .filter((node): node is TaxonomyNode => Boolean(node));
  }

  getBrandsForDepartment(departmentSlug: string): Brand[] {
    return (this.brandsByDepartment.get(departmentSlug) ?? []).map((id) => this.brands.getBrand(id) as Brand);
  }

  getBrandsForCategory(categorySlug: string): Brand[] {
    return (this.brandsByCategory.get(categorySlug) ?? []).map((id) => this.brands.getBrand(id) as Brand);
  }

  /** Brands that declare no department/category at all. */
  unclassifiedBrands(): Brand[] {
    return this.brands.brands().filter((brand) => brand.departments.length === 0 && brand.categories.length === 0);
  }

  /** Mappings whose slug does not resolve to a real taxonomy node. */
  invalidMappings(): BrandClassificationIssue[] {
    const issues: BrandClassificationIssue[] = [];
    for (const brand of this.brands.brands()) {
      for (const slug of brand.departments) {
        const node = this.resolveNode(slug);
        if (!node || node.level !== "DEPARTMENT") issues.push({ brandId: brand.id, slug, kind: "department" });
      }
      for (const slug of brand.categories) {
        const node = this.resolveNode(slug);
        if (!node || node.level !== "CATEGORY") issues.push({ brandId: brand.id, slug, kind: "category" });
      }
    }
    return issues;
  }

  coverage(): { totalBrands: number; classifiedBrands: number; departmentsCovered: number; categoriesCovered: number } {
    const total = this.brands.brandCount;
    const classified = total - this.unclassifiedBrands().length;
    return {
      totalBrands: total,
      classifiedBrands: classified,
      departmentsCovered: this.brandsByDepartment.size,
      categoriesCovered: this.brandsByCategory.size,
    };
  }
}
