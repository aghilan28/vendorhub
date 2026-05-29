import { tier15PackageManifests } from "../../lib/tier15";

export const eventsPackage = tier15PackageManifests.find((manifest) => manifest.packageName === "events");
