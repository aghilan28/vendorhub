import { tier14PackageManifests } from "../../lib/tier14";
import { tier15PackageManifests } from "../../lib/tier15";

export const infrastructurePackage = tier15PackageManifests.find((manifest) => manifest.packageName === "infrastructure");
export const tier14InfrastructurePackage = tier14PackageManifests.find((manifest) => manifest.packageName === "infrastructure");
export const tier15InfrastructurePackage = infrastructurePackage;
