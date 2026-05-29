import { tier14PackageManifests } from "../../lib/tier14";
import { tier15PackageManifests } from "../../lib/tier15";

export const frontierDiscoveryPackage = tier15PackageManifests.find((manifest) => manifest.packageName === "frontier-discovery");
export const tier14FrontierDiscoveryPackage = tier14PackageManifests.find((manifest) => manifest.packageName === "frontier-discovery");
export const tier15FrontierDiscoveryPackage = frontierDiscoveryPackage;
