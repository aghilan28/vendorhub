import { auditTier14PackageCoverage, auditTier14Traceability, tier14PackageManifests } from "../../lib/tier14";
import { auditTier15PackageCoverage, auditTier15Traceability, tier15PackageManifests } from "../../lib/tier15";

export const verificationPackage = tier15PackageManifests.find((manifest) => manifest.packageName === "verification");
export const tier14VerificationPackage = tier14PackageManifests.find((manifest) => manifest.packageName === "verification");
export const tier15VerificationPackage = verificationPackage;
export const tier14VerificationEngine = { auditTier14PackageCoverage, auditTier14Traceability };
export const tier15VerificationEngine = { auditTier15PackageCoverage, auditTier15Traceability };
