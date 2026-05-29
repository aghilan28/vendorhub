import { tier14PackageManifests, tier14TraceabilityMatrix } from "../../lib/tier14";

export const graphEnginePackage = tier14PackageManifests.find((manifest) => manifest.packageName === "graph-engine");
export const graphSchemas = tier14TraceabilityMatrix.map((row) => row.graphSchema);
