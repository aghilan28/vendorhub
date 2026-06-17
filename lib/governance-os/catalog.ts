// KARTEX M5 — Governance catalogs: policy categories, decision types, and the
// source systems that the Governance OS governs (integration with M1–M4).

import type { DecisionType, PolicyCategoryDef, SourceSystem } from "./types";

export const POLICY_CATEGORIES: PolicyCategoryDef[] = [
  { id: "data", name: "Data & Privacy", description: "Data handling, retention, privacy, and protection." },
  { id: "security", name: "Security", description: "Access control, secrets, and security standards." },
  { id: "financial", name: "Financial", description: "Spend authority, payouts, and financial controls." },
  { id: "operational", name: "Operational", description: "Operational standards and service levels." },
  { id: "model", name: "Model & AI", description: "Use of models, simulations, and automated decisions." },
  { id: "compliance", name: "Compliance", description: "Regulatory and platform-policy compliance." },
  { id: "vendor", name: "Vendor & Marketplace", description: "Vendor onboarding, conduct, and enforcement." },
];

export const DECISION_TYPE_META: Record<DecisionType, { label: string; description: string }> = {
  operational: { label: "Operational", description: "Day-to-day operational decision." },
  strategic: { label: "Strategic", description: "Strategic / long-horizon decision." },
  policy_change: { label: "Policy change", description: "Create or amend a policy." },
  exception: { label: "Exception", description: "Grant an exception to a policy." },
  remediation: { label: "Remediation", description: "Remediate a risk or violation." },
  investment: { label: "Investment", description: "Commit budget or resources." },
};

export const SOURCE_SYSTEM_META: Record<SourceSystem, { label: string; description: string }> = {
  research: { label: "Research OS", description: "Decisions arising from research outputs (M1)." },
  knowledge: { label: "Knowledge OS", description: "Decisions arising from knowledge publication (M2)." },
  simulation: { label: "Simulation OS", description: "Decisions arising from simulation outcomes (M3)." },
  secis: { label: "SECIS Platform", description: "Decisions arising from change-impact analysis (M4)." },
  marketplace: { label: "Marketplace", description: "Decisions arising from marketplace operations." },
  internal: { label: "Internal", description: "Internal governance decisions." },
};

export const SOURCE_SYSTEMS: SourceSystem[] = ["research", "knowledge", "simulation", "secis", "marketplace", "internal"];

export const RISK_CATEGORIES = ["Operational", "Financial", "Security", "Compliance", "Reputational", "Model"];
