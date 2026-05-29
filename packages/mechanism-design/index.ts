import { tier14PackageManifests, tier14TraceabilityMatrix } from "../../lib/tier14";

export const mechanismDesignPackage = tier14PackageManifests.find((manifest) => manifest.packageName === "mechanism-design");
export const mechanismDesignTrace = tier14TraceabilityMatrix.filter((row) => row.researchConcept === "mechanism_design");
