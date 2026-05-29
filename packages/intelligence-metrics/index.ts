import { calculateUniversalIntelligenceIndex, tier14PackageManifests } from "../../lib/tier14";

export const intelligenceMetricsPackage = tier14PackageManifests.find((manifest) => manifest.packageName === "intelligence-metrics");
export const intelligenceMetricsEngine = { calculateUniversalIntelligenceIndex };
