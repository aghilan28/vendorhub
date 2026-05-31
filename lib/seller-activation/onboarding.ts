// MCP-1A Phase 2 — Seller Onboarding engine (deterministic, pure).
//
// The 12-step onboarding flow with per-step validation, progress tracking,
// draft completeness and a guarded application state machine
// (draft → submitted → under_review → approved/rejected → active).

import type {
  ApplicationEvent,
  ApplicationState,
  OnboardingProgress,
  OnboardingStepDef,
  OnboardingStepId,
  SellerApplication,
  SellerApplicationData,
  StepStatus,
} from "./types";

export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  { id: "registration", title: "Registration", description: "Owner name, email and phone.", requiredFields: ["ownerName", "email", "phone"] },
  { id: "email_verification", title: "Email verification", description: "Confirm your email address.", requiredFields: ["emailVerified"] },
  { id: "phone_verification", title: "Phone verification", description: "Confirm your phone via OTP.", requiredFields: ["phoneVerified"] },
  { id: "store_creation", title: "Store creation", description: "Store name, URL and primary category.", requiredFields: ["storeName", "storeSlug", "category"] },
  { id: "business_info", title: "Business information", description: "Legal business name and type.", requiredFields: ["businessName", "businessType"] },
  { id: "gst_info", title: "GST information", description: "GSTIN (or declare exemption).", requiredFields: ["gstin"] },
  { id: "address_info", title: "Address", description: "Registered business address.", requiredFields: ["addressLine1", "city", "state", "pincode"] },
  { id: "bank_info", title: "Bank account", description: "Settlement bank account.", requiredFields: ["accountNumber", "ifsc", "accountHolder"] },
  { id: "identity_verification", title: "Identity verification", description: "PAN for KYC.", requiredFields: ["panNumber"] },
  { id: "document_upload", title: "Documents", description: "Upload KYC documents.", requiredFields: ["documents"] },
  { id: "store_branding", title: "Store branding", description: "Logo, banner and tagline.", requiredFields: ["logoUrl", "tagline"] },
  { id: "store_configuration", title: "Store configuration", description: "Fulfillment model and returns policy.", requiredFields: ["fulfillmentModel"] },
  { id: "submission", title: "Submit for review", description: "Send your application to the marketplace team.", requiredFields: [] },
];

function isFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return value === true;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** Validate a single step against the application data, returning missing fields. */
export function validateStep(stepId: OnboardingStepId, data: SellerApplicationData): string[] {
  const step = ONBOARDING_STEPS.find((s) => s.id === stepId);
  if (!step) return [];

  // GST step is satisfiable by an exemption declaration.
  if (stepId === "gst_info" && data.gstExempt) return [];

  const missing: string[] = [];
  for (const field of step.requiredFields) {
    if (!isFilled((data as Record<string, unknown>)[field])) missing.push(field);
  }

  // Format checks (warnings surface via verification; here we hard-require valid shape).
  if (stepId === "gst_info" && !data.gstExempt && data.gstin && !isValidGstin(data.gstin)) missing.push("gstin");
  if (stepId === "identity_verification" && data.panNumber && !isValidPan(data.panNumber)) missing.push("panNumber");
  if (stepId === "address_info" && data.pincode && !/^[0-9]{6}$/.test(data.pincode)) missing.push("pincode");
  if (stepId === "bank_info" && data.ifsc && !isValidIfsc(data.ifsc)) missing.push("ifsc");
  if (stepId === "registration" && data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) missing.push("email");

  return [...new Set(missing)];
}

export function isValidGstin(value: string): boolean {
  // 15 chars: 2 state digits + 10 PAN + 1 entity + Z + 1 checksum char.
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(value.toUpperCase());
}
export function isValidPan(value: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.toUpperCase());
}
export function isValidIfsc(value: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.toUpperCase());
}

/** Compute progress across all steps. */
export function computeProgress(data: SellerApplicationData): OnboardingProgress {
  const steps: StepStatus[] = ONBOARDING_STEPS.map((step) => {
    if (step.id === "submission") {
      // submission is "complete" only when every prior step is complete
      const priorComplete = ONBOARDING_STEPS.filter((s) => s.id !== "submission").every((s) => validateStep(s.id, data).length === 0);
      return { id: step.id, title: step.title, complete: priorComplete, missing: priorComplete ? [] : ["complete all previous steps"] };
    }
    const missing = validateStep(step.id, data);
    return { id: step.id, title: step.title, complete: missing.length === 0, missing };
  });

  const actionable = steps.filter((s) => s.id !== "submission");
  const completedSteps = actionable.filter((s) => s.complete).length;
  const totalSteps = actionable.length;
  const percent = Math.round((completedSteps / totalSteps) * 100);
  const nextStepStatus = steps.find((s) => !s.complete);
  const readyToSubmit = actionable.every((s) => s.complete);
  const blockers = steps.filter((s) => !s.complete && s.id !== "submission").flatMap((s) => s.missing.map((m) => `${s.title}: ${m}`));

  return {
    steps,
    completedSteps,
    totalSteps,
    percent,
    readyToSubmit,
    nextStep: nextStepStatus ? nextStepStatus.id : null,
    blockers,
  };
}

// ── Application state machine ─────────────────────────────────────────────────

const TRANSITIONS: Record<ApplicationState, ApplicationState[]> = {
  draft: ["submitted"],
  submitted: ["under_review", "rejected"],
  under_review: ["approved", "rejected"],
  approved: ["active"],
  rejected: ["draft", "submitted"],
  active: [],
};

export function canTransitionApplication(from: ApplicationState, to: ApplicationState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

let evtCounter = 0;

export interface ApplicationTransitionResult {
  ok: boolean;
  application: SellerApplication;
  error?: string;
}

/** Apply a guarded application transition (pure, returns a new application). */
export function transitionApplication(
  application: SellerApplication,
  to: ApplicationState,
  actor: ApplicationEvent["actor"],
  note: string,
  at?: string,
): ApplicationTransitionResult {
  if (!canTransitionApplication(application.state, to)) {
    return { ok: false, application, error: `Illegal application transition ${application.state} → ${to}` };
  }
  // Gate: can only submit when ready.
  if (to === "submitted" && !computeProgress(application.data).readyToSubmit) {
    return { ok: false, application, error: "Cannot submit: onboarding is incomplete." };
  }
  const stamp = at ?? new Date().toISOString();
  evtCounter += 1;
  const event: ApplicationEvent = { id: `app-evt-${stamp}-${evtCounter}`, from: application.state, to, actor, note, at: stamp };
  return {
    ok: true,
    application: {
      ...application,
      state: to,
      updatedAt: stamp,
      submittedAt: to === "submitted" ? stamp : application.submittedAt,
      reviewedAt: to === "approved" || to === "rejected" ? stamp : application.reviewedAt,
      rejectionReason: to === "rejected" ? note : application.rejectionReason,
      events: [...application.events, event],
    },
  };
}

export function createApplication(ownerId: string, data: SellerApplicationData = {}, at?: string): SellerApplication {
  const stamp = at ?? new Date().toISOString();
  return { id: `app-${ownerId}`, ownerId, state: "draft", data, createdAt: stamp, updatedAt: stamp, events: [] };
}
