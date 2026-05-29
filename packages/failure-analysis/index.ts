import { detectIntelligenceFailure, tier14PackageManifests } from "../../lib/tier14";

export const failureAnalysisPackage = tier14PackageManifests.find((manifest) => manifest.packageName === "failure-analysis");
export const failureAnalysisEngine = { detectIntelligenceFailure };
