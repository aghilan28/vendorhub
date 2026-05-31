import fs from "node:fs";
import path from "node:path";
import {
  StoreClassification,
  buildCanonicalSellerNetwork,
  buildSellerAnalytics,
  buildStoreSearchIndex,
  runSellerScaleCertification,
  validateSellerNetwork,
} from "../lib/sellers";

const engine = buildCanonicalSellerNetwork();
const stats = engine.stats();
const validation = validateSellerNetwork(engine.sellers(), engine.stores());
const classification = new StoreClassification(engine).report();
const analytics = buildSellerAnalytics(engine);
const searchDocs = buildStoreSearchIndex(engine).length;
const scale = runSellerScaleCertification();

const report = {
  generatedAt: new Date().toISOString(),
  wave: "SP-1",
  subject: "Seller Universe Foundation & Store Network System",
  universe: {
    sellers: engine.sellerCount,
    stores: engine.storeCount,
    averageStoresPerSeller: stats.averageStoresPerSeller,
    storesByType: stats.storesByType,
    storesByRegion: stats.storesByRegion,
  },
  integrity: { valid: validation.valid, errors: validation.errorCount, warnings: validation.warningCount },
  classification: { classifiedStores: classification.classifiedStores, totalStores: classification.totalStores, typesCovered: classification.typesCovered, unclassified: classification.unclassifiedStores.length },
  readiness: { searchDocuments: searchDocs, analyticsHooks: analytics.hooks.length, topChains: analytics.topChainsByStoreCount.slice(0, 5) },
  scaleCertification: scale,
  completionCriteria: {
    canonicalSellerUniverse: engine.sellerCount > 0,
    canonicalStoreUniverse: engine.storeCount > 0,
    sellers1000Plus: engine.sellerCount >= 1000,
    stores5000Plus: engine.storeCount >= 5000,
    storesClassified: classification.unclassifiedStores.length === 0,
    governancePasses: validation.valid,
    validationPasses: validation.valid,
    scaleCertified: scale.every((r) => r.valid && r.classificationOk && r.ownershipOk && r.searchReady && r.analyticsReady && r.performanceOk),
  },
};

const outDir = path.join(process.cwd(), "docs", "sp1", "generated");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "seller-certification.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

const allPass = validation.valid && Object.values(report.completionCriteria).every(Boolean);
console.log(`SP-1 seller certification ${allPass ? "PASSED" : "FAILED"}.`);
console.log(`  Universe: ${engine.sellerCount} sellers, ${engine.storeCount} stores (avg ${stats.averageStoresPerSeller}/seller).`);
console.log(`  Integrity: ${validation.errorCount} errors, ${validation.warningCount} warnings.`);
console.log(`  Classification: ${classification.classifiedStores}/${classification.totalStores} (${classification.typesCovered} types).`);
console.log(`  Scale: ${scale.map((r) => `${r.generatedSellers}s/${r.generatedStores}st:${r.valid && r.classificationOk ? "ok" : "fail"}`).join(", ")}`);
console.log(`  Report written to ${path.relative(process.cwd(), outPath)}.`);

if (!allPass) process.exit(1);
