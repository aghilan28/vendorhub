import type { TaxonomyEngine } from "@/lib/taxonomy";
import { BrandClassification } from "./classification";
import { BrandEngine } from "./engine";
import { validateBrandUniverse } from "./validation";
import type { BrandInput, CompanyInput } from "./types";

/** Real department slugs from the PP-1 canonical taxonomy, used to keep synthetic brands classified. */
const SYNTHETIC_DEPARTMENTS = [
  "groceries",
  "dairy",
  "beverages",
  "snacks",
  "personal-care",
  "electronics",
  "fashion",
  "household",
];

export interface SyntheticBrandUniverse {
  brands: BrandInput[];
  companies: CompanyInput[];
}

/**
 * Deterministically generates a valid synthetic brand universe with exactly `brandCount` brands,
 * one company per 10 brands (every company owns brands; every brand is classified and owned).
 */
export function generateSyntheticBrands(brandCount: number): SyntheticBrandUniverse {
  const companyCount = Math.max(1, Math.ceil(brandCount / 10));
  const companies: CompanyInput[] = [];
  for (let c = 0; c < companyCount; c += 1) {
    companies.push({ id: `co-${c}`, name: `Company ${c}`, industry: "OTHER" });
  }
  const brands: BrandInput[] = [];
  for (let b = 0; b < brandCount; b += 1) {
    brands.push({
      id: `br-${b}`,
      name: `Brand ${b}`,
      companyId: `co-${b % companyCount}`,
      departments: [SYNTHETIC_DEPARTMENTS[b % SYNTHETIC_DEPARTMENTS.length]],
      industry: "OTHER",
    });
  }
  return { brands, companies };
}

export interface BrandScaleCertificationResult {
  targetBrands: number;
  totalBrands: number;
  totalCompanies: number;
  valid: boolean;
  errorCount: number;
  warningCount: number;
  ownershipOk: boolean;
  classificationOk: boolean;
  lookupOk: boolean;
  buildMs: number;
  validateMs: number;
}

export function certifyBrandScaleTarget(targetBrands: number, taxonomy?: TaxonomyEngine): BrandScaleCertificationResult {
  const { brands, companies } = generateSyntheticBrands(targetBrands);

  const buildStart = Date.now();
  const engine = BrandEngine.fromInputs(brands, companies);
  const buildMs = Date.now() - buildStart;

  const validateStart = Date.now();
  const report = validateBrandUniverse(engine.brands(), engine.companies(), { taxonomy });
  const validateMs = Date.now() - validateStart;

  const sampleBrand = engine.getBrand("br-0");
  const lookupOk = Boolean(sampleBrand && engine.getBrandBySlug(sampleBrand.slug)?.id === "br-0");
  const ownershipOk = Boolean(sampleBrand && engine.getOwnershipChain("br-0").some((company) => company.id === "co-0"));

  let classificationOk = true;
  if (taxonomy) {
    const classification = new BrandClassification(engine, taxonomy);
    classificationOk =
      classification.unclassifiedBrands().length === 0 &&
      classification.invalidMappings().length === 0 &&
      classification.getBrandsForDepartment("groceries").length > 0;
  }

  return {
    targetBrands,
    totalBrands: engine.brandCount,
    totalCompanies: engine.companyCount,
    valid: report.valid,
    errorCount: report.errorCount,
    warningCount: report.warningCount,
    ownershipOk,
    classificationOk,
    lookupOk,
    buildMs,
    validateMs,
  };
}

export function runBrandScaleCertification(targets: number[] = [100, 500, 1000, 5000], taxonomy?: TaxonomyEngine): BrandScaleCertificationResult[] {
  return targets.map((target) => certifyBrandScaleTarget(target, taxonomy));
}
