import fs from "node:fs";
import path from "node:path";
import { buildCanonicalTaxonomyEngine } from "../lib/taxonomy";
import {
  buildBrandAffinityGraph,
  buildBrandIntelligenceProjection,
  buildBrandSearchIndex,
  buildCanonicalBrandSystem,
  runBrandScaleCertification,
  validateBrandUniverse,
} from "../lib/brands";

const taxonomy = buildCanonicalTaxonomyEngine();
const { engine, classification } = buildCanonicalBrandSystem({ taxonomy });
const validation = validateBrandUniverse(engine.brands(), engine.companies(), { taxonomy });
const search = buildBrandSearchIndex(engine);
const affinity = buildBrandAffinityGraph(engine);
const intelligence = buildBrandIntelligenceProjection(engine);
const coverage = classification.coverage();
const scale = runBrandScaleCertification([100, 500, 1000, 5000], taxonomy);

const report = {
  generatedAt: new Date().toISOString(),
  wave: "PP-2",
  subject: "Brand Universe Foundation & Brand Intelligence System",
  canonical: {
    brands: engine.brandCount,
    companies: engine.companyCount,
    byIndustry: engine.stats().byIndustry,
    localBrands: engine.stats().localBrands,
  },
  integrity: { valid: validation.valid, errors: validation.errorCount, warnings: validation.warningCount },
  classification: coverage,
  readiness: {
    searchDocuments: search.length,
    affinityEdges: affinity.edges.length,
    brandGroups: affinity.groups.length,
    intelligenceHooks: intelligence.hooks.length,
    topCompanies: intelligence.topCompaniesByBrandCount,
  },
  scaleCertification: scale,
  completionCriteria: {
    canonicalBrandUniverse: engine.brandCount >= 1000,
    realBrands1000Plus: engine.brandCount >= 1000,
    linkedToTaxonomy: coverage.classifiedBrands === coverage.totalBrands && classification.invalidMappings().length === 0,
    searchConsumable: search.length === engine.brandCount,
    recommendationConsumable: affinity.edges.length > 0,
    intelligenceConsumable: intelligence.hooks.length > 0,
    governancePasses: validation.valid,
    scaleCertified: scale.every((r) => r.valid && r.ownershipOk && r.classificationOk && r.lookupOk),
  },
};

const outDir = path.join(process.cwd(), "docs", "pp2", "generated");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "brand-certification.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

const allPass = validation.valid && Object.values(report.completionCriteria).every(Boolean);
console.log(`PP-2 brand certification ${allPass ? "PASSED" : "FAILED"}.`);
console.log(`  Brands: ${report.canonical.brands}, Companies: ${report.canonical.companies}`);
console.log(`  Integrity: ${validation.errorCount} errors, ${validation.warningCount} warnings.`);
console.log(`  Classification: ${coverage.classifiedBrands}/${coverage.totalBrands} classified, ${coverage.departmentsCovered} departments covered.`);
console.log(`  Scale: ${scale.map((r) => `${r.targetBrands}:${r.valid && r.ownershipOk && r.classificationOk ? "ok" : "fail"}`).join(", ")}`);
console.log(`  Report written to ${path.relative(process.cwd(), outPath)}.`);

if (!allPass) process.exit(1);
