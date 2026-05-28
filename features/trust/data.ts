import type { SellerKycProfile } from "./types";

export const sellerKycProfiles: SellerKycProfile[] = [];

export function getTrustProfileForVendor(vendorId: string) {
  return sellerKycProfiles.find((profile) => profile.sellerId === vendorId);
}

export function getTrustSummary(profiles: SellerKycProfile[]) {
  return {
    totalSellers: profiles.length,
    verifiedSellers: profiles.filter((profile) => profile.verificationState === "VERIFIED").length,
    pendingReviews: profiles.filter((profile) => profile.verificationState === "PENDING_REVIEW").length,
    resubmissions: profiles.filter((profile) => profile.verificationState === "RESUBMISSION_REQUIRED").length,
    suspendedSellers: profiles.filter((profile) => profile.verificationState === "SUSPENDED").length,
    openFlags: profiles.flatMap((profile) => profile.flags).filter((flag) => flag.status !== "resolved").length,
    trustDistribution: (["restricted", "emerging", "standard", "trusted", "verified_plus"] as const).map((label) => ({
      label,
      count: profiles.filter((profile) => profile.trustScore.level === label).length,
    })),
  };
}
