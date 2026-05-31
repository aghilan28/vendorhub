"use client";

// MCP-1A Phase 2 — Seller Onboarding Wizard.
// Interactive 12-step wizard driven by the deterministic onboarding engine:
// per-step validation, progress tracker, draft saving (localStorage) and a
// submission gate. Works without a backend; persists the draft locally.

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Save, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { ONBOARDING_STEPS, computeProgress, validateStep, type SellerApplicationData } from "@/lib/seller-activation";

const DRAFT_KEY = "vendorhub.seller-onboarding.draft";

type FieldSpec = { key: keyof SellerApplicationData; label: string; type?: "text" | "checkbox" | "select"; options?: string[]; placeholder?: string };

const STEP_FIELDS: Partial<Record<string, FieldSpec[]>> = {
  registration: [
    { key: "ownerName", label: "Owner name", placeholder: "Asha Rao" },
    { key: "email", label: "Email", placeholder: "you@store.com" },
    { key: "phone", label: "Phone", placeholder: "+91 90000 00000" },
  ],
  email_verification: [{ key: "emailVerified", label: "I have verified my email", type: "checkbox" }],
  phone_verification: [{ key: "phoneVerified", label: "I have verified my phone (OTP)", type: "checkbox" }],
  store_creation: [
    { key: "storeName", label: "Store name", placeholder: "FreshLocal Mart" },
    { key: "storeSlug", label: "Store URL slug", placeholder: "freshlocal-mart" },
    { key: "category", label: "Primary category", placeholder: "groceries-staples" },
  ],
  business_info: [
    { key: "businessName", label: "Legal business name", placeholder: "FreshLocal Retail" },
    { key: "businessType", label: "Business type", type: "select", options: ["individual", "proprietorship", "partnership", "private_limited", "llp"] },
  ],
  gst_info: [
    { key: "gstin", label: "GSTIN", placeholder: "29ABCDE1234F1Z5" },
    { key: "gstExempt", label: "GST exempt (turnover below threshold)", type: "checkbox" },
  ],
  address_info: [
    { key: "addressLine1", label: "Address line", placeholder: "12 MG Road" },
    { key: "city", label: "City", placeholder: "Bengaluru" },
    { key: "state", label: "State", placeholder: "Karnataka" },
    { key: "pincode", label: "Pincode", placeholder: "560001" },
  ],
  bank_info: [
    { key: "accountHolder", label: "Account holder", placeholder: "FreshLocal Retail" },
    { key: "accountNumber", label: "Account number", placeholder: "1234567890" },
    { key: "ifsc", label: "IFSC", placeholder: "HDFC0001234" },
  ],
  identity_verification: [{ key: "panNumber", label: "PAN", placeholder: "ABCDE1234F" }],
  store_branding: [
    { key: "logoUrl", label: "Logo URL", placeholder: "https://.../logo.png" },
    { key: "tagline", label: "Tagline", placeholder: "Fresh groceries, delivered fast." },
  ],
  store_configuration: [{ key: "fulfillmentModel", label: "Fulfillment model", type: "select", options: ["self", "marketplace", "hybrid"] }],
};

export function OnboardingWizard({ sampled }: { sampled: boolean }) {
  const [data, setData] = useState<SellerApplicationData>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setData(JSON.parse(raw) as SellerApplicationData);
    } catch {
      /* ignore */
    }
  }, []);

  const progress = useMemo(() => computeProgress(data), [data]);
  const step = ONBOARDING_STEPS[stepIndex];
  const fields = STEP_FIELDS[step.id] ?? [];
  const stepMissing = validateStep(step.id, data);

  function update(key: keyof SellerApplicationData, value: string | boolean) {
    setData((current) => ({ ...current, [key]: value }));
    setSubmitted(false);
  }

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      /* ignore */
    }
  }

  const onDocuments = step.id === "document_upload";
  const onSubmission = step.id === "submission";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary-text">Become a seller</h1>
          <p className="text-sm text-secondary-text">Create your store in {ONBOARDING_STEPS.length - 1} steps — no admin assistance needed.</p>
        </div>
        <Badge variant={sampled ? "warning" : "default"}>{progress.percent}% complete</Badge>
      </div>

      {/* progress tracker */}
      <div className="flex flex-wrap gap-1.5">
        {progress.steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStepIndex(i)}
            className={`focus-ring rounded-full px-2.5 py-1 text-xs transition-colors ${
              i === stepIndex ? "bg-brand text-white" : s.complete ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-secondary-text"
            }`}
          >
            {s.complete ? <Check className="mr-1 inline size-3" /> : null}
            {i + 1}. {s.title}
          </button>
        ))}
      </div>

      <GovernanceCard title={`${stepIndex + 1}. ${step.title}`} description={step.description}>
        {onSubmission ? (
          <div className="space-y-3">
            {progress.readyToSubmit ? (
              <>
                <p className="text-sm text-emerald-700">All steps complete. Your application is ready for review.</p>
                <Button onClick={() => setSubmitted(true)} disabled={submitted}>
                  <Send className="size-4" /> {submitted ? "Submitted for review" : "Submit for review"}
                </Button>
                {submitted ? <p className="text-xs text-secondary-text">An admin will review your store and activate it. You can track status in the Activation Center.</p> : null}
              </>
            ) : (
              <>
                <p className="text-sm text-amber-700">Complete the remaining steps before submitting:</p>
                <ul className="list-inside list-disc text-xs text-secondary-text">
                  {progress.blockers.slice(0, 8).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : onDocuments ? (
          <div className="space-y-3">
            <p className="text-sm text-secondary-text">Upload PAN and bank proof (and GST certificate if applicable).</p>
            <Button
              variant="secondary"
              onClick={() =>
                setData((c) => ({
                  ...c,
                  documents: [
                    { id: "pan", kind: "pan", fileName: "pan.pdf", uploadedAt: new Date().toISOString() },
                    { id: "bank", kind: "bank_proof", fileName: "bank.pdf", uploadedAt: new Date().toISOString() },
                  ],
                }))
              }
            >
              <Save className="size-4" /> {data.documents?.length ? `${data.documents.length} documents attached` : "Attach KYC documents"}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => {
              const value = data[field.key];
              if (field.type === "checkbox") {
                return (
                  <label key={String(field.key)} className="flex items-center gap-2 text-sm text-primary-text sm:col-span-2">
                    <input type="checkbox" checked={Boolean(value)} onChange={(e) => update(field.key, e.target.checked)} className="size-4" />
                    {field.label}
                  </label>
                );
              }
              if (field.type === "select") {
                return (
                  <label key={String(field.key)} className="text-sm">
                    <span className="mb-1 block text-secondary-text">{field.label}</span>
                    <select
                      className="focus-ring h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                      value={typeof value === "string" ? value : ""}
                      onChange={(e) => update(field.key, e.target.value)}
                    >
                      <option value="">Select…</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </label>
                );
              }
              return (
                <label key={String(field.key)} className="text-sm">
                  <span className="mb-1 block text-secondary-text">{field.label}</span>
                  <Input value={typeof value === "string" ? value : ""} placeholder={field.placeholder} onChange={(e) => update(field.key, e.target.value)} className="h-10" />
                </label>
              );
            })}
            {stepMissing.length ? <p className="text-xs text-amber-700 sm:col-span-2">Needed: {stepMissing.join(", ")}</p> : <p className="text-xs text-emerald-700 sm:col-span-2">Step complete.</p>}
          </div>
        )}
      </GovernanceCard>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStepIndex((i) => Math.max(0, i - 1))} disabled={stepIndex === 0}>
          <ChevronLeft className="size-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={saveDraft}>
            <Save className="size-4" /> Save draft
          </Button>
          <Button onClick={() => setStepIndex((i) => Math.min(ONBOARDING_STEPS.length - 1, i + 1))} disabled={stepIndex === ONBOARDING_STEPS.length - 1}>
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      {savedAt ? <p className="text-right text-xs text-secondary-text">Draft saved at {savedAt}</p> : null}
    </div>
  );
}
