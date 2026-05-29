import { tier14PackageManifests } from "../../lib/tier14";
import { tier15PackageManifests } from "../../lib/tier15";

export const observabilityPackage = tier15PackageManifests.find((manifest) => manifest.packageName === "observability");
export const tier14ObservabilityPackage = tier14PackageManifests.find((manifest) => manifest.packageName === "observability");
export const tier15ObservabilityPackage = observabilityPackage;
