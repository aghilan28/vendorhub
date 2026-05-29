import { tier14PackageManifests } from "../../lib/tier14";
import { tier15PackageManifests } from "../../lib/tier15";

export const apiPackage = tier15PackageManifests.find((manifest) => manifest.packageName === "api");
export const tier14ApiPackage = tier14PackageManifests.find((manifest) => manifest.packageName === "api");
export const tier15ApiPackage = apiPackage;
