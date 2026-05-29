import { calculateCrossEntropy, calculateJensenShannonDivergence, calculateKLDivergence, calculateMinimumDescriptionLength, calculateShannonEntropy, tier14PackageManifests } from "../../lib/tier14";

export const informationTheoryPackage = tier14PackageManifests.find((manifest) => manifest.packageName === "information-theory");
export const informationTheoryEngine = { calculateCrossEntropy, calculateJensenShannonDivergence, calculateKLDivergence, calculateMinimumDescriptionLength, calculateShannonEntropy };
