import { tier14PackageManifests, tier14TraceabilityMatrix } from "../../lib/tier14";

export const orchestrationPackage = tier14PackageManifests.find((manifest) => manifest.packageName === "orchestration");
export const orchestrationWorkflows = tier14TraceabilityMatrix.map((row) => row.workflow);
