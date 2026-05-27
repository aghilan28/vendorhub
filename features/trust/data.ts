import { marketplaceVendors } from "@/features/marketplace/lib/data";
import type { SellerKycProfile, VerificationDocument, VerificationState } from "./types";
import { calculateTrustScore } from "./scoring";

function documents(sellerId: string, state: VerificationState): VerificationDocument[] {
  const approved = state === "VERIFIED" || state === "SUSPENDED";
  const pending = state === "PENDING_REVIEW";
  const rejected = state === "RESUBMISSION_REQUIRED" || state === "REJECTED";
  const status = approved ? "approved" : pending ? "pending_review" : rejected ? "resubmission_required" : "not_uploaded";

  return [
    { id: `${sellerId}-aadhaar`, sellerId, type: "aadhaar", label: "Aadhaar identity proof", status, fileName: approved || pending || rejected ? "aadhaar_masked_upload.pdf" : undefined, privateStoragePath: approved || pending || rejected ? `private/kyc/${sellerId}/aadhaar.pdf` : undefined, uploadedAt: approved || pending || rejected ? "2026-05-21T10:15:00.000Z" : undefined, reviewedAt: approved ? "2026-05-22T12:20:00.000Z" : undefined, reviewer: approved ? "Trust Ops Bengaluru" : undefined, notes: "Masked Aadhaar placeholder. Only last four digits stored in UI.", rejectionReason: rejected ? "Address on document does not match operating location." : undefined, required: true },
    { id: `${sellerId}-pan`, sellerId, type: "pan", label: "PAN business identity", status, fileName: approved || pending || rejected ? "pan_card_upload.pdf" : undefined, privateStoragePath: approved || pending || rejected ? `private/kyc/${sellerId}/pan.pdf` : undefined, uploadedAt: approved || pending || rejected ? "2026-05-21T10:18:00.000Z" : undefined, reviewedAt: approved ? "2026-05-22T12:22:00.000Z" : undefined, reviewer: approved ? "Trust Ops Bengaluru" : undefined, notes: "PAN format validation placeholder complete.", required: true },
    { id: `${sellerId}-gst`, sellerId, type: "gst_certificate", label: "GST certificate", status: approved ? "approved" : pending ? "pending_review" : "uploaded", fileName: "gst_certificate.pdf", privateStoragePath: `private/kyc/${sellerId}/gst.pdf`, uploadedAt: "2026-05-21T10:20:00.000Z", reviewedAt: approved ? "2026-05-22T12:26:00.000Z" : undefined, reviewer: approved ? "Trust Ops Bengaluru" : undefined, notes: "GSTIN verification placeholder checked against invoice profile.", required: true },
    { id: `${sellerId}-bank`, sellerId, type: "bank_proof", label: "Cancelled cheque or bank proof", status: approved ? "approved" : pending ? "pending_review" : "uploaded", fileName: "bank_proof_masked.pdf", privateStoragePath: `private/kyc/${sellerId}/bank.pdf`, uploadedAt: "2026-05-21T10:24:00.000Z", reviewedAt: approved ? "2026-05-22T12:29:00.000Z" : undefined, reviewer: approved ? "Trust Ops Bengaluru" : undefined, notes: "Bank proof placeholder for payout readiness.", required: true },
    { id: `${sellerId}-address`, sellerId, type: "address_proof", label: "Store address proof", status: approved ? "approved" : pending ? "pending_review" : "not_uploaded", fileName: approved || pending ? "shop_address_proof.pdf" : undefined, privateStoragePath: approved || pending ? `private/kyc/${sellerId}/address.pdf` : undefined, uploadedAt: approved || pending ? "2026-05-21T10:32:00.000Z" : undefined, reviewedAt: approved ? "2026-05-22T12:31:00.000Z" : undefined, reviewer: approved ? "Trust Ops Bengaluru" : undefined, notes: "Address proof supports local service legitimacy.", required: false },
  ];
}

function buildProfile(index: number, state: VerificationState, overrides: Partial<SellerKycProfile> = {}): SellerKycProfile {
  const vendor = marketplaceVendors[index];
  const sellerId = vendor.id;
  const docs = documents(sellerId, state);
  const profileShell: SellerKycProfile = {
    sellerId,
    vendor,
    businessName: vendor.name,
    ownerName: ["Ramesh Iyer", "Farah Khan", "Meera Nair", "Arun Prakash"][index % 4],
    businessType: index % 3 === 0 ? "proprietorship" : index % 3 === 1 ? "partnership" : "llp",
    phone: "+91 98765 43210",
    email: `${vendor.slug}@vendorhub.local`,
    address: `${vendor.area}, ${vendor.locality}`,
    city: vendor.city ?? "Chennai",
    state: "Tamil Nadu",
    pincode: index === 1 ? "600040" : "600017",
    aadhaarLast4: state === "NOT_SUBMITTED" ? undefined : "2684",
    panMasked: state === "NOT_SUBMITTED" ? undefined : "AA***1042K",
    verificationState: state,
    submittedAt: state === "NOT_SUBMITTED" ? undefined : "2026-05-21T10:40:00.000Z",
    verifiedAt: state === "VERIFIED" ? "2026-05-22T12:35:00.000Z" : undefined,
    suspendedAt: state === "SUSPENDED" ? "2026-05-24T08:20:00.000Z" : undefined,
    suspensionReason: state === "SUSPENDED" ? "Repeated compliance warning unresolved after admin review." : undefined,
    documents: docs,
    bank: {
      sellerId,
      accountHolderName: vendor.name,
      bankName: index % 2 === 0 ? "HDFC Bank" : "State Bank of India",
      maskedAccountNumber: "XXXXXX2846",
      ifsc: index % 2 === 0 ? "HDFC0001234" : "SBIN0004217",
      status: state === "VERIFIED" ? "VERIFIED" : state === "SUSPENDED" ? "SUSPENDED" : "PENDING_REVIEW",
      payoutReadiness: state === "VERIFIED" ? "ready" : state === "SUSPENDED" ? "blocked" : "pending",
      notes: "Bank penny-drop integration placeholder. Manual document review controls payout readiness.",
    },
    gst: {
      sellerId,
      gstin: state === "NOT_SUBMITTED" ? undefined : `33AA${String(index + 1042).padStart(4, "0")}VH1Z${index}`,
      legalName: vendor.name,
      status: state === "VERIFIED" ? "VERIFIED" : state === "NOT_SUBMITTED" ? "NOT_SUBMITTED" : "PENDING_REVIEW",
      invoiceEnabled: state === "VERIFIED",
      notes: "GSTIN format and invoice legitimacy placeholder.",
    },
    flags:
      state === "SUSPENDED"
        ? [{ id: `${sellerId}-flag-1`, sellerId, type: "operational_violation", severity: "high", status: "escalated", title: "Seller visibility restricted", detail: "Repeated cancellation and incomplete resubmission created temporary listing restrictions.", createdAt: "2026-05-24T08:20:00.000Z", owner: "trust_ops" }]
        : state === "RESUBMISSION_REQUIRED"
          ? [{ id: `${sellerId}-flag-1`, sellerId, type: "incomplete_kyc", severity: "medium", status: "open", title: "Address proof mismatch", detail: "Operating location proof does not match seller profile address.", createdAt: "2026-05-23T14:10:00.000Z", owner: "seller_ops" }]
          : [],
    reviews: [
      { id: `${sellerId}-review-1`, sellerId, reviewer: "Trust Ops Bengaluru", decision: state === "VERIFIED" ? "approved" : state === "RESUBMISSION_REQUIRED" ? "resubmission_required" : "note", note: state === "VERIFIED" ? "Identity, GST, and bank proof approved for marketplace operations." : "Verification workflow is active.", createdAt: "2026-05-22T12:35:00.000Z" },
    ],
    auditTrail: [
      { id: `${sellerId}-audit-submit`, sellerId, action: "verification_submitted", actor: "seller", createdAt: "2026-05-21T10:40:00.000Z", metadata: { state } },
      { id: `${sellerId}-audit-review`, sellerId, action: "trust_review_recorded", actor: "admin", createdAt: "2026-05-22T12:35:00.000Z", metadata: { decision: state } },
    ],
    trustScore: { sellerId, score: 0, level: "emerging", factors: [], updatedAt: "2026-05-22T12:35:00.000Z" },
  };
  const merged = { ...profileShell, ...overrides };
  return { ...merged, trustScore: calculateTrustScore(merged) };
}

export const sellerKycProfiles: SellerKycProfile[] = [
  buildProfile(0, "VERIFIED"),
  buildProfile(1, "PENDING_REVIEW"),
  buildProfile(2, "RESUBMISSION_REQUIRED"),
  buildProfile(3, "VERIFIED"),
  buildProfile(4, "SUSPENDED"),
];

export function getTrustProfileForVendor(vendorId: string) {
  return sellerKycProfiles.find((profile) => profile.sellerId === vendorId) ?? sellerKycProfiles[0];
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
