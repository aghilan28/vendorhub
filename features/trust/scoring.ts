import type { SellerKycProfile, TrustLevel, TrustScore } from "./types";

export function trustLevelForScore(score: number): TrustLevel {
  if (score < 35) return "restricted";
  if (score < 55) return "emerging";
  if (score < 75) return "standard";
  if (score < 90) return "trusted";
  return "verified_plus";
}

export function calculateTrustScore(profile: Pick<SellerKycProfile, "sellerId" | "verificationState" | "documents" | "bank" | "gst" | "flags">): TrustScore {
  const approvedDocuments = profile.documents.filter((document) => document.status === "approved").length;
  const requiredDocuments = Math.max(1, profile.documents.filter((document) => document.required).length);
  const documentScore = Math.round((approvedDocuments / requiredDocuments) * 30);
  const kycScore =
    profile.verificationState === "VERIFIED"
      ? 25
      : profile.verificationState === "PENDING_REVIEW" || profile.verificationState === "UNDER_REVIEW"
        ? 14
        : profile.verificationState === "RESUBMISSION_REQUIRED"
          ? 8
          : profile.verificationState === "ESCALATION_REQUIRED"
            ? 5
            : 0;
  const gstScore = profile.gst.status === "VERIFIED" ? 15 : profile.gst.status === "PENDING_REVIEW" || profile.gst.status === "UNDER_REVIEW" ? 8 : 0;
  const bankScore = profile.bank.status === "VERIFIED" ? 15 : profile.bank.status === "PENDING_REVIEW" || profile.bank.status === "UNDER_REVIEW" ? 7 : 0;
  const flagPenalty = profile.flags.filter((flag) => flag.status !== "resolved").reduce((sum, flag) => sum + (flag.severity === "critical" ? 18 : flag.severity === "high" ? 12 : flag.severity === "medium" ? 7 : 3), 0);
  const operationalScore = 15;
  const score = Math.max(0, Math.min(100, documentScore + kycScore + gstScore + bankScore + operationalScore - flagPenalty));

  return {
    sellerId: profile.sellerId,
    score,
    level: trustLevelForScore(score),
    updatedAt: new Date().toISOString(),
    factors: [
      { label: "KYC completion", score: kycScore, detail: `${profile.verificationState.replaceAll("_", " ").toLowerCase()} workflow` },
      { label: "Document quality", score: documentScore, detail: `${approvedDocuments}/${requiredDocuments} required documents approved` },
      { label: "GST legitimacy", score: gstScore, detail: profile.gst.invoiceEnabled ? "GST invoice identity enabled" : "GST verification pending" },
      { label: "Bank readiness", score: bankScore, detail: profile.bank.payoutReadiness === "ready" ? "Payout account ready" : "Payout readiness incomplete" },
      { label: "Operational consistency", score: operationalScore, detail: "Fulfillment quality placeholder included" },
    ],
  };
}

export function verificationLabel(state: SellerKycProfile["verificationState"]) {
  return state.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export function trustLevelLabel(level: TrustLevel) {
  return level.replaceAll("_", " ").replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}
