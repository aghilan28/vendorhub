"use client";

import { Building2, FileUp, Landmark, ReceiptText, ShieldCheck, Upload } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTrustStore } from "@/store/trust-store";
import { useKycProfile } from "../queries";
import type { DocumentType } from "../types";
import { TrustLevelBadge, VerificationStateBadge } from "./trust-badges";

const documentFileNames: Record<DocumentType, string> = {
  aadhaar: "aadhaar_masked_upload.pdf",
  pan: "pan_card_upload.pdf",
  gst_certificate: "gst_certificate.pdf",
  business_registration: "udyam_registration.pdf",
  bank_proof: "cancelled_cheque_masked.pdf",
  address_proof: "shop_address_proof.pdf",
};

export function SellerKycPanel({ sellerId }: { sellerId: string }) {
  const { data: profile } = useKycProfile(sellerId);
  const uploadDocument = useTrustStore((state) => state.uploadDocument);
  const submitKyc = useTrustStore((state) => state.submitKyc);

  if (!profile) return <EmptyState icon={ShieldCheck} title="No verification profile" description="KYC profile will appear after seller onboarding starts." />;

  const completed = profile.documents.filter((document) => document.status === "approved").length;
  const progress = Math.round((completed / profile.documents.length) * 100);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-secondary-text">Seller verification</p>
            <h2 className="mt-1 text-xl font-semibold text-primary-text">{profile.businessName}</h2>
            <p className="mt-2 text-sm text-secondary-text">{profile.ownerName} · {profile.businessType.replaceAll("_", " ")} · {profile.city}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <VerificationStateBadge state={profile.verificationState} />
              <TrustLevelBadge level={profile.trustScore.level} />
            </div>
          </div>
          <div className="min-w-52 rounded-md bg-slate-50 p-3">
            <p className="text-xs text-secondary-text">KYC progress</p>
            <p className="mt-1 text-2xl font-semibold text-primary-text">{progress}%</p>
            <div className="mt-3 h-2 rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-brand" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </section>

      {profile.verificationState === "RESUBMISSION_REQUIRED" ? (
        <Alert title="Resubmission required" variant="warning">Update the rejected documents below. Admin notes explain what needs to be corrected.</Alert>
      ) : null}
      {profile.verificationState === "SUSPENDED" ? (
        <Alert title="Seller visibility restricted" variant="danger">{profile.suspensionReason}</Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h3 className="flex items-center gap-2 font-semibold text-primary-text"><FileUp className="size-4" /> Verification documents</h3>
          <div className="mt-4 grid gap-3">
            {profile.documents.map((document) => (
              <div key={document.id} className="rounded-md border border-border p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-primary-text">{document.label}</p>
                    <p className="mt-1 text-xs text-secondary-text">{document.fileName ?? "Secure private upload pending"} · {document.status.replaceAll("_", " ")}</p>
                    {document.rejectionReason ? <p className="mt-1 text-xs text-red-700">{document.rejectionReason}</p> : null}
                  </div>
                  <Button type="button" size="sm" variant="secondary" onClick={() => uploadDocument(profile.sellerId, document.type, documentFileNames[document.type])}>
                    <Upload /> Upload
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button className="mt-4" onClick={() => submitKyc(profile.sellerId)}><ShieldCheck /> Submit for review</Button>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h3 className="flex items-center gap-2 font-semibold text-primary-text"><Building2 className="size-4" /> Business identity</h3>
            <div className="mt-3 space-y-3 text-sm">
              <Input value={profile.aadhaarLast4 ? `Aadhaar ending ${profile.aadhaarLast4}` : "Aadhaar not submitted"} readOnly />
              <Input value={profile.panMasked ?? "PAN not submitted"} readOnly />
              <Input value={`${profile.address}, ${profile.pincode}`} readOnly />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h3 className="flex items-center gap-2 font-semibold text-primary-text"><ReceiptText className="size-4" /> GST readiness</h3>
            <p className="mt-2 text-sm text-secondary-text">{profile.gst.gstin ?? "GSTIN pending"} · {profile.gst.status.replaceAll("_", " ")}</p>
            <p className="mt-2 text-xs text-secondary-text">{profile.gst.notes}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h3 className="flex items-center gap-2 font-semibold text-primary-text"><Landmark className="size-4" /> Payout readiness</h3>
            <p className="mt-2 text-sm text-secondary-text">{profile.bank.bankName} · {profile.bank.maskedAccountNumber}</p>
            <p className="mt-2 text-xs text-secondary-text">{profile.bank.notes}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
