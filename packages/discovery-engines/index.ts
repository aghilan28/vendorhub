import { tier15PackageManifests } from "../../lib/tier15";

export const discoveryEnginesPackage = tier15PackageManifests.find((manifest) => manifest.packageName === "discovery-engines");
