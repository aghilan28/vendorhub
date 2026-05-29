import { simulateTier14Runtime, tier14PackageManifests } from "../../lib/tier14";

export const simulationRuntimePackage = tier14PackageManifests.find((manifest) => manifest.packageName === "simulation-runtime");
export const simulationRuntimeEngine = { simulateTier14Runtime };
