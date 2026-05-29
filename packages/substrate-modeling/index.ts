import { tier14PackageManifests, tier14TraceabilityMatrix } from "../../lib/tier14";

export const substrateModelingPackage = tier14PackageManifests.find((manifest) => manifest.packageName === "substrate-modeling");
export const substrateModelingTrace = tier14TraceabilityMatrix.filter((row) => row.researchConcept === "cross_substrate_intelligence");
