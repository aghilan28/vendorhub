import { createDeterministicClock, slugify } from "@/lib/taxonomy";
import type {
  Brand,
  BrandIndustry,
  BrandInput,
  BrandStatus,
  BrandVerificationStatus,
  Clock,
  Company,
  CompanyInput,
} from "./types";

export interface BrandEngineOptions {
  clock?: Clock;
}

export function resolveCompanies(inputs: CompanyInput[], clock: Clock = createDeterministicClock()): Company[] {
  return inputs.map((input) => {
    const slug = input.slug ?? slugify(input.name);
    const now = clock();
    return {
      id: input.id ?? slug,
      name: input.name,
      slug,
      country: input.country ?? "IN",
      industry: input.industry ?? "OTHER",
      foundedYear: input.foundedYear ?? null,
      parentCompanyId: input.parentCompanyId ?? null,
      aliases: [...(input.aliases ?? [])],
      status: input.status ?? "ACTIVE",
      createdAt: now,
      updatedAt: now,
      metadata: { ...(input.metadata ?? {}) },
    };
  });
}

export function resolveBrands(inputs: BrandInput[], clock: Clock = createDeterministicClock()): Brand[] {
  return inputs.map((input) => {
    const slug = input.slug ?? slugify(input.name);
    const now = clock();
    const status = input.status ?? "ACTIVE";
    return {
      id: input.id ?? slug,
      name: input.name,
      slug,
      description: input.description ?? "",
      logoUrl: input.logoUrl ?? null,
      website: input.website ?? null,
      country: input.country ?? "IN",
      companyId: input.companyId ?? null,
      industry: input.industry ?? "OTHER",
      foundedYear: input.foundedYear ?? null,
      verificationStatus: input.verificationStatus ?? "UNVERIFIED",
      status,
      departments: [...(input.departments ?? [])],
      categories: [...(input.categories ?? [])],
      aliases: [...(input.aliases ?? [])],
      originRegion: input.originRegion ?? null,
      isLocalBrand: input.isLocalBrand ?? false,
      localizedNames: { ...(input.localizedNames ?? {}) },
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      mergedIntoId: null,
      metadata: { ...(input.metadata ?? {}) },
    };
  });
}

/** Indexed, read-optimized view over brands and their owning companies. */
export class BrandEngine {
  private readonly brandsById = new Map<string, Brand>();
  private readonly brandsBySlug = new Map<string, string>();
  private readonly companiesById = new Map<string, Company>();
  private readonly companiesBySlug = new Map<string, string>();
  private readonly brandsByCompany = new Map<string, string[]>();
  private readonly subsidiariesByParent = new Map<string, string[]>();
  private readonly brandsList: Brand[];
  private readonly companiesList: Company[];

  constructor(brands: Brand[], companies: Company[]) {
    this.brandsList = [...brands].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    this.companiesList = [...companies].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));

    for (const company of this.companiesList) {
      this.companiesById.set(company.id, company);
      this.companiesBySlug.set(company.slug, company.id);
    }
    for (const company of this.companiesList) {
      if (company.parentCompanyId) {
        const bucket = this.subsidiariesByParent.get(company.parentCompanyId) ?? [];
        bucket.push(company.id);
        this.subsidiariesByParent.set(company.parentCompanyId, bucket);
      }
    }
    for (const brand of this.brandsList) {
      this.brandsById.set(brand.id, brand);
      this.brandsBySlug.set(brand.slug, brand.id);
      if (brand.companyId) {
        const bucket = this.brandsByCompany.get(brand.companyId) ?? [];
        bucket.push(brand.id);
        this.brandsByCompany.set(brand.companyId, bucket);
      }
    }
  }

  static fromInputs(brands: BrandInput[], companies: CompanyInput[], options: BrandEngineOptions = {}): BrandEngine {
    const clock = options.clock ?? createDeterministicClock();
    return new BrandEngine(resolveBrands(brands, clock), resolveCompanies(companies, clock));
  }

  get brandCount(): number {
    return this.brandsList.length;
  }

  get companyCount(): number {
    return this.companiesList.length;
  }

  brands(): Brand[] {
    return [...this.brandsList];
  }

  companies(): Company[] {
    return [...this.companiesList];
  }

  getBrand(id: string): Brand | undefined {
    return this.brandsById.get(id);
  }

  getBrandBySlug(slug: string): Brand | undefined {
    const id = this.brandsBySlug.get(slug);
    return id ? this.brandsById.get(id) : undefined;
  }

  getCompany(id: string): Company | undefined {
    return this.companiesById.get(id);
  }

  getCompanyBySlug(slug: string): Company | undefined {
    const id = this.companiesBySlug.get(slug);
    return id ? this.companiesById.get(id) : undefined;
  }

  /** Brands directly owned by a company. */
  getBrandsByCompany(companyId: string): Brand[] {
    return (this.brandsByCompany.get(companyId) ?? []).map((id) => this.brandsById.get(id) as Brand);
  }

  getParentCompany(companyId: string): Company | undefined {
    const company = this.companiesById.get(companyId);
    if (!company || !company.parentCompanyId) return undefined;
    return this.companiesById.get(company.parentCompanyId);
  }

  /** Company-to-company ancestry chain (immediate parent first). */
  getCompanyAncestors(companyId: string): Company[] {
    const out: Company[] = [];
    const guard = new Set<string>();
    let current = this.companiesById.get(companyId);
    while (current && current.parentCompanyId && !guard.has(current.id)) {
      guard.add(current.id);
      const parent = this.companiesById.get(current.parentCompanyId);
      if (!parent) break;
      out.push(parent);
      current = parent;
    }
    return out;
  }

  getSubsidiaries(companyId: string): Company[] {
    return (this.subsidiariesByParent.get(companyId) ?? []).map((id) => this.companiesById.get(id) as Company);
  }

  /** Full ownership chain for a brand: owning company then its company ancestors. */
  getOwnershipChain(brandId: string): Company[] {
    const brand = this.brandsById.get(brandId);
    if (!brand || !brand.companyId) return [];
    const company = this.companiesById.get(brand.companyId);
    if (!company) return [];
    return [company, ...this.getCompanyAncestors(company.id)];
  }

  /** All brands ultimately owned by a company (direct + via subsidiary companies). */
  getAllBrandsUnderCompany(companyId: string): Brand[] {
    const out: Brand[] = [...this.getBrandsByCompany(companyId)];
    const queue = [...this.getSubsidiaries(companyId)];
    const guard = new Set<string>();
    while (queue.length) {
      const sub = queue.shift() as Company;
      if (guard.has(sub.id)) continue;
      guard.add(sub.id);
      out.push(...this.getBrandsByCompany(sub.id));
      queue.push(...this.getSubsidiaries(sub.id));
    }
    return out;
  }

  stats(): {
    brands: number;
    companies: number;
    byIndustry: Record<string, number>;
    byStatus: Record<BrandStatus, number>;
    byVerification: Record<BrandVerificationStatus, number>;
    byRegion: Record<string, number>;
    localBrands: number;
  } {
    const byIndustry: Record<string, number> = {};
    const byStatus = { DRAFT: 0, ACTIVE: 0, DEPRECATED: 0, ARCHIVED: 0, MERGED: 0 } as Record<BrandStatus, number>;
    const byVerification = { UNVERIFIED: 0, PENDING: 0, VERIFIED: 0, REJECTED: 0 } as Record<BrandVerificationStatus, number>;
    const byRegion: Record<string, number> = {};
    let localBrands = 0;
    for (const brand of this.brandsList) {
      byIndustry[brand.industry] = (byIndustry[brand.industry] ?? 0) + 1;
      byStatus[brand.status] += 1;
      byVerification[brand.verificationStatus] += 1;
      if (brand.originRegion) byRegion[brand.originRegion] = (byRegion[brand.originRegion] ?? 0) + 1;
      if (brand.isLocalBrand) localBrands += 1;
    }
    return { brands: this.brandsList.length, companies: this.companiesList.length, byIndustry, byStatus, byVerification, byRegion, localBrands };
  }
}

export type { BrandIndustry };
