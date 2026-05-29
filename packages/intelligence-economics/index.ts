import { tier14PackageManifests, tier14TraceabilityMatrix } from "../../lib/tier14";

export const intelligenceEconomicsPackage = tier14PackageManifests.find((manifest) => manifest.packageName === "intelligence-economics");
export const intelligenceEconomicsTrace = tier14TraceabilityMatrix.filter((row) => row.researchConcept === "intelligence_economics");
