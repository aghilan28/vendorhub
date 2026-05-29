import { tier14PackageManifests, tier14TraceabilityMatrix } from "../../lib/tier14";

export const recursiveIntelligencePackage = tier14PackageManifests.find((manifest) => manifest.packageName === "recursive-intelligence");
export const recursiveIntelligenceTrace = tier14TraceabilityMatrix.filter((row) => row.researchConcept === "recursive_intelligence" || row.researchConcept === "reflective_intelligence");
