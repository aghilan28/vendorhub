import { assessLearningSystem, tier14PackageManifests } from "../../lib/tier14";

export const learningSystemsPackage = tier14PackageManifests.find((manifest) => manifest.packageName === "learning-systems");
export const learningSystemsEngine = { assessLearningSystem };
