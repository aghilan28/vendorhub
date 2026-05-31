// MCP-1A Phase 6 — Seller Activation Center engine (deterministic, pure).
//
// Combines onboarding progress, verification, catalog status, store health and
// trust into a single activation score, a stage, a prioritized task list
// (next-best-action) and a daily briefing. Integrates Seller OS / Trust /
// Intelligence / Transaction signals passed in as plain inputs.

import { computeProgress } from "./onboarding";
import type {
  ActivationStage,
  ActivationTask,
  OnboardingProgress,
  SellerActivationSnapshot,
  SellerApplicationData,
  Severity,
  VerificationDecision,
} from "./types";

export interface ActivationInput {
  sellerId: string;
  storeName: string;
  data: SellerApplicationData;
  applicationState: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "active";
  verification: { score: number; decision: VerificationDecision; passed: number; total: number; escalated: boolean };
  catalog: { products: number; published: number; averageQuality: number };
  trustScore: number;
  // optional Seller OS / transaction signals
  lowStockCount?: number;
  openOrders?: number;
}

function task(id: string, title: string, detail: string, severity: Severity, href: string, done = false): ActivationTask {
  return { id, title, detail, severity, href, done };
}

function deriveStage(progressPercent: number, applicationState: ActivationInput["applicationState"], products: number, published: number): ActivationStage {
  if (applicationState === "active" && published > 0) return "active";
  if (applicationState === "approved" || products > 0) return published > 0 ? "ready" : "building_catalog";
  if (applicationState === "submitted" || applicationState === "under_review") return "verifying";
  if (progressPercent >= 100) return "verifying";
  return "registering";
}

function catalogHealthScore(products: number, published: number, averageQuality: number): number {
  if (products === 0) return 0;
  const publishedRatio = published / products;
  return Math.round(Math.min(100, averageQuality * 0.5 + publishedRatio * 100 * 0.5));
}

export function buildActivationSnapshot(input: ActivationInput): SellerActivationSnapshot {
  const onboarding: OnboardingProgress = computeProgress(input.data);
  const catalogHealth = catalogHealthScore(input.catalog.products, input.catalog.published, input.catalog.averageQuality);

  // Store health blends onboarding completion, verification and catalog.
  const storeHealth = Math.round(onboarding.percent * 0.3 + input.verification.score * 0.35 + catalogHealth * 0.35);

  // Activation score = readiness to operate.
  const activationScore = Math.round(
    onboarding.percent * 0.25 +
      input.verification.score * 0.25 +
      catalogHealth * 0.25 +
      Math.min(100, input.trustScore) * 0.25,
  );

  const stage = deriveStage(onboarding.percent, input.applicationState, input.catalog.products, input.catalog.published);

  // Prioritized tasks (next-best-action).
  const tasks: ActivationTask[] = [];
  if (!onboarding.readyToSubmit) {
    tasks.push(task("finish-onboarding", "Complete onboarding", onboarding.nextStep ? `Next: ${onboarding.nextStep.replace(/_/g, " ")}` : "Finish remaining steps.", "warning", "/seller/onboarding"));
  } else if (input.applicationState === "draft") {
    tasks.push(task("submit-application", "Submit for review", "Your application is ready to submit.", "opportunity", "/seller/onboarding", false));
  }
  if (input.verification.decision === "reject") tasks.push(task("fix-verification", "Resolve verification issues", "Verification failed — correct your KYC details.", "critical", "/seller/onboarding"));
  else if (input.verification.escalated) tasks.push(task("verification-review", "Verification under review", "Your documents are being reviewed.", "watch", "/seller/onboarding", true));
  if (input.catalog.products === 0) tasks.push(task("add-products", "Add your first products", "Import a catalog or create a product to go live.", "warning", "/seller/import"));
  else if (input.catalog.published === 0) tasks.push(task("publish-products", "Publish your catalog", `${input.catalog.products} products are unpublished.`, "warning", "/seller/import"));
  if (input.catalog.products > 0 && input.catalog.averageQuality < 60) tasks.push(task("improve-quality", "Improve listing quality", `Average quality ${input.catalog.averageQuality}/100 — add images and attributes.`, "watch", "/seller/products"));
  if ((input.lowStockCount ?? 0) > 0) tasks.push(task("restock", "Restock low inventory", `${input.lowStockCount} products are low on stock.`, "watch", "/seller/inventory"));
  if ((input.openOrders ?? 0) > 0) tasks.push(task("fulfill-orders", "Fulfil open orders", `${input.openOrders} orders await action.`, "warning", "/seller/fulfillment"));
  if (stage === "active" && tasks.length === 0) tasks.push(task("grow", "Grow your store", "You're live — review intelligence for growth actions.", "opportunity", "/seller/intelligence", true));

  const briefing = buildBriefing(stage, onboarding, input, catalogHealth);

  return {
    sellerId: input.sellerId,
    storeName: input.storeName,
    onboarding,
    verification: input.verification,
    catalog: { ...input.catalog, health: catalogHealth },
    storeHealth,
    trustScore: Math.round(Math.min(100, input.trustScore)),
    activationScore,
    stage,
    tasks: tasks.sort((a, b) => severityRank(b.severity) - severityRank(a.severity)),
    briefing,
  };
}

function severityRank(severity: Severity): number {
  return { critical: 5, warning: 4, watch: 3, opportunity: 2, info: 1 }[severity];
}

function buildBriefing(stage: ActivationStage, onboarding: OnboardingProgress, input: ActivationInput, catalogHealth: number): string[] {
  const lines: string[] = [];
  lines.push(`Stage: ${stage.replace(/_/g, " ")}.`);
  if (!onboarding.readyToSubmit) lines.push(`Onboarding ${onboarding.percent}% complete (${onboarding.completedSteps}/${onboarding.totalSteps} steps).`);
  lines.push(`Verification: ${input.verification.passed}/${input.verification.total} checks passed (${input.verification.decision.replace(/_/g, " ")}).`);
  if (input.catalog.products > 0) lines.push(`Catalog: ${input.catalog.published}/${input.catalog.products} published, health ${catalogHealth}/100.`);
  else lines.push("Catalog: no products yet.");
  return lines;
}
