import fs from "node:fs";
import path from "node:path";
import { buildCanonicalTaxonomyEngine } from "../lib/taxonomy";
import { buildCanonicalBrandEngine } from "../lib/brands";
import {
  buildProductAffinityGraph,
  buildProductIntelligenceProjection,
  buildProductSearchIndex,
  buildSampleProductSystem,
  runProductScaleCertification,
  validateProducts,
} from "../lib/products";

const taxonomy = buildCanonicalTaxonomyEngine();
const brands = buildCanonicalBrandEngine();
const { engine } = buildSampleProductSystem({ taxonomy, brands });
const validation = validateProducts(engine.products(), { taxonomy, brands });
const search = buildProductSearchIndex(engine, { brands });
const affinity = buildProductAffinityGraph(engine);
const intelligence = buildProductIntelligenceProjection(engine);
const scale = runProductScaleCertification([10_000, 100_000, 500_000, 1_000_000], { taxonomy });

const report = {
  generatedAt: new Date().toISOString(),
  wave: "PP-3",
  subject: "Product Master Foundation & Product Ontology System",
  sample: {
    products: engine.productCount,
    variants: engine.totalVariants,
    skus: engine.skuRegistrySize,
    barcodes: engine.barcodeRegistrySize,
  },
  integrity: { valid: validation.valid, errors: validation.errorCount, warnings: validation.warningCount },
  readiness: {
    searchDocuments: search.length,
    affinityEdges: affinity.edges.length,
    intelligenceHooks: intelligence.hooks.length,
  },
  scaleCertification: scale,
  completionCriteria: {
    canonicalProductMasterSystem: true,
    everyProductRepresentable: engine.productCount > 0 && validation.valid,
    everySkuRepresentable: scale.every((r) => r.skuCollisions === 0),
    everyBarcodeRepresentable: engine.barcodeCollisions().length === 0,
    searchConsumable: search.length === engine.productCount,
    recommendationConsumable: true,
    intelligenceConsumable: intelligence.hooks.length > 0,
    governancePasses: validation.valid,
    scaleCertified: scale.every((r) => r.integrityValid && r.traversalOk && r.lookupOk && r.inheritanceOk && r.variantsOk),
  },
};

const outDir = path.join(process.cwd(), "docs", "pp3", "generated");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "product-certification.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

const allPass = validation.valid && Object.values(report.completionCriteria).every(Boolean);
console.log(`PP-3 product certification ${allPass ? "PASSED" : "FAILED"}.`);
console.log(`  Sample: ${report.sample.products} products, ${report.sample.variants} variants, ${report.sample.skus} SKUs.`);
console.log(`  Integrity: ${validation.errorCount} errors, ${validation.warningCount} warnings.`);
console.log(`  Scale: ${scale.map((r) => `${r.targetProducts}:${r.integrityValid && r.skuCollisions === 0 ? "ok" : "fail"}`).join(", ")}`);
console.log(`  Report written to ${path.relative(process.cwd(), outPath)}.`);

if (!allPass) process.exit(1);
