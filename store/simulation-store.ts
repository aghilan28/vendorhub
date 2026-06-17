"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BUILT_IN_TEMPLATES,
  defaultParameters,
  deriveInsights,
  getTemplate,
  getTemplateByModel,
  runSimulationModel,
} from "@/lib/simulation";
import type {
  HistoryAction,
  Simulation,
  SimulationApproval,
  SimulationAssumption,
  SimulationComparison,
  SimulationConstraint,
  SimulationContributor,
  SimulationDecision,
  SimulationHistoryEvent,
  SimulationInsight,
  SimulationRecommendation,
  SimulationReview,
  SimulationRun,
  SimulationScenario,
  SimulationSettings,
  SimulationTemplate,
  SimulationUser,
  SimulationVersion,
  Visibility,
  WorkflowState,
} from "@/lib/simulation";

// ──────────────────────────────────────────────────────────────────────────
// id + time helpers (deterministic for seed, fresh for user actions)
// ──────────────────────────────────────────────────────────────────────────

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function now(): string {
  return new Date().toISOString();
}

// Fixed seed timestamps so server + client initial render agree.
const SEED_BASE = Date.parse("2026-05-20T09:00:00.000Z");
function seedTime(offsetMinutes: number): string {
  return new Date(SEED_BASE + offsetMinutes * 60_000).toISOString();
}

// ──────────────────────────────────────────────────────────────────────────
// Users / RBAC
// ──────────────────────────────────────────────────────────────────────────

const SEED_USERS: SimulationUser[] = [
  { id: "u_maya", name: "Maya Rao", role: "admin" },
  { id: "u_arjun", name: "Arjun Verma", role: "analyst" },
  { id: "u_lena", name: "Lena Park", role: "reviewer" },
  { id: "u_sam", name: "Sam Doe", role: "viewer" },
];

const DEFAULT_SETTINGS: SimulationSettings = {
  defaultVisibility: "team",
  requireApprovalBeforeRun: false,
  defaultSeed: 20260530,
  retainRuns: 200,
  autoGenerateInsights: true,
};

// ──────────────────────────────────────────────────────────────────────────
// Seed construction
// ──────────────────────────────────────────────────────────────────────────

interface SeedBundle {
  simulations: Simulation[];
  scenarios: SimulationScenario[];
  runs: SimulationRun[];
  insights: SimulationInsight[];
  recommendations: SimulationRecommendation[];
  comparisons: SimulationComparison[];
  decisions: SimulationDecision[];
  reviews: SimulationReview[];
  approvals: SimulationApproval[];
  versions: SimulationVersion[];
  history: SimulationHistoryEvent[];
}

function makeScenario(
  partial: Pick<SimulationScenario, "id" | "simulationId" | "name" | "description" | "templateId" | "category" | "tags"> & {
    paramOverrides?: Record<string, number | string>;
    isBaseline?: boolean;
    seed?: number;
    createdMin: number;
  },
): SimulationScenario {
  const template = getTemplate(partial.templateId)!;
  return {
    id: partial.id,
    simulationId: partial.simulationId,
    name: partial.name,
    description: partial.description,
    templateId: partial.templateId,
    modelKey: template.modelKey,
    parameters: { ...defaultParameters(template), ...(partial.paramOverrides ?? {}) },
    assumptions: template.defaultAssumptions.map((statement, i) => ({
      id: `${partial.id}_asm_${i}`,
      statement,
      confidence: "medium" as const,
      createdAt: seedTime(partial.createdMin),
    })),
    constraints: template.defaultConstraints.map((c, i) => ({ id: `${partial.id}_con_${i}`, ...c })),
    category: partial.category,
    tags: partial.tags,
    seed: partial.seed ?? DEFAULT_SETTINGS.defaultSeed,
    status: "active",
    isBaseline: partial.isBaseline ?? false,
    createdBy: "u_arjun",
    createdAt: seedTime(partial.createdMin),
    updatedAt: seedTime(partial.createdMin),
  };
}

function buildCompletedRun(
  scenario: SimulationScenario,
  label: string,
  triggeredBy: string,
  startedMin: number,
): { run: SimulationRun; insights: SimulationInsight[]; recommendations: SimulationRecommendation[] } {
  const result = runSimulationModel(scenario.modelKey, scenario.parameters, scenario.seed, scenario.constraints);
  const derived = deriveInsights(scenario.modelKey, result, scenario.name);
  const runId = `run_${scenario.id}_${startedMin}`;
  const insights: SimulationInsight[] = derived.insights.map((d, i) => ({
    id: `${runId}_ins_${i}`,
    runId,
    simulationId: scenario.simulationId,
    scenarioId: scenario.id,
    kind: d.kind,
    title: d.title,
    detail: d.detail,
    confidence: d.confidence,
    createdAt: seedTime(startedMin + 1),
  }));
  const recommendations: SimulationRecommendation[] = derived.recommendations.map((d, i) => ({
    id: `${runId}_rec_${i}`,
    runId,
    simulationId: scenario.simulationId,
    scenarioId: scenario.id,
    title: d.title,
    action: d.action,
    rationale: d.rationale,
    expectedImpact: d.expectedImpact,
    priority: d.priority,
    createdAt: seedTime(startedMin + 1),
  }));
  const run: SimulationRun = {
    id: runId,
    simulationId: scenario.simulationId,
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    modelKey: scenario.modelKey,
    label,
    status: "completed",
    progress: 100,
    seed: scenario.seed,
    parameters: { ...scenario.parameters },
    startedAt: seedTime(startedMin),
    completedAt: seedTime(startedMin + 1),
    runtimeMs: 1200 + (startedMin % 7) * 130,
    triggeredBy,
    logs: [
      { at: seedTime(startedMin), level: "info", message: "Run started" },
      { at: seedTime(startedMin), level: "info", message: "Executing model iterations" },
      { at: seedTime(startedMin + 1), level: "info", message: "Run completed" },
    ],
    result,
    insightIds: insights.map((i) => i.id),
    recommendationIds: recommendations.map((r) => r.id),
  };
  return { run, insights, recommendations };
}

function buildSeed(): SeedBundle {
  const simulations: Simulation[] = [
    {
      id: "sim_launch",
      name: "Q3 Vendor Onboarding Launch",
      description: "Adoption forecast for the new hyperlocal vendor onboarding campaign.",
      category: "Growth",
      tags: ["launch", "adoption", "q3"],
      modelKey: "market_adoption",
      ownerId: "u_arjun",
      ownerName: "Arjun Verma",
      visibility: "team",
      workflowState: "completed",
      version: 2,
      contributors: [
        { userId: "u_arjun", name: "Arjun Verma", role: "owner", addedAt: seedTime(0) },
        { userId: "u_lena", name: "Lena Park", role: "reviewer", addedAt: seedTime(2) },
      ],
      createdAt: seedTime(0),
      updatedAt: seedTime(60),
    },
    {
      id: "sim_pricing",
      name: "Festive Pricing Strategy",
      description: "Find the profit-optimal price for the festive grocery basket.",
      category: "Pricing",
      tags: ["pricing", "festive", "margin"],
      modelKey: "pricing_sensitivity",
      ownerId: "u_arjun",
      ownerName: "Arjun Verma",
      visibility: "organization",
      workflowState: "approved",
      version: 1,
      contributors: [{ userId: "u_arjun", name: "Arjun Verma", role: "owner", addedAt: seedTime(10) }],
      createdAt: seedTime(10),
      updatedAt: seedTime(40),
    },
    {
      id: "sim_revenue",
      name: "FY27 Revenue Plan",
      description: "Monte-Carlo revenue and profit projection for the next fiscal year.",
      category: "Finance",
      tags: ["revenue", "fy27", "risk"],
      modelKey: "revenue_projection",
      ownerId: "u_maya",
      ownerName: "Maya Rao",
      visibility: "organization",
      workflowState: "review",
      version: 1,
      contributors: [
        { userId: "u_maya", name: "Maya Rao", role: "owner", addedAt: seedTime(20) },
        { userId: "u_arjun", name: "Arjun Verma", role: "editor", addedAt: seedTime(21) },
      ],
      createdAt: seedTime(20),
      updatedAt: seedTime(35),
    },
  ];

  const scenarios: SimulationScenario[] = [
    makeScenario({ id: "scn_launch_base", simulationId: "sim_launch", name: "Baseline launch", description: "Expected adoption with planned marketing spend.", templateId: "tpl-market-adoption", category: "Growth", tags: ["baseline"], isBaseline: true, createdMin: 1 }),
    makeScenario({ id: "scn_launch_aggr", simulationId: "sim_launch", name: "Aggressive referral", description: "Higher word-of-mouth via referral incentives.", templateId: "tpl-market-adoption", category: "Growth", tags: ["referral"], paramOverrides: { imitation: 55, innovation: 4 }, createdMin: 5, seed: 20260531 }),
    makeScenario({ id: "scn_pricing_base", simulationId: "sim_pricing", name: "Festive basket sweep", description: "Price sweep for the festive basket.", templateId: "tpl-pricing-sensitivity", category: "Pricing", tags: ["baseline"], isBaseline: true, paramOverrides: { basePrice: 549, costPerUnit: 240, priceMin: 350, priceMax: 950 }, createdMin: 11 }),
    makeScenario({ id: "scn_revenue_base", simulationId: "sim_revenue", name: "Central revenue case", description: "Planning central case.", templateId: "tpl-revenue-projection", category: "Finance", tags: ["baseline"], isBaseline: true, createdMin: 21 }),
  ];

  const runResults = [
    buildCompletedRun(scenarios[0], "Baseline launch · run 1", "u_arjun", 30),
    buildCompletedRun(scenarios[1], "Aggressive referral · run 1", "u_arjun", 45),
    buildCompletedRun(scenarios[2], "Festive basket sweep · run 1", "u_arjun", 40),
    buildCompletedRun(scenarios[3], "Central revenue case · run 1", "u_maya", 34),
  ];

  const runs = runResults.map((r) => r.run);
  const insights = runResults.flatMap((r) => r.insights);
  const recommendations = runResults.flatMap((r) => r.recommendations);

  const comparisons: SimulationComparison[] = [
    {
      id: "cmp_launch",
      name: "Baseline vs Aggressive referral",
      runIds: [runs[0].id, runs[1].id],
      createdBy: "u_arjun",
      createdAt: seedTime(50),
      note: "Comparing planned launch against a referral-driven scenario.",
    },
  ];

  const decisions: SimulationDecision[] = [
    {
      id: "dec_pricing",
      simulationId: "sim_pricing",
      runId: runs[2].id,
      title: "Adopt optimised festive price",
      outcome: "adopt",
      rationale: "Sweep shows clear profit headroom above the current price with acceptable elasticity risk.",
      decidedBy: "u_arjun",
      impact: "high",
      createdAt: seedTime(55),
    },
  ];

  const reviews: SimulationReview[] = [
    {
      id: "rev_revenue",
      simulationId: "sim_revenue",
      reviewerId: "u_lena",
      reviewerName: "Lena Park",
      decision: "pending",
      comment: "Reviewing downside assumptions before approving the FY27 plan.",
      createdAt: seedTime(36),
    },
  ];

  const approvals: SimulationApproval[] = [
    {
      id: "apr_pricing",
      simulationId: "sim_pricing",
      approverId: "u_maya",
      approverName: "Maya Rao",
      approved: true,
      note: "Approved for a controlled price experiment.",
      createdAt: seedTime(38),
    },
  ];

  const versions: SimulationVersion[] = [
    { id: "ver_launch_1", simulationId: "sim_launch", version: 1, label: "Initial draft", authorId: "u_arjun", createdAt: seedTime(2), snapshot: { name: "Q3 Vendor Onboarding Launch", description: "Initial adoption model", scenarioCount: 1, workflowState: "draft" } },
    { id: "ver_launch_2", simulationId: "sim_launch", version: 2, label: "Added referral scenario", authorId: "u_arjun", createdAt: seedTime(48), snapshot: { name: "Q3 Vendor Onboarding Launch", description: "Adoption forecast for the new hyperlocal vendor onboarding campaign.", scenarioCount: 2, workflowState: "completed" } },
  ];

  const history: SimulationHistoryEvent[] = [
    { id: "h1", action: "simulation_created", simulationId: "sim_launch", actorId: "u_arjun", actorName: "Arjun Verma", summary: "Created simulation 'Q3 Vendor Onboarding Launch'", at: seedTime(0) },
    { id: "h2", action: "scenario_created", simulationId: "sim_launch", scenarioId: "scn_launch_base", actorId: "u_arjun", actorName: "Arjun Verma", summary: "Created baseline scenario", at: seedTime(1) },
    { id: "h3", action: "scenario_cloned", simulationId: "sim_launch", scenarioId: "scn_launch_aggr", actorId: "u_arjun", actorName: "Arjun Verma", summary: "Cloned baseline into 'Aggressive referral'", at: seedTime(5) },
    { id: "h4", action: "run_completed", simulationId: "sim_launch", scenarioId: "scn_launch_base", runId: runs[0].id, actorId: "u_arjun", actorName: "Arjun Verma", summary: "Completed run for baseline launch", at: seedTime(31) },
    { id: "h5", action: "run_completed", simulationId: "sim_launch", scenarioId: "scn_launch_aggr", runId: runs[1].id, actorId: "u_arjun", actorName: "Arjun Verma", summary: "Completed run for aggressive referral", at: seedTime(46) },
    { id: "h6", action: "comparison_created", simulationId: "sim_launch", actorId: "u_arjun", actorName: "Arjun Verma", summary: "Created comparison 'Baseline vs Aggressive referral'", at: seedTime(50) },
    { id: "h7", action: "simulation_created", simulationId: "sim_pricing", actorId: "u_arjun", actorName: "Arjun Verma", summary: "Created simulation 'Festive Pricing Strategy'", at: seedTime(10) },
    { id: "h8", action: "run_completed", simulationId: "sim_pricing", scenarioId: "scn_pricing_base", runId: runs[2].id, actorId: "u_arjun", actorName: "Arjun Verma", summary: "Completed festive basket price sweep", at: seedTime(41) },
    { id: "h9", action: "approval_recorded", simulationId: "sim_pricing", actorId: "u_maya", actorName: "Maya Rao", summary: "Approved for controlled price experiment", at: seedTime(38) },
    { id: "h10", action: "decision_recorded", simulationId: "sim_pricing", runId: runs[2].id, actorId: "u_arjun", actorName: "Arjun Verma", summary: "Decision: adopt optimised festive price", at: seedTime(55) },
    { id: "h11", action: "simulation_created", simulationId: "sim_revenue", actorId: "u_maya", actorName: "Maya Rao", summary: "Created simulation 'FY27 Revenue Plan'", at: seedTime(20) },
    { id: "h12", action: "run_completed", simulationId: "sim_revenue", scenarioId: "scn_revenue_base", runId: runs[3].id, actorId: "u_maya", actorName: "Maya Rao", summary: "Completed central revenue case", at: seedTime(35) },
    { id: "h13", action: "review_submitted", simulationId: "sim_revenue", actorId: "u_lena", actorName: "Lena Park", summary: "Review in progress for FY27 plan", at: seedTime(36) },
  ];

  return { simulations, scenarios, runs, insights, recommendations, comparisons, decisions, reviews, approvals, versions, history };
}

const SEED = buildSeed();

// ──────────────────────────────────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────────────────────────────────

export interface CreateSimulationInput {
  name: string;
  description: string;
  category: string;
  tags: string[];
  templateId: string;
  visibility?: Visibility;
}

export interface CreateScenarioInput {
  simulationId?: string;
  simulationName?: string;
  name: string;
  description: string;
  templateId: string;
  parameters?: Record<string, number | string>;
  category: string;
  tags: string[];
  seed?: number;
  assumptions?: Array<{ statement: string; confidence: SimulationAssumption["confidence"]; rationale?: string }>;
  constraints?: Array<Omit<SimulationConstraint, "id">>;
}

interface SimulationState {
  users: SimulationUser[];
  currentUserId: string;
  settings: SimulationSettings;
  customTemplates: SimulationTemplate[];
  simulations: Simulation[];
  scenarios: SimulationScenario[];
  runs: SimulationRun[];
  insights: SimulationInsight[];
  recommendations: SimulationRecommendation[];
  comparisons: SimulationComparison[];
  decisions: SimulationDecision[];
  reviews: SimulationReview[];
  approvals: SimulationApproval[];
  versions: SimulationVersion[];
  history: SimulationHistoryEvent[];

  // identity
  setCurrentUser: (userId: string) => void;

  // simulations
  createSimulation: (input: CreateSimulationInput) => string;
  updateSimulation: (id: string, patch: Partial<Pick<Simulation, "name" | "description" | "category" | "tags" | "visibility">>) => void;
  archiveSimulation: (id: string) => void;
  transitionWorkflow: (id: string, to: WorkflowState) => void;
  addContributor: (id: string, contributor: SimulationContributor) => void;
  saveVersion: (id: string, label: string) => void;

  // scenarios
  createScenario: (input: CreateScenarioInput) => string;
  updateScenario: (id: string, patch: Partial<Pick<SimulationScenario, "name" | "description" | "parameters" | "category" | "tags" | "seed" | "assumptions" | "constraints">>) => void;
  cloneScenario: (id: string, name?: string) => string;
  archiveScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  addAssumption: (scenarioId: string, statement: string, confidence: SimulationAssumption["confidence"], rationale?: string) => void;
  removeAssumption: (scenarioId: string, assumptionId: string) => void;
  addConstraint: (scenarioId: string, constraint: Omit<SimulationConstraint, "id">) => void;
  removeConstraint: (scenarioId: string, constraintId: string) => void;
  saveScenarioAsTemplate: (scenarioId: string, name: string) => void;

  // runs / execution
  startRun: (scenarioId: string, label?: string) => string;
  appendRunLog: (runId: string, message: string, level?: "info" | "warn" | "error") => void;
  setRunProgress: (runId: string, progress: number) => void;
  pauseRun: (runId: string) => void;
  resumeRun: (runId: string) => void;
  cancelRun: (runId: string) => void;
  completeRun: (runId: string) => void;

  // comparisons
  createComparison: (name: string, runIds: string[], note: string) => string;
  deleteComparison: (id: string) => void;

  // decisions / governance
  recordDecision: (input: Omit<SimulationDecision, "id" | "createdAt" | "decidedBy">) => void;
  submitReview: (simulationId: string, decision: SimulationReview["decision"], comment: string) => void;
  recordApproval: (simulationId: string, approved: boolean, note: string) => void;
  acceptRecommendation: (id: string) => void;

  // settings
  updateSettings: (patch: Partial<SimulationSettings>) => void;

  // maintenance
  resetToSeed: () => void;
}

function currentUser(state: SimulationState): SimulationUser {
  return state.users.find((u) => u.id === state.currentUserId) ?? state.users[0];
}

function historyEvent(state: SimulationState, action: HistoryAction, summary: string, refs: Partial<Pick<SimulationHistoryEvent, "simulationId" | "scenarioId" | "runId" | "meta">>): SimulationHistoryEvent {
  const user = currentUser(state);
  return { id: uid("h"), action, actorId: user.id, actorName: user.name, summary, at: now(), ...refs };
}

export const useSimulationStore = create<SimulationState>()(
  persist(
    (set, get) => ({
      users: SEED_USERS,
      currentUserId: "u_arjun",
      settings: DEFAULT_SETTINGS,
      customTemplates: [],
      simulations: SEED.simulations,
      scenarios: SEED.scenarios,
      runs: SEED.runs,
      insights: SEED.insights,
      recommendations: SEED.recommendations,
      comparisons: SEED.comparisons,
      decisions: SEED.decisions,
      reviews: SEED.reviews,
      approvals: SEED.approvals,
      versions: SEED.versions,
      history: SEED.history,

      setCurrentUser: (userId) => set({ currentUserId: userId }),

      createSimulation: (input) => {
        const id = uid("sim");
        const user = currentUser(get());
        const template = getTemplate(input.templateId);
        const simulation: Simulation = {
          id,
          name: input.name,
          description: input.description,
          category: input.category,
          tags: input.tags,
          modelKey: template?.modelKey ?? "demand_forecast",
          ownerId: user.id,
          ownerName: user.name,
          visibility: input.visibility ?? get().settings.defaultVisibility,
          workflowState: "draft",
          version: 1,
          contributors: [{ userId: user.id, name: user.name, role: "owner", addedAt: now() }],
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ simulations: [simulation, ...s.simulations], history: [historyEvent(s, "simulation_created", `Created simulation '${input.name}'`, { simulationId: id }), ...s.history] }));
        return id;
      },

      updateSimulation: (id, patch) =>
        set((s) => ({
          simulations: s.simulations.map((sim) => (sim.id === id ? { ...sim, ...patch, updatedAt: now() } : sim)),
          history: [historyEvent(s, "simulation_updated", `Updated simulation settings`, { simulationId: id }), ...s.history],
        })),

      archiveSimulation: (id) =>
        set((s) => ({
          simulations: s.simulations.map((sim) => (sim.id === id ? { ...sim, workflowState: "archived", archivedAt: now(), updatedAt: now() } : sim)),
          history: [historyEvent(s, "simulation_archived", `Archived simulation`, { simulationId: id }), ...s.history],
        })),

      transitionWorkflow: (id, to) =>
        set((s) => {
          const sim = s.simulations.find((x) => x.id === id);
          if (!sim) return {};
          return {
            simulations: s.simulations.map((x) => (x.id === id ? { ...x, workflowState: to, updatedAt: now() } : x)),
            history: [historyEvent(s, "workflow_transition", `Workflow: ${sim.workflowState} → ${to}`, { simulationId: id, meta: { from: sim.workflowState, to } }), ...s.history],
          };
        }),

      addContributor: (id, contributor) =>
        set((s) => ({ simulations: s.simulations.map((sim) => (sim.id === id ? { ...sim, contributors: [...sim.contributors, contributor], updatedAt: now() } : sim)) })),

      saveVersion: (id, label) =>
        set((s) => {
          const sim = s.simulations.find((x) => x.id === id);
          if (!sim) return {};
          const version = sim.version + 1;
          const ver: SimulationVersion = {
            id: uid("ver"),
            simulationId: id,
            version,
            label,
            authorId: currentUser(s).id,
            createdAt: now(),
            snapshot: { name: sim.name, description: sim.description, scenarioCount: s.scenarios.filter((sc) => sc.simulationId === id).length, workflowState: sim.workflowState },
          };
          return {
            versions: [ver, ...s.versions],
            simulations: s.simulations.map((x) => (x.id === id ? { ...x, version, updatedAt: now() } : x)),
            history: [historyEvent(s, "version_saved", `Saved version ${version}: ${label}`, { simulationId: id, meta: { version } }), ...s.history],
          };
        }),

      createScenario: (input) => {
        const template = getTemplate(input.templateId);
        if (!template) return "";
        const state = get();
        const user = currentUser(state);
        const events: SimulationHistoryEvent[] = [];
        let simulations = state.simulations;
        let simulationId = input.simulationId;

        if (!simulationId) {
          simulationId = uid("sim");
          const sim: Simulation = {
            id: simulationId,
            name: input.simulationName || input.name,
            description: input.description,
            category: input.category,
            tags: input.tags,
            modelKey: template.modelKey,
            ownerId: user.id,
            ownerName: user.name,
            visibility: state.settings.defaultVisibility,
            workflowState: "draft",
            version: 1,
            contributors: [{ userId: user.id, name: user.name, role: "owner", addedAt: now() }],
            createdAt: now(),
            updatedAt: now(),
          };
          simulations = [sim, ...simulations];
          events.push(historyEvent(state, "simulation_created", `Created simulation '${sim.name}'`, { simulationId }));
        }

        const scenarioId = uid("scn");
        const isBaseline = !state.scenarios.some((sc) => sc.simulationId === simulationId);
        const scenario: SimulationScenario = {
          id: scenarioId,
          simulationId,
          name: input.name,
          description: input.description,
          templateId: template.id,
          modelKey: template.modelKey,
          parameters: { ...defaultParameters(template), ...(input.parameters ?? {}) },
          assumptions: input.assumptions
            ? input.assumptions.map((a) => ({ id: uid("asm"), statement: a.statement, confidence: a.confidence, rationale: a.rationale, createdAt: now() }))
            : template.defaultAssumptions.map((statement) => ({ id: uid("asm"), statement, confidence: "medium", createdAt: now() })),
          constraints: input.constraints
            ? input.constraints.map((c) => ({ id: uid("con"), ...c }))
            : template.defaultConstraints.map((c) => ({ id: uid("con"), ...c })),
          category: input.category,
          tags: input.tags,
          seed: input.seed ?? state.settings.defaultSeed,
          status: "active",
          isBaseline,
          createdBy: user.id,
          createdAt: now(),
          updatedAt: now(),
        };
        events.push(historyEvent(state, "scenario_created", `Created scenario '${input.name}'`, { simulationId, scenarioId }));

        set({ simulations, scenarios: [scenario, ...state.scenarios], history: [...events, ...state.history] });
        return scenarioId;
      },

      updateScenario: (id, patch) =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) => (sc.id === id ? { ...sc, ...patch, updatedAt: now() } : sc)),
          history: [historyEvent(s, "scenario_updated", `Updated scenario configuration`, { scenarioId: id }), ...s.history],
        })),

      cloneScenario: (id, name) => {
        const newId = uid("scn");
        set((s) => {
          const src = s.scenarios.find((sc) => sc.id === id);
          if (!src) return {};
          const clone: SimulationScenario = {
            ...src,
            id: newId,
            name: name || `${src.name} (copy)`,
            isBaseline: false,
            assumptions: src.assumptions.map((a) => ({ ...a, id: uid("asm") })),
            constraints: src.constraints.map((c) => ({ ...c, id: uid("con") })),
            parameters: { ...src.parameters },
            tags: [...src.tags],
            clonedFrom: src.id,
            createdBy: currentUser(s).id,
            createdAt: now(),
            updatedAt: now(),
          };
          return {
            scenarios: [clone, ...s.scenarios],
            history: [historyEvent(s, "scenario_cloned", `Cloned scenario '${src.name}'`, { simulationId: src.simulationId, scenarioId: newId }), ...s.history],
          };
        });
        return newId;
      },

      archiveScenario: (id) =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) => (sc.id === id ? { ...sc, status: "archived", updatedAt: now() } : sc)),
          history: [historyEvent(s, "scenario_archived", `Archived scenario`, { scenarioId: id }), ...s.history],
        })),

      deleteScenario: (id) =>
        set((s) => ({
          scenarios: s.scenarios.filter((sc) => sc.id !== id),
          history: [historyEvent(s, "scenario_deleted", `Deleted scenario`, { scenarioId: id }), ...s.history],
        })),

      addAssumption: (scenarioId, statement, confidence, rationale) =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) =>
            sc.id === scenarioId ? { ...sc, assumptions: [...sc.assumptions, { id: uid("asm"), statement, rationale, confidence, createdAt: now() }], updatedAt: now() } : sc,
          ),
        })),

      removeAssumption: (scenarioId, assumptionId) =>
        set((s) => ({ scenarios: s.scenarios.map((sc) => (sc.id === scenarioId ? { ...sc, assumptions: sc.assumptions.filter((a) => a.id !== assumptionId) } : sc)) })),

      addConstraint: (scenarioId, constraint) =>
        set((s) => ({ scenarios: s.scenarios.map((sc) => (sc.id === scenarioId ? { ...sc, constraints: [...sc.constraints, { id: uid("con"), ...constraint }], updatedAt: now() } : sc)) })),

      removeConstraint: (scenarioId, constraintId) =>
        set((s) => ({ scenarios: s.scenarios.map((sc) => (sc.id === scenarioId ? { ...sc, constraints: sc.constraints.filter((c) => c.id !== constraintId) } : sc)) })),

      saveScenarioAsTemplate: (scenarioId, name) =>
        set((s) => {
          const sc = s.scenarios.find((x) => x.id === scenarioId);
          if (!sc) return {};
          const base = getTemplate(sc.templateId);
          if (!base) return {};
          const tpl: SimulationTemplate = {
            ...base,
            id: uid("tpl"),
            name,
            builtIn: false,
            createdBy: currentUser(s).id,
            createdAt: now(),
            parameters: base.parameters.map((p) => ({ ...p, defaultValue: sc.parameters[p.key] ?? p.defaultValue })),
            defaultAssumptions: sc.assumptions.map((a) => a.statement),
            defaultConstraints: sc.constraints.map((c) => ({ label: c.label, metric: c.metric, operator: c.operator, threshold: c.threshold })),
          };
          return {
            customTemplates: [tpl, ...s.customTemplates],
            history: [historyEvent(s, "template_saved", `Saved template '${name}'`, { simulationId: sc.simulationId, scenarioId }), ...s.history],
          };
        }),

      startRun: (scenarioId, label) => {
        const runId = uid("run");
        set((s) => {
          const sc = s.scenarios.find((x) => x.id === scenarioId);
          if (!sc) return {};
          const run: SimulationRun = {
            id: runId,
            simulationId: sc.simulationId,
            scenarioId: sc.id,
            scenarioName: sc.name,
            modelKey: sc.modelKey,
            label: label || `${sc.name} · run`,
            status: "running",
            progress: 0,
            seed: sc.seed,
            parameters: { ...sc.parameters },
            startedAt: now(),
            runtimeMs: 0,
            triggeredBy: currentUser(s).id,
            logs: [{ at: now(), level: "info", message: "Run started" }],
            insightIds: [],
            recommendationIds: [],
          };
          return {
            runs: [run, ...s.runs],
            history: [historyEvent(s, "run_started", `Started run for '${sc.name}'`, { simulationId: sc.simulationId, scenarioId, runId }), ...s.history],
          };
        });
        return runId;
      },

      appendRunLog: (runId, message, level = "info") =>
        set((s) => ({ runs: s.runs.map((r) => (r.id === runId ? { ...r, logs: [...r.logs, { at: now(), level, message }] } : r)) })),

      setRunProgress: (runId, progress) =>
        set((s) => ({ runs: s.runs.map((r) => (r.id === runId ? { ...r, progress: Math.min(100, Math.max(0, progress)) } : r)) })),

      pauseRun: (runId) =>
        set((s) => ({
          runs: s.runs.map((r) => (r.id === runId && r.status === "running" ? { ...r, status: "paused", logs: [...r.logs, { at: now(), level: "warn", message: "Run paused" }] } : r)),
          history: [historyEvent(s, "run_paused", `Paused run`, { runId }), ...s.history],
        })),

      resumeRun: (runId) =>
        set((s) => ({
          runs: s.runs.map((r) => (r.id === runId && r.status === "paused" ? { ...r, status: "running", logs: [...r.logs, { at: now(), level: "info", message: "Run resumed" }] } : r)),
          history: [historyEvent(s, "run_resumed", `Resumed run`, { runId }), ...s.history],
        })),

      cancelRun: (runId) =>
        set((s) => ({
          runs: s.runs.map((r) => (r.id === runId && (r.status === "running" || r.status === "paused") ? { ...r, status: "cancelled", completedAt: now(), logs: [...r.logs, { at: now(), level: "error", message: "Run cancelled by user" }] } : r)),
          history: [historyEvent(s, "run_cancelled", `Cancelled run`, { runId }), ...s.history],
        })),

      completeRun: (runId) =>
        set((s) => {
          const run = s.runs.find((r) => r.id === runId);
          if (!run || run.status === "completed" || run.status === "cancelled") return {};
          const sc = s.scenarios.find((x) => x.id === run.scenarioId);
          const constraints = sc?.constraints ?? [];
          const result = runSimulationModel(run.modelKey, run.parameters, run.seed, constraints);
          const derived = s.settings.autoGenerateInsights ? deriveInsights(run.modelKey, result, run.scenarioName) : { insights: [], recommendations: [] };
          const insights: SimulationInsight[] = derived.insights.map((d) => ({ id: uid("ins"), runId, simulationId: run.simulationId, scenarioId: run.scenarioId, kind: d.kind, title: d.title, detail: d.detail, confidence: d.confidence, createdAt: now() }));
          const recommendations: SimulationRecommendation[] = derived.recommendations.map((d) => ({ id: uid("rec"), runId, simulationId: run.simulationId, scenarioId: run.scenarioId, title: d.title, action: d.action, rationale: d.rationale, expectedImpact: d.expectedImpact, priority: d.priority, createdAt: now() }));
          const runtimeMs = Date.parse(now()) - Date.parse(run.startedAt);
          return {
            runs: s.runs.map((r) => (r.id === runId ? { ...r, status: "completed", progress: 100, completedAt: now(), runtimeMs: Math.max(runtimeMs, 600), result, insightIds: insights.map((i) => i.id), recommendationIds: recommendations.map((x) => x.id), logs: [...r.logs, { at: now(), level: "info", message: "Run completed" }] } : r)),
            insights: [...insights, ...s.insights],
            recommendations: [...recommendations, ...s.recommendations],
            history: [historyEvent(s, "run_completed", `Completed run for '${run.scenarioName}'`, { simulationId: run.simulationId, scenarioId: run.scenarioId, runId }), ...s.history],
          };
        }),

      createComparison: (name, runIds, note) => {
        const id = uid("cmp");
        set((s) => ({
          comparisons: [{ id, name, runIds, note, createdBy: currentUser(s).id, createdAt: now() }, ...s.comparisons],
          history: [historyEvent(s, "comparison_created", `Created comparison '${name}'`, { meta: { runs: runIds.length } }), ...s.history],
        }));
        return id;
      },

      deleteComparison: (id) => set((s) => ({ comparisons: s.comparisons.filter((c) => c.id !== id) })),

      recordDecision: (input) =>
        set((s) => ({
          decisions: [{ id: uid("dec"), decidedBy: currentUser(s).id, createdAt: now(), ...input }, ...s.decisions],
          history: [historyEvent(s, "decision_recorded", `Decision: ${input.title}`, { simulationId: input.simulationId, runId: input.runId }), ...s.history],
        })),

      submitReview: (simulationId, decision, comment) =>
        set((s) => {
          const user = currentUser(s);
          const review: SimulationReview = { id: uid("rev"), simulationId, reviewerId: user.id, reviewerName: user.name, decision, comment, createdAt: now() };
          return {
            reviews: [review, ...s.reviews],
            history: [historyEvent(s, "review_submitted", `Review ${decision.replace(/_/g, " ")}`, { simulationId }), ...s.history],
          };
        }),

      recordApproval: (simulationId, approved, note) =>
        set((s) => {
          const user = currentUser(s);
          const approval: SimulationApproval = { id: uid("apr"), simulationId, approverId: user.id, approverName: user.name, approved, note, createdAt: now() };
          return {
            approvals: [approval, ...s.approvals],
            simulations: approved ? s.simulations.map((sim) => (sim.id === simulationId && sim.workflowState === "review" ? { ...sim, workflowState: "approved", updatedAt: now() } : sim)) : s.simulations,
            history: [historyEvent(s, "approval_recorded", approved ? `Approved simulation` : `Approval declined`, { simulationId }), ...s.history],
          };
        }),

      acceptRecommendation: (id) =>
        set((s) => ({
          recommendations: s.recommendations.map((r) => (r.id === id ? { ...r, accepted: true } : r)),
          history: [historyEvent(s, "recommendation_accepted", `Accepted recommendation`, {}), ...s.history],
        })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetToSeed: () => {
        const seed = buildSeed();
        set({
          simulations: seed.simulations,
          scenarios: seed.scenarios,
          runs: seed.runs,
          insights: seed.insights,
          recommendations: seed.recommendations,
          comparisons: seed.comparisons,
          decisions: seed.decisions,
          reviews: seed.reviews,
          approvals: seed.approvals,
          versions: seed.versions,
          history: seed.history,
          customTemplates: [],
        });
      },
    }),
    { name: "vendorhub-simulation-os", version: 1 },
  ),
);

export function allTemplates(custom: SimulationTemplate[]): SimulationTemplate[] {
  return [...BUILT_IN_TEMPLATES, ...custom];
}

export { BUILT_IN_TEMPLATES, getTemplate, getTemplateByModel };
