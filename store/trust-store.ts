import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sellerKycProfiles } from "@/features/trust/data";
import { calculateTrustScore } from "@/features/trust/scoring";
import type { DocumentType, SellerKycProfile, VerificationState } from "@/features/trust/types";

interface TrustState {
  profiles: SellerKycProfile[];
  selectedSellerId: string;
  complianceFilter: "all" | VerificationState | "flagged";
  uploadState: "idle" | "uploading" | "uploaded" | "failed";
  setSelectedSeller: (sellerId: string) => void;
  setComplianceFilter: (filter: TrustState["complianceFilter"]) => void;
  submitKyc: (sellerId: string) => void;
  uploadDocument: (sellerId: string, documentType: DocumentType, fileName: string) => void;
  recordReview: (sellerId: string, decision: "approved" | "rejected" | "resubmission_required" | "suspended", note: string) => void;
  clearUploadState: () => void;
}

function rescore(profile: SellerKycProfile): SellerKycProfile {
  return { ...profile, trustScore: calculateTrustScore(profile) };
}

export const useTrustStore = create<TrustState>()(
  persist(
    (set) => ({
      profiles: sellerKycProfiles,
      selectedSellerId: sellerKycProfiles[0]?.sellerId ?? "",
      complianceFilter: "all",
      uploadState: "idle",
      setSelectedSeller: (selectedSellerId) => set({ selectedSellerId }),
      setComplianceFilter: (complianceFilter) => set({ complianceFilter }),
      clearUploadState: () => set({ uploadState: "idle" }),
      submitKyc: (sellerId) =>
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.sellerId === sellerId
              ? rescore({
                  ...profile,
                  verificationState: "PENDING_REVIEW",
                  submittedAt: new Date().toISOString(),
                  auditTrail: [...profile.auditTrail, { id: `${sellerId}-audit-${Date.now()}`, sellerId, action: "verification_submitted", actor: "seller", createdAt: new Date().toISOString(), metadata: { state: "PENDING_REVIEW" } }],
                })
              : profile,
          ),
        })),
      uploadDocument: (sellerId, documentType, fileName) =>
        set((state) => ({
          uploadState: "uploaded",
          profiles: state.profiles.map((profile) =>
            profile.sellerId === sellerId
              ? rescore({
                  ...profile,
                  verificationState: profile.verificationState === "NOT_SUBMITTED" ? "PENDING_REVIEW" : profile.verificationState,
                  documents: profile.documents.map((document) =>
                    document.type === documentType
                      ? {
                          ...document,
                          status: "pending_review",
                          fileName,
                          privateStoragePath: `private/kyc/${sellerId}/${documentType}-${Date.now()}.pdf`,
                          uploadedAt: new Date().toISOString(),
                          rejectionReason: undefined,
                        }
                      : document,
                  ),
                  auditTrail: [...profile.auditTrail, { id: `${sellerId}-audit-${Date.now()}`, sellerId, action: "document_uploaded", actor: "seller", createdAt: new Date().toISOString(), metadata: { documentType, fileName } }],
                })
              : profile,
          ),
        })),
      recordReview: (sellerId, decision, note) =>
        set((state) => ({
          profiles: state.profiles.map((profile) => {
            if (profile.sellerId !== sellerId) return profile;
            const verificationState: VerificationState = decision === "approved" ? "VERIFIED" : decision === "rejected" ? "REJECTED" : decision === "suspended" ? "SUSPENDED" : "RESUBMISSION_REQUIRED";
            return rescore({
              ...profile,
              verificationState,
              verifiedAt: decision === "approved" ? new Date().toISOString() : profile.verifiedAt,
              suspendedAt: decision === "suspended" ? new Date().toISOString() : profile.suspendedAt,
              suspensionReason: decision === "suspended" ? note : profile.suspensionReason,
              documents: profile.documents.map((document) => ({
                ...document,
                status: decision === "approved" ? "approved" : decision === "resubmission_required" ? "resubmission_required" : document.status,
                reviewedAt: new Date().toISOString(),
                reviewer: "Admin Trust Desk",
                rejectionReason: decision === "rejected" || decision === "resubmission_required" ? note : undefined,
              })),
              bank: { ...profile.bank, status: decision === "approved" ? "VERIFIED" : verificationState, payoutReadiness: decision === "approved" ? "ready" : decision === "suspended" ? "blocked" : "pending" },
              gst: { ...profile.gst, status: decision === "approved" ? "VERIFIED" : verificationState, invoiceEnabled: decision === "approved" },
              reviews: [...profile.reviews, { id: `${sellerId}-review-${Date.now()}`, sellerId, reviewer: "Admin Trust Desk", decision, note, createdAt: new Date().toISOString() }],
              auditTrail: [...profile.auditTrail, { id: `${sellerId}-audit-${Date.now()}`, sellerId, action: "verification_decision_recorded", actor: "admin", createdAt: new Date().toISOString(), metadata: { decision, note } }],
            });
          }),
        })),
    }),
    { name: "vendorhub-trust-compliance-store" },
  ),
);
