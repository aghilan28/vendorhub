// KARTEX M8 — Execution Seed Dataset
// A deterministic, internally consistent operational dataset. It links back to
// the upstream intelligence phases (research, knowledge, simulation, SECIS,
// governance) so every execution dashboard renders real data, not placeholders.

import { evaluateKpiStatus, evaluateOutcomeStatus } from "./factory";
import type {
  ActionPlan,
  Decision,
  Dependency,
  Escalation,
  ExecutionDataset,
  ExecutionEvent,
  ExecutionRisk,
  Initiative,
  Intervention,
  KPI,
  Milestone,
  Outcome,
  Owner,
  Program,
  Project,
  Result,
  Retrospective,
  Review,
  Stakeholder,
  Task,
} from "./types";

const T = {
  q1: "2026-02-02T09:00:00.000Z",
  q1b: "2026-02-18T09:00:00.000Z",
  mar: "2026-03-10T09:00:00.000Z",
  apr: "2026-04-08T09:00:00.000Z",
  may: "2026-05-06T09:00:00.000Z",
  now: "2026-05-30T09:00:00.000Z",
  jun: "2026-06-20T09:00:00.000Z",
  jul: "2026-07-15T09:00:00.000Z",
  aug: "2026-08-30T09:00:00.000Z",
};

const owners: Owner[] = [
  { id: "own-amara", name: "Amara Okoye", role: "VP Operations", email: "amara@kartex.io", capacity: 6 },
  { id: "own-li", name: "Li Wen", role: "Program Director", email: "li@kartex.io", capacity: 5 },
  { id: "own-diego", name: "Diego Santos", role: "Initiative Lead", email: "diego@kartex.io", capacity: 4 },
  { id: "own-sara", name: "Sara Haddad", role: "Risk & Governance Lead", email: "sara@kartex.io", capacity: 4 },
  { id: "own-nina", name: "Nina Petrova", role: "Data & KPI Owner", email: "nina@kartex.io", capacity: 5 },
  { id: "own-tom", name: "Tom Becker", role: "Delivery Manager", email: "tom@kartex.io", capacity: 4 },
];

const stakeholders: Stakeholder[] = [
  { id: "stk-ceo", name: "Executive Sponsor", role: "CEO", interest: "accountable" },
  { id: "stk-cfo", name: "Finance", role: "CFO", interest: "consulted" },
  { id: "stk-legal", name: "Governance Board", role: "Legal", interest: "consulted" },
  { id: "stk-ops", name: "Operations Council", role: "Ops", interest: "responsible" },
  { id: "stk-cs", name: "Customer Success", role: "CS", interest: "informed" },
];

const decisions: Decision[] = [
  {
    id: "dec-trust-uplift",
    title: "Raise marketplace trust score above 0.85",
    description:
      "Governance review approved a coordinated trust-uplift program after SECIS flagged seller-verification gaps.",
    source: "governance",
    status: "activated",
    approvedBy: "stk-legal",
    approvedAt: T.q1,
    activatedInitiativeId: "ini-trust",
    recommendedPriority: "high",
  },
  {
    id: "dec-delivery-sla",
    title: "Cut last-mile delivery SLA breaches by 40%",
    description:
      "Simulation showed routing changes reduce breach rate; approved for execution across logistics hubs.",
    source: "simulation",
    status: "activated",
    approvedBy: "stk-ops",
    approvedAt: T.q1b,
    activatedInitiativeId: "ini-delivery",
    recommendedPriority: "high",
  },
  {
    id: "dec-fraud-shield",
    title: "Deploy adaptive fraud-shield on checkout",
    description:
      "SECIS epistemic-security analysis recommends adaptive scoring to contain payment fraud vectors.",
    source: "secis",
    status: "approved",
    approvedBy: "stk-legal",
    approvedAt: T.may,
    activatedInitiativeId: null,
    recommendedPriority: "critical",
  },
  {
    id: "dec-catalog-quality",
    title: "Launch catalog-quality knowledge program",
    description:
      "Knowledge graph drift analysis identified taxonomy decay; approved to fund a remediation initiative.",
    source: "knowledge",
    status: "approved",
    approvedBy: "stk-ops",
    approvedAt: T.may,
    activatedInitiativeId: null,
    recommendedPriority: "medium",
  },
  {
    id: "dec-research-pricing",
    title: "Pilot research-backed dynamic pricing",
    description:
      "Research synthesis indicates elasticity gains; pending sponsor approval before activation.",
    source: "research",
    status: "pending",
    approvedBy: null,
    approvedAt: null,
    activatedInitiativeId: null,
    recommendedPriority: "medium",
  },
];

const programs: Program[] = [
  {
    id: "prg-trust",
    code: "PRG-TRUST",
    name: "Marketplace Trust & Governance",
    description: "Portfolio that raises buyer/seller trust and closes governance findings.",
    status: "executing",
    ownerId: "own-amara",
    sponsorId: "stk-ceo",
    startDate: T.q1,
    targetDate: T.aug,
    initiativeIds: ["ini-trust", "ini-fraud"],
    kpiIds: ["kpi-trust", "kpi-fraud-loss"],
    riskIds: ["risk-verif-backlog", "risk-fraud-model"],
    dependencyIds: ["dep-trust-fraud"],
  },
  {
    id: "prg-logistics",
    code: "PRG-LOGI",
    name: "Logistics Excellence",
    description: "Last-mile reliability, delivery SLA and fulfilment cost reduction.",
    status: "executing",
    ownerId: "own-li",
    sponsorId: "stk-ops",
    startDate: T.q1b,
    targetDate: T.jul,
    initiativeIds: ["ini-delivery", "ini-fulfil"],
    kpiIds: ["kpi-sla", "kpi-cost"],
    riskIds: ["risk-carrier"],
    dependencyIds: ["dep-delivery-data"],
  },
  {
    id: "prg-catalog",
    code: "PRG-CAT",
    name: "Catalog & Knowledge Quality",
    description: "Taxonomy integrity, content quality and search relevance.",
    status: "planned",
    ownerId: "own-nina",
    sponsorId: "stk-ops",
    startDate: T.may,
    targetDate: T.aug,
    initiativeIds: ["ini-catalog"],
    kpiIds: ["kpi-search"],
    riskIds: ["risk-taxonomy"],
    dependencyIds: [],
  },
];

const initiatives: Initiative[] = [
  {
    id: "ini-trust",
    code: "INI-TRUST",
    name: "Trust Uplift",
    description: "Coordinated seller verification and trust-score remediation.",
    status: "executing",
    programId: "prg-trust",
    ownerId: "own-sara",
    teamIds: ["own-sara", "own-nina"],
    actionPlanIds: ["ap-verif", "ap-trust-comms"],
    kpiIds: ["kpi-trust"],
    decisionId: "dec-trust-uplift",
    startDate: T.q1,
    targetDate: T.jul,
    progress: 62,
  },
  {
    id: "ini-fraud",
    code: "INI-FRAUD",
    name: "Adaptive Fraud Shield",
    description: "Adaptive checkout fraud scoring and containment.",
    status: "approved",
    programId: "prg-trust",
    ownerId: "own-sara",
    teamIds: ["own-sara"],
    actionPlanIds: ["ap-fraud-model"],
    kpiIds: ["kpi-fraud-loss"],
    decisionId: null,
    startDate: T.may,
    targetDate: T.aug,
    progress: 18,
  },
  {
    id: "ini-delivery",
    code: "INI-DELIV",
    name: "Delivery SLA Recovery",
    description: "Routing and carrier changes to cut SLA breaches.",
    status: "executing",
    programId: "prg-logistics",
    ownerId: "own-diego",
    teamIds: ["own-diego", "own-tom"],
    actionPlanIds: ["ap-routing", "ap-carrier"],
    kpiIds: ["kpi-sla"],
    decisionId: "dec-delivery-sla",
    startDate: T.q1b,
    targetDate: T.jun,
    progress: 74,
  },
  {
    id: "ini-fulfil",
    code: "INI-FULFIL",
    name: "Fulfilment Cost Reduction",
    description: "Warehouse slotting and packaging optimisation.",
    status: "blocked",
    programId: "prg-logistics",
    ownerId: "own-tom",
    teamIds: ["own-tom"],
    actionPlanIds: ["ap-slotting"],
    kpiIds: ["kpi-cost"],
    decisionId: null,
    startDate: T.mar,
    targetDate: T.jul,
    progress: 41,
  },
  {
    id: "ini-catalog",
    code: "INI-CAT",
    name: "Catalog Quality Remediation",
    description: "Taxonomy repair and content enrichment.",
    status: "planned",
    programId: "prg-catalog",
    ownerId: "own-nina",
    teamIds: ["own-nina"],
    actionPlanIds: ["ap-taxonomy"],
    kpiIds: ["kpi-search"],
    decisionId: null,
    startDate: T.may,
    targetDate: T.aug,
    progress: 8,
  },
];

const actionPlans: ActionPlan[] = [
  {
    id: "ap-verif",
    code: "AP-VERIFICATION",
    title: "Re-verify high-risk sellers",
    description: "Run enhanced verification on the 1,200 highest-risk sellers.",
    status: "executing",
    priority: "high",
    ownerId: "own-sara",
    initiativeId: "ini-trust",
    deadline: T.jun,
    progress: 70,
    taskIds: ["tsk-verif-1", "tsk-verif-2", "tsk-verif-3"],
    links: [
      { source: "secis", refId: "secis-verif-gap", label: "SECIS: verification gap" },
      { source: "governance", refId: "dec-trust-uplift", label: "Governance decision" },
    ],
    createdAt: T.q1,
    updatedAt: T.now,
  },
  {
    id: "ap-trust-comms",
    code: "AP-TRUSTCOMMS",
    title: "Buyer trust communication rollout",
    description: "Publish verified-seller badges and trust messaging.",
    status: "planned",
    priority: "medium",
    ownerId: "own-nina",
    initiativeId: "ini-trust",
    deadline: T.jul,
    progress: 20,
    taskIds: ["tsk-comms-1"],
    links: [{ source: "knowledge", refId: "kb-trust-msg", label: "Knowledge: trust messaging" }],
    createdAt: T.mar,
    updatedAt: T.may,
  },
  {
    id: "ap-fraud-model",
    code: "AP-FRAUDMODEL",
    title: "Ship adaptive fraud scoring model",
    description: "Train, validate and deploy adaptive checkout scoring.",
    status: "approved",
    priority: "critical",
    ownerId: "own-sara",
    initiativeId: "ini-fraud",
    deadline: T.aug,
    progress: 15,
    taskIds: ["tsk-fraud-1"],
    links: [{ source: "secis", refId: "secis-fraud", label: "SECIS: fraud vectors" }],
    createdAt: T.may,
    updatedAt: T.may,
  },
  {
    id: "ap-routing",
    code: "AP-ROUTING",
    title: "Deploy optimised delivery routing",
    description: "Roll out simulation-validated routing to 8 hubs.",
    status: "executing",
    priority: "high",
    ownerId: "own-diego",
    initiativeId: "ini-delivery",
    deadline: T.jun,
    progress: 85,
    taskIds: ["tsk-route-1", "tsk-route-2"],
    links: [{ source: "simulation", refId: "sim-routing", label: "Simulation: routing model" }],
    createdAt: T.q1b,
    updatedAt: T.now,
  },
  {
    id: "ap-carrier",
    code: "AP-CARRIER",
    title: "Re-balance carrier mix",
    description: "Shift volume to higher-reliability carriers in 3 regions.",
    status: "executing",
    priority: "medium",
    ownerId: "own-tom",
    initiativeId: "ini-delivery",
    deadline: T.jun,
    progress: 55,
    taskIds: ["tsk-carrier-1"],
    links: [],
    createdAt: T.apr,
    updatedAt: T.now,
  },
  {
    id: "ap-slotting",
    code: "AP-SLOTTING",
    title: "Warehouse slotting optimisation",
    description: "Re-slot top SKUs to reduce pick travel.",
    status: "blocked",
    priority: "medium",
    ownerId: "own-tom",
    initiativeId: "ini-fulfil",
    deadline: T.jul,
    progress: 40,
    taskIds: ["tsk-slot-1"],
    links: [{ source: "research", refId: "res-slotting", label: "Research: slotting heuristics" }],
    createdAt: T.mar,
    updatedAt: T.may,
  },
  {
    id: "ap-taxonomy",
    code: "AP-TAXONOMY",
    title: "Repair category taxonomy drift",
    description: "Remediate decayed taxonomy nodes flagged by knowledge graph.",
    status: "draft",
    priority: "medium",
    ownerId: "own-nina",
    initiativeId: "ini-catalog",
    deadline: T.aug,
    progress: 0,
    taskIds: [],
    links: [{ source: "knowledge", refId: "kb-taxonomy-drift", label: "Knowledge: taxonomy drift" }],
    createdAt: T.may,
    updatedAt: T.may,
  },
];

const tasks: Task[] = [
  { id: "tsk-verif-1", title: "Build verification queue", status: "completed", ownerId: "own-sara", actionPlanId: "ap-verif", estimateHours: 24, completed: true },
  { id: "tsk-verif-2", title: "Process tier-1 sellers", status: "executing", ownerId: "own-sara", actionPlanId: "ap-verif", estimateHours: 40, completed: false },
  { id: "tsk-verif-3", title: "Process tier-2 sellers", status: "planned", ownerId: "own-nina", actionPlanId: "ap-verif", estimateHours: 40, completed: false },
  { id: "tsk-comms-1", title: "Design trust badge", status: "planned", ownerId: "own-nina", actionPlanId: "ap-trust-comms", estimateHours: 16, completed: false },
  { id: "tsk-fraud-1", title: "Assemble training dataset", status: "approved", ownerId: "own-sara", actionPlanId: "ap-fraud-model", estimateHours: 32, completed: false },
  { id: "tsk-route-1", title: "Integrate routing engine", status: "completed", ownerId: "own-diego", actionPlanId: "ap-routing", estimateHours: 48, completed: true },
  { id: "tsk-route-2", title: "Hub-by-hub rollout", status: "executing", ownerId: "own-diego", actionPlanId: "ap-routing", estimateHours: 36, completed: false },
  { id: "tsk-carrier-1", title: "Negotiate carrier SLAs", status: "executing", ownerId: "own-tom", actionPlanId: "ap-carrier", estimateHours: 20, completed: false },
  { id: "tsk-slot-1", title: "Model slotting plan", status: "blocked", ownerId: "own-tom", actionPlanId: "ap-slotting", estimateHours: 28, completed: false },
];

const milestones: Milestone[] = [
  { id: "ms-verif-50", name: "50% high-risk sellers re-verified", dueDate: T.may, status: "met", initiativeId: "ini-trust" },
  { id: "ms-verif-100", name: "100% high-risk sellers re-verified", dueDate: T.jun, status: "upcoming", initiativeId: "ini-trust" },
  { id: "ms-route-pilot", name: "Routing pilot live in 4 hubs", dueDate: T.apr, status: "met", initiativeId: "ini-delivery" },
  { id: "ms-route-full", name: "Routing live in all hubs", dueDate: T.jun, status: "at_risk", initiativeId: "ini-delivery" },
  { id: "ms-slot-plan", name: "Slotting plan approved", dueDate: T.may, status: "missed", initiativeId: "ini-fulfil" },
  { id: "ms-cat-scope", name: "Catalog remediation scoped", dueDate: T.jun, status: "upcoming", initiativeId: "ini-catalog" },
];

const projects: Project[] = [
  { id: "proj-verif", name: "Seller Verification Delivery", status: "executing", initiativeId: "ini-trust", ownerId: "own-sara", taskIds: ["tsk-verif-1", "tsk-verif-2", "tsk-verif-3"], milestoneIds: ["ms-verif-50", "ms-verif-100"] },
  { id: "proj-routing", name: "Routing Rollout", status: "executing", initiativeId: "ini-delivery", ownerId: "own-diego", taskIds: ["tsk-route-1", "tsk-route-2"], milestoneIds: ["ms-route-pilot", "ms-route-full"] },
  { id: "proj-slotting", name: "Slotting Programme", status: "blocked", initiativeId: "ini-fulfil", ownerId: "own-tom", taskIds: ["tsk-slot-1"], milestoneIds: ["ms-slot-plan"] },
];

function kpi(
  partial: Omit<KPI, "status" | "trend"> & { trend: number[] },
): KPI {
  return {
    ...partial,
    status: evaluateKpiStatus(partial.current, partial.target, partial.direction),
    trend: partial.trend,
  };
}

const kpis: KPI[] = [
  kpi({ id: "kpi-trust", code: "KPI-TRUST", name: "Marketplace trust score", ownerId: "own-sara", programId: "prg-trust", unit: "score", target: 0.85, current: 0.82, direction: "increase", trend: [0.74, 0.77, 0.79, 0.81, 0.82] }),
  kpi({ id: "kpi-fraud-loss", code: "KPI-FRAUD", name: "Fraud loss rate", ownerId: "own-sara", programId: "prg-trust", unit: "%", target: 0.4, current: 0.61, direction: "decrease", trend: [0.9, 0.82, 0.74, 0.66, 0.61] }),
  kpi({ id: "kpi-sla", code: "KPI-SLA", name: "Delivery SLA attainment", ownerId: "own-diego", programId: "prg-logistics", unit: "%", target: 95, current: 93, direction: "increase", trend: [86, 88, 90, 92, 93] }),
  kpi({ id: "kpi-cost", code: "KPI-COST", name: "Fulfilment cost per order", ownerId: "own-tom", programId: "prg-logistics", unit: "USD", target: 4.2, current: 5.1, direction: "decrease", trend: [5.6, 5.5, 5.3, 5.2, 5.1] }),
  kpi({ id: "kpi-search", code: "KPI-SEARCH", name: "Search relevance score", ownerId: "own-nina", programId: "prg-catalog", unit: "score", target: 0.9, current: 0.78, direction: "increase", trend: [0.76, 0.77, 0.77, 0.78, 0.78] }),
];

const outcomes: Outcome[] = [
  { id: "out-trust", initiativeId: "ini-trust", metric: "Trust score uplift", unit: "score", expected: 0.85, actual: 0.82, recordedAt: T.now, status: evaluateOutcomeStatus(0.85, 0.82) },
  { id: "out-delivery", initiativeId: "ini-delivery", metric: "SLA breach reduction", unit: "%", expected: 40, actual: 33, recordedAt: T.now, status: evaluateOutcomeStatus(40, 33) },
  { id: "out-fulfil", initiativeId: "ini-fulfil", metric: "Cost per order reduction", unit: "%", expected: 18, actual: 9, recordedAt: T.may, status: evaluateOutcomeStatus(18, 9) },
  { id: "out-catalog", initiativeId: "ini-catalog", metric: "Relevance uplift", unit: "%", expected: 12, actual: null, recordedAt: null, status: "pending" },
];

const results: Result[] = [
  { id: "res-route-pilot", initiativeId: "ini-delivery", summary: "Routing pilot reduced breaches by 21% across 4 hubs.", success: true, recordedAt: T.apr },
  { id: "res-verif-wave1", initiativeId: "ini-trust", summary: "First verification wave cleared 640 high-risk sellers.", success: true, recordedAt: T.may },
];

const reviews: Review[] = [
  { id: "rev-trust", entityType: "initiative", entityId: "ini-trust", reviewerId: "own-amara", rating: 4, notes: "On track; watch verification throughput.", date: T.may },
  { id: "rev-fulfil", entityType: "initiative", entityId: "ini-fulfil", reviewerId: "own-li", rating: 2, notes: "Blocked on slotting data; needs intervention.", date: T.may },
];

const retrospectives: Retrospective[] = [
  {
    id: "retro-route-pilot",
    initiativeId: "ini-delivery",
    wentWell: ["Simulation translated cleanly to production", "Hub teams engaged early"],
    improve: ["Carrier onboarding was slow", "Data latency in 2 hubs"],
    followUps: ["Pre-negotiate carrier SLAs", "Add hub data monitors"],
    date: T.may,
  },
];

const escalations: Escalation[] = [
  { id: "esc-slotting", title: "Slotting plan blocked on warehouse data", severity: "high", reason: "Source data export unavailable for 3 weeks.", sourceType: "initiative", sourceId: "ini-fulfil", status: "open", ownerId: "own-tom", interventionIds: ["itv-slotting"], createdAt: T.may },
  { id: "esc-route-milestone", title: "Routing full-rollout milestone at risk", severity: "medium", reason: "Two hubs behind on integration.", sourceType: "milestone", sourceId: "ms-route-full", status: "acknowledged", ownerId: "own-diego", interventionIds: [], createdAt: T.may },
  { id: "esc-fraud-priority", title: "Fraud loss rate above tolerance", severity: "critical", reason: "Fraud KPI off-track; loss rate 0.61% vs 0.40% target.", sourceType: "initiative", sourceId: "ini-fraud", status: "open", ownerId: "own-sara", interventionIds: [], createdAt: T.now },
];

const interventions: Intervention[] = [
  { id: "itv-slotting", escalationId: "esc-slotting", action: "Request manual data extract from warehouse ops", ownerId: "own-tom", date: T.may },
];

const risks: ExecutionRisk[] = [
  { id: "risk-verif-backlog", title: "Verification backlog overruns deadline", likelihood: 3, impact: 4, score: 12, status: "mitigating", ownerId: "own-sara", programId: "prg-trust", mitigation: "Add temporary verification capacity." },
  { id: "risk-fraud-model", title: "Fraud model underperforms in production", likelihood: 3, impact: 5, score: 15, status: "open", ownerId: "own-sara", programId: "prg-trust", mitigation: "Shadow-deploy before full cutover." },
  { id: "risk-carrier", title: "Carrier SLA renegotiation delayed", likelihood: 2, impact: 3, score: 6, status: "open", ownerId: "own-tom", programId: "prg-logistics", mitigation: "Escalate to procurement." },
  { id: "risk-taxonomy", title: "Taxonomy repair scope larger than estimated", likelihood: 3, impact: 3, score: 9, status: "open", ownerId: "own-nina", programId: "prg-catalog", mitigation: "Phase remediation by category volume." },
];

const dependencies: Dependency[] = [
  { id: "dep-trust-fraud", fromId: "ini-fraud", toId: "ini-trust", type: "relates", status: "open" },
  { id: "dep-delivery-data", fromId: "ini-delivery", toId: "ini-fulfil", type: "requires", status: "open" },
];

const events: ExecutionEvent[] = [
  { id: "evt-1", entityType: "decision", entityId: "dec-trust-uplift", type: "decision_activated", actorId: "own-amara", actorName: "Amara Okoye", note: "Activated trust decision into INI-TRUST.", timestamp: T.q1 },
  { id: "evt-2", entityType: "initiative", entityId: "ini-delivery", type: "transition", fromStatus: "approved", toStatus: "executing", actorId: "own-diego", actorName: "Diego Santos", note: "Approved -> Executing", timestamp: T.q1b },
  { id: "evt-3", entityType: "actionPlan", entityId: "ap-routing", type: "transition", fromStatus: "approved", toStatus: "executing", actorId: "own-diego", actorName: "Diego Santos", note: "Approved -> Executing", timestamp: T.mar },
  { id: "evt-4", entityType: "initiative", entityId: "ini-fulfil", type: "transition", fromStatus: "executing", toStatus: "blocked", actorId: "own-tom", actorName: "Tom Becker", note: "Blocked on warehouse data.", timestamp: T.may },
  { id: "evt-5", entityType: "escalation", entityId: "esc-fraud-priority", type: "escalated", actorId: "own-sara", actorName: "Sara Haddad", note: "Fraud KPI breached tolerance.", timestamp: T.now },
];

/** Returns a fresh, deep copy of the deterministic seed dataset. */
export function buildSeedDataset(): ExecutionDataset {
  return structuredClone({
    owners,
    stakeholders,
    programs,
    initiatives,
    projects,
    actionPlans,
    tasks,
    milestones,
    kpis,
    outcomes,
    results,
    reviews,
    retrospectives,
    escalations,
    interventions,
    risks,
    dependencies,
    decisions,
    events,
  });
}
