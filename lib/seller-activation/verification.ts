// MCP-1A Phase 3 — KYC & Verification engine (deterministic, pure).
//
// Identity / business / bank / document checks, risk flags, fraud heuristics, a
// risk score, a trust-score contribution and an auto/manual/reject decision with
// escalation. Operates on the onboarding application data.

import { isValidGstin, isValidIfsc, isValidPan } from "./onboarding";
import type {
  CheckState,
  RiskFlag,
  SellerApplication,
  SellerApplicationData,
  VerificationCase,
  VerificationCheck,
  VerificationDecision,
} from "./types";

const REQUIRED_DOCS = ["pan", "bank_proof"] as const;

function identityState(data: SellerApplicationData): { state: CheckState; detail: string } {
  if (!data.panNumber) return { state: "pending", detail: "PAN not provided." };
  if (!isValidPan(data.panNumber)) return { state: "failed", detail: "PAN format is invalid." };
  return { state: "passed", detail: "PAN format valid." };
}

function businessState(data: SellerApplicationData): { state: CheckState; detail: string } {
  if (!data.businessName || !data.businessType) return { state: "pending", detail: "Business details incomplete." };
  if (data.gstExempt) return { state: "passed", detail: "GST exemption declared." };
  if (!data.gstin) return { state: "manual_review", detail: "No GSTIN and no exemption — manual review." };
  if (!isValidGstin(data.gstin)) return { state: "failed", detail: "GSTIN format is invalid." };
  // PAN embedded in GSTIN (chars 3-12) should match the provided PAN.
  if (data.panNumber && isValidPan(data.panNumber) && data.gstin.toUpperCase().slice(2, 12) !== data.panNumber.toUpperCase()) {
    return { state: "manual_review", detail: "GSTIN/PAN mismatch — manual review." };
  }
  return { state: "passed", detail: "GSTIN valid and consistent with PAN." };
}

function bankState(data: SellerApplicationData): { state: CheckState; detail: string } {
  if (!data.accountNumber || !data.ifsc || !data.accountHolder) return { state: "pending", detail: "Bank details incomplete." };
  if (!isValidIfsc(data.ifsc)) return { state: "failed", detail: "IFSC format is invalid." };
  if (!/^[0-9]{6,18}$/.test(data.accountNumber)) return { state: "failed", detail: "Account number looks invalid." };
  return { state: "passed", detail: "Bank details well-formed." };
}

function documentState(data: SellerApplicationData): { state: CheckState; detail: string } {
  const kinds = new Set((data.documents ?? []).map((d) => d.kind));
  const missing = REQUIRED_DOCS.filter((k) => !kinds.has(k));
  if (missing.length === REQUIRED_DOCS.length) return { state: "pending", detail: "No documents uploaded." };
  if (missing.length > 0) return { state: "manual_review", detail: `Missing documents: ${missing.join(", ")}.` };
  return { state: "passed", detail: "Required documents present." };
}

function detectRiskFlags(data: SellerApplicationData): RiskFlag[] {
  const flags: RiskFlag[] = [];
  if (!data.gstExempt && !data.gstin) flags.push({ kind: "missing_gstin", severity: "warning", message: "No GSTIN and no exemption declared." });
  if (data.gstin && !isValidGstin(data.gstin)) flags.push({ kind: "invalid_gstin", severity: "warning", message: "GSTIN format invalid." });
  if (data.panNumber && !isValidPan(data.panNumber)) flags.push({ kind: "invalid_pan", severity: "warning", message: "PAN format invalid." });
  if (data.ifsc && !isValidIfsc(data.ifsc)) flags.push({ kind: "invalid_ifsc", severity: "warning", message: "IFSC format invalid." });
  if (data.accountHolder && data.businessName && normalize(data.accountHolder) !== normalize(data.businessName) && normalize(data.accountHolder) !== normalize(data.ownerName ?? "")) {
    flags.push({ kind: "name_mismatch", severity: "watch", message: "Bank account holder differs from business/owner name." });
  }
  const docKinds = new Set((data.documents ?? []).map((d) => d.kind));
  if (!docKinds.has("pan") || !docKinds.has("bank_proof")) flags.push({ kind: "incomplete_documents", severity: "watch", message: "KYC documents incomplete." });
  return flags;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const TRUST_WEIGHT: Record<CheckState, number> = { passed: 1, manual_review: 0.5, pending: 0, failed: 0 };

/** Build the verification case for an application (pure + deterministic). */
export function buildVerificationCase(application: SellerApplication): VerificationCase {
  const data = application.data;
  const checks: VerificationCheck[] = [
    { id: "identity", label: "Identity (PAN)", ...identityState(data) },
    { id: "business", label: "Business (GST)", ...businessState(data) },
    { id: "bank", label: "Bank account", ...bankState(data) },
    { id: "document", label: "Documents", ...documentState(data) },
  ];
  const riskFlags = detectRiskFlags(data);

  // Risk score: failures + flags raise it; passes lower it.
  const failed = checks.filter((c) => c.state === "failed").length;
  const manual = checks.filter((c) => c.state === "manual_review").length;
  const pending = checks.filter((c) => c.state === "pending").length;
  const flagWeight = riskFlags.reduce((sum, f) => sum + (f.severity === "warning" ? 14 : f.severity === "watch" ? 7 : 0), 0);
  const riskScore = Math.max(0, Math.min(100, failed * 30 + manual * 12 + pending * 6 + flagWeight));

  const trustContribution = Math.round((checks.reduce((sum, c) => sum + TRUST_WEIGHT[c.state], 0) / checks.length) * 100);

  let decision: VerificationDecision;
  if (failed > 0 || riskScore >= 70) decision = "reject";
  else if (manual > 0 || pending > 0 || riskScore >= 30) decision = "manual_review";
  else decision = "auto_approve";

  const escalated = decision === "manual_review" && riskScore >= 50;

  return { applicationId: application.id, checks, riskFlags, riskScore, trustContribution, decision, escalated };
}

/** Verification status summary for dashboards. */
export function verificationSummary(vc: VerificationCase): { score: number; decision: VerificationDecision; passed: number; total: number; escalated: boolean } {
  return {
    score: vc.trustContribution,
    decision: vc.decision,
    passed: vc.checks.filter((c) => c.state === "passed").length,
    total: vc.checks.length,
    escalated: vc.escalated,
  };
}
