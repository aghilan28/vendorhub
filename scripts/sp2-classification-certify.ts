import fs from "node:fs";
import path from "node:path";
import {
  buildCanonicalStoreClassification,
  buildClassificationSearchIndex,
  buildRankingInputs,
  buildStoreIntelligenceProjection,
  runClassificationScaleCertification,
  validateClassification,
} from "../lib/store-classification";

const { network, classification } = buildCanonicalStoreClassification();
const coverage = classification.coverage(network.storeCount);
const validStoreIds = new Set(network.stores().map((s) => s.id));
const validation = validateClassification(classification.profiles(), { validStoreIds });
const stats = classification.stats();
const search = buildClassificationSearchIndex(classification).length;
const ranking = buildRankingInputs(classification).length;
const intelligence = buildStoreIntelligenceProjection(classification);
const scale = runClassificationScaleCertification([1_000, 5_000, 10_000, 50_000]);

const report = {
  generatedAt: new Date().toISOString(),
  wave: "SP-2",
  subject: "Store Classification, Category & Capability System",
  classification: {
    totalStores: network.storeCount,
    classified: coverage.classified,
    coveragePct: coverage.coveragePct,
    l1Covered: coverage.l1Covered,
    formatsCovered: coverage.formatsCovered,
    byCategoryL1: stats.byL1,
    byFormatType: stats.byFormat,
  },
  integrity: { valid: validation.valid, errors: validation.errorCount, warnings: validation.warningCount },
  readiness: { searchDocuments: search, rankingInputs: ranking, intelligenceHooks: intelligence.hooks.length, complianceCoverage: intelligence.complianceCoverage },
  scaleCertification: scale,
  completionCriteria: {
    everyStoreClassified: coverage.coveragePct === 100,
    everyStoreHasCapabilities: classification.profiles().every((p) => Object.keys(p.capabilities).length === 12),
    everyStoreHasFulfillment: classification.profiles().every((p) => p.fulfillment.modes.length > 0),
    searchConsumable: search === network.storeCount,
    recommendationConsumable: ranking === network.storeCount,
    intelligenceConsumable: intelligence.totalStores === network.storeCount,
    scaleCertified: scale.every((r) => r.coveragePct === 100 && r.valid && r.searchReady && r.recommendationReady && r.intelligenceReady && r.performanceOk),
  },
};

const outDir = path.join(process.cwd(), "docs", "sp2", "generated");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "classification-certification.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

const allPass = validation.valid && Object.values(report.completionCriteria).every(Boolean);
console.log(`SP-2 classification certification ${allPass ? "PASSED" : "FAILED"}.`);
console.log(`  Classified: ${coverage.classified}/${network.storeCount} (${coverage.coveragePct}%), ${coverage.l1Covered} L1 categories, ${coverage.formatsCovered} formats.`);
console.log(`  Integrity: ${validation.errorCount} errors, ${validation.warningCount} warnings.`);
console.log(`  Readiness: ${search} search docs, ${ranking} ranking inputs, ${intelligence.hooks.length} intel hooks.`);
console.log(`  Scale: ${scale.map((r) => `${r.targetStores}:${r.coveragePct === 100 && r.valid ? "ok" : "fail"}`).join(", ")}`);
console.log(`  Report written to ${path.relative(process.cwd(), outPath)}.`);

if (!allPass) process.exit(1);
