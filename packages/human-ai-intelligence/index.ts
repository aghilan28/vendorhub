import { tier14PackageManifests, tier14TraceabilityMatrix } from "../../lib/tier14";

export const humanAiIntelligencePackage = tier14PackageManifests.find((manifest) => manifest.packageName === "human-ai-intelligence");
export const humanAiIntelligenceTrace = tier14TraceabilityMatrix.filter((row) => row.researchConcept === "human_ai_collective_intelligence");
