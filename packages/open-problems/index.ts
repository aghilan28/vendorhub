import { tier14PackageManifests } from "../../lib/tier14";
import { tier15PackageManifests } from "../../lib/tier15";

export const openProblemsPackage = tier15PackageManifests.find((manifest) => manifest.packageName === "open-problems");
export const tier14OpenProblemsPackage = tier14PackageManifests.find((manifest) => manifest.packageName === "open-problems");
export const tier15OpenProblemsPackage = openProblemsPackage;
