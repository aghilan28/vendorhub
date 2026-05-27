import type { Vendor } from "@/types";

export type VerificationState =
  | "NOT_SUBMITTED"
  | "PENDING_REVIEW"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED"
  | "ESCALATION_REQUIRED"
  | "RESUBMISSION_REQUIRED"
  | "SUSPENDED";
export type BusinessType = "proprietorship" | "partnership" | "llp" | "private_limited" | "individual_seller";
export type DocumentType = "aadhaar" | "pan" | "gst_certificate" | "business_registration" | "bank_proof" | "address_proof";
export type DocumentStatus = "not_uploaded" | "uploaded" | "pending_review" | "approved" | "rejected" | "resubmission_required";
export type ComplianceFlagType = "suspicious_activity" | "incomplete_kyc" | "repeated_cancellation" | "suspicious_refund_behavior" | "operational_violation";
export type ComplianceFlagSeverity = "low" | "medium" | "high" | "critical";
export type TrustLevel = "emerging" | "standard" | "trusted" | "verified_plus" | "restricted";

export interface VerificationDocument {
  id: string;
  sellerId: string;
  type: DocumentType;
  label: string;
  status: DocumentStatus;
  fileName?: string;
  privateStoragePath?: string;
  uploadedAt?: string;
  reviewedAt?: string;
  reviewer?: string;
  notes?: string;
  rejectionReason?: string;
  required: boolean;
}

export interface BankVerificationPlaceholder {
  sellerId: string;
  accountHolderName: string;
  bankName: string;
  maskedAccountNumber: string;
  ifsc: string;
  status: VerificationState;
  payoutReadiness: "blocked" | "pending" | "ready";
  notes: string;
}

export interface GstVerificationPlaceholder {
  sellerId: string;
  gstin?: string;
  legalName?: string;
  status: VerificationState;
  invoiceEnabled: boolean;
  notes: string;
}

export interface TrustScore {
  sellerId: string;
  score: number;
  level: TrustLevel;
  factors: Array<{ label: string; score: number; detail: string }>;
  updatedAt: string;
}

export interface ComplianceFlag {
  id: string;
  sellerId: string;
  type: ComplianceFlagType;
  severity: ComplianceFlagSeverity;
  status: "open" | "under_review" | "resolved" | "escalated";
  title: string;
  detail: string;
  createdAt: string;
  owner: "trust_ops" | "seller_ops" | "admin";
}

export interface VerificationReview {
  id: string;
  sellerId: string;
  documentId?: string;
  reviewer: string;
  decision: "approved" | "rejected" | "resubmission_required" | "suspended" | "note";
  note: string;
  createdAt: string;
}

export interface TrustAuditEntry {
  id: string;
  sellerId: string;
  action: string;
  actor: "seller" | "admin" | "system";
  createdAt: string;
  metadata: Record<string, string | number | boolean>;
}

export interface SellerKycProfile {
  sellerId: string;
  vendor: Vendor;
  businessName: string;
  ownerName: string;
  businessType: BusinessType;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  aadhaarLast4?: string;
  panMasked?: string;
  verificationState: VerificationState;
  submittedAt?: string;
  verifiedAt?: string;
  expiresAt?: string;
  suspendedAt?: string;
  suspensionReason?: string;
  escalationReason?: string;
  documents: VerificationDocument[];
  bank: BankVerificationPlaceholder;
  gst: GstVerificationPlaceholder;
  trustScore: TrustScore;
  flags: ComplianceFlag[];
  reviews: VerificationReview[];
  auditTrail: TrustAuditEntry[];
}

export interface TrustSummary {
  totalSellers: number;
  verifiedSellers: number;
  pendingReviews: number;
  resubmissions: number;
  suspendedSellers: number;
  openFlags: number;
  trustDistribution: Array<{ label: TrustLevel; count: number }>;
}
