import { tier14PackageManifests, tier14TraceabilityMatrix } from "../../lib/tier14";

export const metaSynthesisPackage = tier14PackageManifests.find((manifest) => manifest.packageName === "meta-synthesis");
export const metaSynthesisTrace = tier14TraceabilityMatrix.filter((row) => row.researchConcept === "meta_synthesis_framework");
