import { assessMemoryHorizon, tier14PackageManifests } from "../../lib/tier14";

export const memorySystemsPackage = tier14PackageManifests.find((manifest) => manifest.packageName === "memory-systems");
export const memorySystemsEngine = { assessMemoryHorizon };
