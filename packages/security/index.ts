import { tier14PackageManifests } from "../../lib/tier14";
import { tier15PackageManifests } from "../../lib/tier15";

export const securityPackage = tier15PackageManifests.find((manifest) => manifest.packageName === "security");
export const tier14SecurityPackage = tier14PackageManifests.find((manifest) => manifest.packageName === "security");
export const tier15SecurityPackage = securityPackage;
