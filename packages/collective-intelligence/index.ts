import { assessCollectiveIntelligenceRisk, tier14PackageManifests } from "../../lib/tier14";

export const collectiveIntelligencePackage = tier14PackageManifests.find((manifest) => manifest.packageName === "collective-intelligence");
export const collectiveIntelligenceEngine = { assessCollectiveIntelligenceRisk };
