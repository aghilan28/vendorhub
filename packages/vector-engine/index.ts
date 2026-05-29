import { tier14PackageManifests, tier14TraceabilityMatrix } from "../../lib/tier14";

export const vectorEnginePackage = tier14PackageManifests.find((manifest) => manifest.packageName === "vector-engine");
export const vectorCollections = tier14TraceabilityMatrix.map((row) => row.vectorRepresentation);
