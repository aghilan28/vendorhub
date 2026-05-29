import { tier14PackageManifests, tier14TraceabilityMatrix } from "../../lib/tier14";

export const evolutionaryIntelligencePackage = tier14PackageManifests.find((manifest) => manifest.packageName === "evolutionary-intelligence");
export const evolutionaryIntelligenceTrace = tier14TraceabilityMatrix.filter((row) => row.researchConcept === "evolutionary_intelligence");
