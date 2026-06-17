"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  analyzeChange,
  generateRecommendations,
  getEventTypeMeta,
  getIntervention,
  runEvolution,
  type ChangeEvent,
  type ChangeEventType,
  type EvolutionRun,
  type HistoryAction,
  type Mitigation,
  type Recommendation,
  type SecisDecision,
  type SecisEdge,
  type SecisEntity,
  type SecisHistoryEvent,
  type SecisScenario,
  type SecisSettings,
  type SecisSubsystem,
  type SecisSystem,
  type SecisUser,
  type WorkflowState,
  type EdgeCategory,
  type EdgeType,
  type EntityKind,
} from "@/lib/secis";

// ── id + time helpers ─────────────────────────────────────────────────────────

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}
function now(): string {
  return new Date().toISOString();
}
const SEED_BASE = Date.parse("2026-05-22T09:00:00.000Z");
function seedTime(min: number): string {
  return new Date(SEED_BASE + min * 60_000).toISOString();
}

// ── Users / settings ──────────────────────────────────────────────────────────

const SEED_USERS: SecisUser[] = [
  { id: "u_devi", name: "Devi Krishnan", role: "admin" },
  { id: "u_rahul", name: "Rahul Menon", role: "analyst" },
  { id: "u_priya", name: "Priya Nair", role: "operator" },
  { id: "u_sam", name: "Sam Iyer", role: "viewer" },
];

const DEFAULT_SETTINGS: SecisSettings = {
  severityThreshold: 0.06,
  maxDepth: 6,
  defaultHorizon: 12,
  defaultVisibility: "team",
  autoGenerateRecommendations: true,
};

// ── Seed graph ──────────────────────────────────────────────────────────────

const SEED_SYSTEMS: SecisSystem[] = [
  { id: "sys-supply", name: "Supply", description: "Suppliers and procurement.", domain: "Supply", criticality: 0.85, status: "active", ownerId: "u_rahul", ownerName: "Rahul Menon", createdAt: seedTime(0), updatedAt: seedTime(0) },
  { id: "sys-inventory", name: "Inventory", description: "Warehouses, dark stores, and stock.", domain: "Inventory", criticality: 0.9, status: "active", ownerId: "u_rahul", ownerName: "Rahul Menon", createdAt: seedTime(0), updatedAt: seedTime(0) },
  { id: "sys-fulfilment", name: "Fulfilment", description: "Couriers and delivery zones.", domain: "Fulfilment", criticality: 0.8, status: "active", ownerId: "u_priya", ownerName: "Priya Nair", createdAt: seedTime(0), updatedAt: seedTime(0) },
  { id: "sys-storefront", name: "Storefront", description: "Categories and products.", domain: "Storefront", criticality: 0.85, status: "active", ownerId: "u_rahul", ownerName: "Rahul Menon", createdAt: seedTime(0), updatedAt: seedTime(0) },
  { id: "sys-pricing", name: "Pricing", description: "Dynamic pricing.", domain: "Pricing", criticality: 0.7, status: "active", ownerId: "u_devi", ownerName: "Devi Krishnan", createdAt: seedTime(0), updatedAt: seedTime(0) },
  { id: "sys-payments", name: "Payments", description: "Payment gateways.", domain: "Payments", criticality: 0.85, status: "active", ownerId: "u_devi", ownerName: "Devi Krishnan", createdAt: seedTime(0), updatedAt: seedTime(0) },
  { id: "sys-growth", name: "Growth", description: "Customers and acquisition.", domain: "Growth", criticality: 0.75, status: "active", ownerId: "u_devi", ownerName: "Devi Krishnan", createdAt: seedTime(0), updatedAt: seedTime(0) },
];

export const SYSTEM_ORDER = ["sys-supply", "sys-inventory", "sys-fulfilment", "sys-storefront", "sys-pricing", "sys-payments", "sys-growth"];

const SEED_SUBSYSTEMS: SecisSubsystem[] = [
  { id: "sub-perishables", systemId: "sys-inventory", name: "Perishables", description: "Cold-chain stock." },
  { id: "sub-darkstores", systemId: "sys-inventory", name: "Dark stores", description: "Micro-fulfilment nodes." },
];

function ent(
  id: string,
  name: string,
  kind: EntityKind,
  systemId: string,
  criticality: number,
  vulnerability: number,
  resilience: number,
  rev: number,
  tags: string[],
  subsystemId?: string,
): SecisEntity {
  return { id, name, kind, systemId, subsystemId, criticality, vulnerability, resilience, monthlyRevenueExposure: rev, tags, status: "active", ownerId: "u_rahul", createdAt: seedTime(1), updatedAt: seedTime(1) };
}

const SEED_ENTITIES: SecisEntity[] = [
  ent("e-supplier-a", "Anand Dairy Co-op", "supplier", "sys-supply", 0.85, 0.5, 0.5, 1_200_000, ["dairy", "critical"]),
  ent("e-supplier-b", "FreshFarms Produce", "supplier", "sys-supply", 0.7, 0.55, 0.55, 900_000, ["produce"]),
  ent("e-supplier-c", "PackRight Packaging", "supplier", "sys-supply", 0.5, 0.5, 0.6, 400_000, ["packaging"]),
  ent("e-wh-central", "Chennai Central Warehouse", "warehouse", "sys-inventory", 0.9, 0.6, 0.45, 2_500_000, ["hub", "critical"]),
  ent("e-inv-perishables", "Perishables Inventory", "inventory_node", "sys-inventory", 0.75, 0.7, 0.4, 1_300_000, ["cold-chain"], "sub-perishables"),
  ent("e-ds-adyar", "Adyar Dark Store", "dark_store", "sys-inventory", 0.7, 0.65, 0.5, 1_100_000, ["south"], "sub-darkstores"),
  ent("e-ds-velachery", "Velachery Dark Store", "dark_store", "sys-inventory", 0.7, 0.65, 0.5, 1_000_000, ["south"], "sub-darkstores"),
  ent("e-courier-fleet", "In-house Fleet", "courier", "sys-fulfilment", 0.8, 0.6, 0.5, 1_400_000, ["fleet", "critical"]),
  ent("e-courier-3pl", "3PL Partner", "courier", "sys-fulfilment", 0.6, 0.55, 0.6, 700_000, ["3pl"]),
  ent("e-zone-south", "South Chennai Zone", "delivery_zone", "sys-fulfilment", 0.7, 0.6, 0.5, 1_600_000, ["zone"]),
  ent("e-zone-omr", "OMR Corridor Zone", "delivery_zone", "sys-fulfilment", 0.65, 0.6, 0.5, 1_200_000, ["zone"]),
  ent("e-cat-grocery", "Grocery Category", "category", "sys-storefront", 0.85, 0.6, 0.55, 3_000_000, ["category", "critical"]),
  ent("e-cat-fresh", "Fresh Produce Category", "category", "sys-storefront", 0.7, 0.7, 0.5, 1_800_000, ["category"]),
  ent("e-prod-staples", "Staples Bundle", "product", "sys-storefront", 0.6, 0.6, 0.6, 900_000, ["product"]),
  ent("e-pricing", "Dynamic Pricing Engine", "pricing_engine", "sys-pricing", 0.7, 0.45, 0.65, 800_000, ["pricing"]),
  ent("e-pay-upi", "UPI Gateway", "payment_gateway", "sys-payments", 0.85, 0.4, 0.7, 2_000_000, ["payments", "critical"]),
  ent("e-pay-cards", "Cards Gateway", "payment_gateway", "sys-payments", 0.6, 0.45, 0.7, 900_000, ["payments"]),
  ent("e-seg-prime", "Prime Members", "customer_segment", "sys-growth", 0.8, 0.6, 0.5, 2_600_000, ["loyal", "critical"]),
  ent("e-seg-value", "Value Shoppers", "customer_segment", "sys-growth", 0.6, 0.65, 0.5, 1_400_000, ["price-sensitive"]),
  ent("e-mkt-paid", "Paid Acquisition", "marketing_channel", "sys-growth", 0.55, 0.6, 0.6, 700_000, ["acquisition"]),
];

let edgeSeq = 0;
function edge(sourceId: string, targetId: string, type: EdgeType, weight: number, category: EdgeCategory = "dependency"): SecisEdge {
  edgeSeq += 1;
  return { id: `edge-${edgeSeq}`, sourceId, targetId, type, weight, category, createdAt: seedTime(2) };
}

const SEED_EDGES: SecisEdge[] = [
  edge("e-supplier-a", "e-wh-central", "supplies", 0.8),
  edge("e-supplier-a", "e-inv-perishables", "supplies", 0.7),
  edge("e-supplier-b", "e-inv-perishables", "supplies", 0.75),
  edge("e-supplier-b", "e-wh-central", "supplies", 0.5),
  edge("e-supplier-c", "e-wh-central", "supplies", 0.45),
  edge("e-wh-central", "e-ds-adyar", "stocks", 0.8),
  edge("e-wh-central", "e-ds-velachery", "stocks", 0.8),
  edge("e-inv-perishables", "e-ds-adyar", "stocks", 0.7),
  edge("e-inv-perishables", "e-cat-fresh", "stocks", 0.8),
  edge("e-wh-central", "e-cat-grocery", "stocks", 0.7),
  edge("e-ds-adyar", "e-zone-south", "fulfils", 0.8),
  edge("e-ds-velachery", "e-zone-omr", "fulfils", 0.8),
  edge("e-courier-fleet", "e-zone-south", "delivers_to", 0.8),
  edge("e-courier-fleet", "e-zone-omr", "delivers_to", 0.7),
  edge("e-courier-3pl", "e-zone-omr", "delivers_to", 0.6),
  edge("e-zone-south", "e-seg-prime", "serves", 0.8),
  edge("e-zone-omr", "e-seg-value", "serves", 0.7),
  edge("e-zone-south", "e-seg-value", "serves", 0.5),
  edge("e-cat-grocery", "e-seg-prime", "serves", 0.7),
  edge("e-cat-fresh", "e-seg-prime", "serves", 0.6),
  edge("e-cat-grocery", "e-seg-value", "serves", 0.6),
  edge("e-prod-staples", "e-cat-grocery", "lists_in", 0.6),
  edge("e-pricing", "e-cat-grocery", "prices", 0.6),
  edge("e-pricing", "e-cat-fresh", "prices", 0.6),
  edge("e-pay-upi", "e-seg-prime", "pays_via", 0.7),
  edge("e-pay-upi", "e-seg-value", "pays_via", 0.7),
  edge("e-pay-cards", "e-seg-prime", "pays_via", 0.5),
  edge("e-mkt-paid", "e-seg-value", "promotes", 0.6),
  edge("e-mkt-paid", "e-seg-prime", "promotes", 0.4),
  // relationship (non-dependency) links
  edge("e-ds-adyar", "e-courier-fleet", "serves", 0.5, "relationship"),
  edge("e-pricing", "e-seg-prime", "serves", 0.4, "relationship"),
  edge("e-pay-upi", "e-pay-cards", "serves", 0.3, "relationship"),
];

function makeEvent(
  id: string,
  name: string,
  type: ChangeEventType,
  originEntityId: string,
  magnitude: number,
  ownerId: string,
  ownerName: string,
  workflowState: WorkflowState,
  createdMin: number,
  tags: string[],
): ChangeEvent {
  const meta = getEventTypeMeta(type);
  const params: Record<string, number | string> = {};
  for (const p of meta.params) params[p.key] = p.defaultValue;
  params.magnitude = Math.round(magnitude * 100);
  return {
    id,
    name,
    type,
    description: meta.description,
    originEntityId,
    magnitude,
    horizonPeriods: DEFAULT_SETTINGS.defaultHorizon,
    parameters: params,
    tags,
    ownerId,
    ownerName,
    visibility: "team",
    workflowState,
    version: 1,
    status: "active",
    createdAt: seedTime(createdMin),
    updatedAt: seedTime(createdMin),
    lastAnalyzedAt: workflowState === "completed" ? seedTime(createdMin + 5) : undefined,
  };
}

const SEED_EVENTS: ChangeEvent[] = [
  makeEvent("ce-supplier", "Anand Dairy supply outage", "supplier_failure", "e-supplier-a", 0.8, "u_rahul", "Rahul Menon", "completed", 30, ["supply", "critical"]),
  makeEvent("ce-surge", "Festival grocery demand surge", "demand_surge", "e-cat-grocery", 0.65, "u_rahul", "Rahul Menon", "approved", 60, ["demand", "festival"]),
  makeEvent("ce-delivery", "In-house fleet breakdown", "delivery_failure", "e-courier-fleet", 0.7, "u_priya", "Priya Nair", "review", 90, ["fulfilment"]),
];

const ANALYSIS_SETTINGS = { severityThreshold: DEFAULT_SETTINGS.severityThreshold, maxDepth: DEFAULT_SETTINGS.maxDepth };

function buildSeed() {
  // Recommendations for the analyzed event.
  const supplierEvent = SEED_EVENTS[0];
  const { propagation, impact, risk } = analyzeChange(supplierEvent, SEED_ENTITIES, SEED_EDGES, ANALYSIS_SETTINGS);
  const derivedRecs = generateRecommendations(supplierEvent, propagation, impact, risk);
  const recommendations: Recommendation[] = derivedRecs.map((d, i) => ({
    id: `rec-seed-${i}`,
    changeEventId: supplierEvent.id,
    category: d.category,
    title: d.title,
    action: d.action,
    rationale: d.rationale,
    expectedImpact: d.expectedImpact,
    priority: d.priority,
    interventionId: d.interventionId,
    accepted: i === 0,
    createdAt: seedTime(36),
  }));

  // One completed evolution run for the supplier event with two interventions.
  const interventionIds = ["intv-backup-supplier", "intv-safety-stock"];
  const interventions = interventionIds.map(getIntervention).filter(Boolean) as NonNullable<ReturnType<typeof getIntervention>>[];
  const evoResult = runEvolution(supplierEvent, propagation, impact, interventions, SEED_ENTITIES);
  const evolutionRuns: EvolutionRun[] = [
    {
      id: "evo-seed-1",
      changeEventId: supplierEvent.id,
      changeEventName: supplierEvent.name,
      name: "Backup supplier + safety stock",
      interventionIds,
      status: "completed",
      progress: 100,
      startedAt: seedTime(40),
      completedAt: seedTime(41),
      runtimeMs: 1800,
      triggeredBy: "u_rahul",
      logs: [
        { at: seedTime(40), level: "info", message: "Run started" },
        { at: seedTime(40), level: "info", message: "Simulating evolution and recovery" },
        { at: seedTime(41), level: "info", message: "Run completed" },
      ],
      result: evoResult,
    },
    {
      id: "evo-seed-2",
      changeEventId: supplierEvent.id,
      changeEventName: supplierEvent.name,
      name: "No action (baseline)",
      interventionIds: [],
      status: "completed",
      progress: 100,
      startedAt: seedTime(42),
      completedAt: seedTime(43),
      runtimeMs: 1500,
      triggeredBy: "u_rahul",
      logs: [
        { at: seedTime(42), level: "info", message: "Run started" },
        { at: seedTime(43), level: "info", message: "Run completed" },
      ],
      result: runEvolution(supplierEvent, propagation, impact, [], SEED_ENTITIES),
    },
  ];

  const scenarios: SecisScenario[] = [
    { id: "scn-seed-1", name: "Dairy outage — resilient response", description: "Backup supplier plus safety stock release.", changeEventId: supplierEvent.id, interventionIds, constraintIds: [], ownerId: "u_rahul", createdAt: seedTime(44), updatedAt: seedTime(44) },
  ];

  const decisions: SecisDecision[] = [
    { id: "dec-seed-1", changeEventId: supplierEvent.id, evolutionRunId: "evo-seed-1", title: "Adopt backup-supplier response", outcome: "adopt", rationale: "Cuts recovery time materially and avoids the largest losses at acceptable cost.", decidedBy: "u_devi", impact: "high", createdAt: seedTime(46) },
  ];

  const mitigations: Mitigation[] = [
    { id: "mit-seed-1", changeEventId: supplierEvent.id, interventionId: "intv-backup-supplier", name: "Activate backup supplier", status: "applied", appliedBy: "u_priya", note: "Alternate dairy co-op contracted for the outage window.", createdAt: seedTime(47) },
  ];

  const history: SecisHistoryEvent[] = [
    { id: "h1", action: "event_created", changeEventId: "ce-supplier", actorId: "u_rahul", actorName: "Rahul Menon", summary: "Created change event 'Anand Dairy supply outage'", at: seedTime(30) },
    { id: "h2", action: "event_analyzed", changeEventId: "ce-supplier", actorId: "u_rahul", actorName: "Rahul Menon", summary: "Ran impact analysis (propagation + impact + risk)", at: seedTime(35) },
    { id: "h3", action: "evolution_completed", changeEventId: "ce-supplier", runId: "evo-seed-1", actorId: "u_rahul", actorName: "Rahul Menon", summary: "Completed evolution run 'Backup supplier + safety stock'", at: seedTime(41) },
    { id: "h4", action: "recommendation_accepted", changeEventId: "ce-supplier", actorId: "u_rahul", actorName: "Rahul Menon", summary: "Accepted recommendation", at: seedTime(45) },
    { id: "h5", action: "decision_recorded", changeEventId: "ce-supplier", runId: "evo-seed-1", actorId: "u_devi", actorName: "Devi Krishnan", summary: "Decision: adopt backup-supplier response", at: seedTime(46) },
    { id: "h6", action: "mitigation_applied", changeEventId: "ce-supplier", actorId: "u_priya", actorName: "Priya Nair", summary: "Applied mitigation: Activate backup supplier", at: seedTime(47) },
    { id: "h7", action: "event_created", changeEventId: "ce-surge", actorId: "u_rahul", actorName: "Rahul Menon", summary: "Created change event 'Festival grocery demand surge'", at: seedTime(60) },
    { id: "h8", action: "workflow_transition", changeEventId: "ce-surge", actorId: "u_rahul", actorName: "Rahul Menon", summary: "Workflow: review → approved", at: seedTime(64) },
    { id: "h9", action: "event_created", changeEventId: "ce-delivery", actorId: "u_priya", actorName: "Priya Nair", summary: "Created change event 'In-house fleet breakdown'", at: seedTime(90) },
  ];

  return { recommendations, evolutionRuns, scenarios, decisions, mitigations, history };
}

const SEED = buildSeed();

// ── Store ──────────────────────────────────────────────────────────────────

export interface CreateEntityInput {
  name: string;
  kind: EntityKind;
  systemId: string;
  criticality: number;
  vulnerability: number;
  resilience: number;
  monthlyRevenueExposure: number;
  tags: string[];
}

export interface CreateEventInput {
  name: string;
  type: ChangeEventType;
  description: string;
  originEntityId: string;
  magnitude: number;
  horizonPeriods: number;
  parameters: Record<string, number | string>;
  tags: string[];
}

interface SecisState {
  users: SecisUser[];
  currentUserId: string;
  settings: SecisSettings;
  systems: SecisSystem[];
  subsystems: SecisSubsystem[];
  entities: SecisEntity[];
  edges: SecisEdge[];
  changeEvents: ChangeEvent[];
  recommendations: Recommendation[];
  evolutionRuns: EvolutionRun[];
  scenarios: SecisScenario[];
  decisions: SecisDecision[];
  mitigations: Mitigation[];
  history: SecisHistoryEvent[];

  setCurrentUser: (id: string) => void;

  createSystem: (input: { name: string; description: string; domain: string; criticality: number }) => string;
  updateSystem: (id: string, patch: Partial<Pick<SecisSystem, "name" | "description" | "domain" | "criticality">>) => void;
  archiveSystem: (id: string) => void;

  createEntity: (input: CreateEntityInput) => string;
  updateEntity: (id: string, patch: Partial<Omit<SecisEntity, "id" | "createdAt">>) => void;
  archiveEntity: (id: string) => void;
  deleteEntity: (id: string) => void;

  createEdge: (sourceId: string, targetId: string, type: EdgeType, weight: number, category: EdgeCategory) => void;
  removeEdge: (id: string) => void;

  createEvent: (input: CreateEventInput) => string;
  updateEvent: (id: string, patch: Partial<Pick<ChangeEvent, "name" | "description" | "magnitude" | "horizonPeriods" | "parameters" | "tags" | "visibility">>) => void;
  analyzeEvent: (id: string) => void;
  archiveEvent: (id: string) => void;
  transitionWorkflow: (id: string, to: WorkflowState) => void;
  recordApproval: (id: string, approved: boolean, note: string) => void;

  acceptRecommendation: (id: string) => void;
  applyMitigation: (changeEventId: string, interventionId: string, note: string) => void;
  recordDecision: (input: Omit<SecisDecision, "id" | "createdAt" | "decidedBy">) => void;

  createScenario: (input: { name: string; description: string; changeEventId: string; interventionIds: string[] }) => string;
  deleteScenario: (id: string) => void;

  startEvolutionRun: (changeEventId: string, interventionIds: string[], name: string, scenarioId?: string) => string;
  setRunProgress: (runId: string, progress: number) => void;
  appendRunLog: (runId: string, message: string, level?: "info" | "warn" | "error") => void;
  pauseRun: (runId: string) => void;
  resumeRun: (runId: string) => void;
  cancelRun: (runId: string) => void;
  completeRun: (runId: string) => void;

  updateSettings: (patch: Partial<SecisSettings>) => void;
  resetToSeed: () => void;
}

function currentUser(state: SecisState): SecisUser {
  return state.users.find((u) => u.id === state.currentUserId) ?? state.users[0];
}

function event(state: SecisState, action: HistoryAction, summary: string, refs: Partial<Pick<SecisHistoryEvent, "changeEventId" | "entityId" | "systemId" | "runId" | "meta">>): SecisHistoryEvent {
  const u = currentUser(state);
  return { id: uid("h"), action, actorId: u.id, actorName: u.name, summary, at: now(), ...refs };
}

export const useSecisStore = create<SecisState>()(
  persist(
    (set, get) => ({
      users: SEED_USERS,
      currentUserId: "u_rahul",
      settings: DEFAULT_SETTINGS,
      systems: SEED_SYSTEMS,
      subsystems: SEED_SUBSYSTEMS,
      entities: SEED_ENTITIES,
      edges: SEED_EDGES,
      changeEvents: SEED_EVENTS,
      recommendations: SEED.recommendations,
      evolutionRuns: SEED.evolutionRuns,
      scenarios: SEED.scenarios,
      decisions: SEED.decisions,
      mitigations: SEED.mitigations,
      history: SEED.history,

      setCurrentUser: (id) => set({ currentUserId: id }),

      createSystem: (input) => {
        const id = uid("sys");
        const u = currentUser(get());
        const system: SecisSystem = { id, name: input.name, description: input.description, domain: input.domain, criticality: input.criticality, status: "active", ownerId: u.id, ownerName: u.name, createdAt: now(), updatedAt: now() };
        set((s) => ({ systems: [...s.systems, system], history: [event(s, "system_created", `Created system '${input.name}'`, { systemId: id }), ...s.history] }));
        return id;
      },
      updateSystem: (id, patch) => set((s) => ({ systems: s.systems.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now() } : x)) })),
      archiveSystem: (id) => set((s) => ({ systems: s.systems.map((x) => (x.id === id ? { ...x, status: "archived", updatedAt: now() } : x)) })),

      createEntity: (input) => {
        const id = uid("e");
        const u = currentUser(get());
        const entity: SecisEntity = { id, ...input, status: "active", ownerId: u.id, createdAt: now(), updatedAt: now() };
        set((s) => ({ entities: [...s.entities, entity], history: [event(s, "entity_created", `Created entity '${input.name}'`, { entityId: id, systemId: input.systemId }), ...s.history] }));
        return id;
      },
      updateEntity: (id, patch) => set((s) => ({ entities: s.entities.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now() } : x)), history: [event(s, "entity_updated", `Updated entity`, { entityId: id }), ...s.history] })),
      archiveEntity: (id) => set((s) => ({ entities: s.entities.map((x) => (x.id === id ? { ...x, status: "archived", updatedAt: now() } : x)), history: [event(s, "entity_archived", `Archived entity`, { entityId: id }), ...s.history] })),
      deleteEntity: (id) => set((s) => ({ entities: s.entities.filter((x) => x.id !== id), edges: s.edges.filter((e) => e.sourceId !== id && e.targetId !== id) })),

      createEdge: (sourceId, targetId, type, weight, category) =>
        set((s) => {
          if (sourceId === targetId || s.edges.some((e) => e.sourceId === sourceId && e.targetId === targetId && e.type === type)) return {};
          const e: SecisEdge = { id: uid("edge"), sourceId, targetId, type, weight, category, createdAt: now() };
          return { edges: [...s.edges, e], history: [event(s, "edge_created", `Linked ${type}`, { entityId: sourceId }), ...s.history] };
        }),
      removeEdge: (id) => set((s) => ({ edges: s.edges.filter((e) => e.id !== id), history: [event(s, "edge_removed", `Removed dependency`, {}), ...s.history] })),

      createEvent: (input) => {
        const id = uid("ce");
        const u = currentUser(get());
        const ev: ChangeEvent = {
          id,
          name: input.name,
          type: input.type,
          description: input.description,
          originEntityId: input.originEntityId,
          magnitude: input.magnitude,
          horizonPeriods: input.horizonPeriods,
          parameters: input.parameters,
          tags: input.tags,
          ownerId: u.id,
          ownerName: u.name,
          visibility: get().settings.defaultVisibility,
          workflowState: "draft",
          version: 1,
          status: "active",
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ changeEvents: [ev, ...s.changeEvents], history: [event(s, "event_created", `Created change event '${input.name}'`, { changeEventId: id }), ...s.history] }));
        return id;
      },
      updateEvent: (id, patch) => set((s) => ({ changeEvents: s.changeEvents.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now() } : x)), history: [event(s, "event_updated", `Updated change event`, { changeEventId: id }), ...s.history] })),

      analyzeEvent: (id) =>
        set((s) => {
          const ev = s.changeEvents.find((x) => x.id === id);
          if (!ev) return {};
          const { propagation, impact, risk } = analyzeChange(ev, s.entities, s.edges, { severityThreshold: s.settings.severityThreshold, maxDepth: s.settings.maxDepth });
          let recs = s.recommendations;
          if (s.settings.autoGenerateRecommendations) {
            const derived = generateRecommendations(ev, propagation, impact, risk);
            const fresh: Recommendation[] = derived.map((d) => ({ id: uid("rec"), changeEventId: id, category: d.category, title: d.title, action: d.action, rationale: d.rationale, expectedImpact: d.expectedImpact, priority: d.priority, interventionId: d.interventionId, createdAt: now() }));
            recs = [...fresh, ...s.recommendations.filter((r) => r.changeEventId !== id)];
          }
          return {
            recommendations: recs,
            changeEvents: s.changeEvents.map((x) => (x.id === id ? { ...x, lastAnalyzedAt: now() } : x)),
            history: [event(s, "event_analyzed", `Ran impact analysis for '${ev.name}'`, { changeEventId: id, meta: { affected: propagation.affected.length, risk: risk.score } }), ...s.history],
          };
        }),

      archiveEvent: (id) => set((s) => ({ changeEvents: s.changeEvents.map((x) => (x.id === id ? { ...x, status: "archived", workflowState: "archived", updatedAt: now() } : x)), history: [event(s, "event_archived", `Archived change event`, { changeEventId: id }), ...s.history] })),

      transitionWorkflow: (id, to) =>
        set((s) => {
          const ev = s.changeEvents.find((x) => x.id === id);
          if (!ev) return {};
          return {
            changeEvents: s.changeEvents.map((x) => (x.id === id ? { ...x, workflowState: to, updatedAt: now() } : x)),
            history: [event(s, "workflow_transition", `Workflow: ${ev.workflowState} → ${to}`, { changeEventId: id, meta: { from: ev.workflowState, to } }), ...s.history],
          };
        }),

      recordApproval: (id, approved, note) =>
        set((s) => ({
          changeEvents: approved ? s.changeEvents.map((x) => (x.id === id && x.workflowState === "review" ? { ...x, workflowState: "approved", updatedAt: now() } : x)) : s.changeEvents,
          history: [event(s, "approval_recorded", approved ? `Approved change event` : `Approval declined`, { changeEventId: id, meta: { note } }), ...s.history],
        })),

      acceptRecommendation: (id) => set((s) => ({ recommendations: s.recommendations.map((r) => (r.id === id ? { ...r, accepted: true } : r)), history: [event(s, "recommendation_accepted", `Accepted recommendation`, {}), ...s.history] })),

      applyMitigation: (changeEventId, interventionId, note) =>
        set((s) => {
          const intervention = getIntervention(interventionId);
          const mitigation: Mitigation = { id: uid("mit"), changeEventId, interventionId, name: intervention?.name ?? "Mitigation", status: "applied", appliedBy: currentUser(s).id, note, createdAt: now() };
          return { mitigations: [mitigation, ...s.mitigations], history: [event(s, "mitigation_applied", `Applied mitigation: ${mitigation.name}`, { changeEventId }), ...s.history] };
        }),

      recordDecision: (input) =>
        set((s) => ({ decisions: [{ id: uid("dec"), decidedBy: currentUser(s).id, createdAt: now(), ...input }, ...s.decisions], history: [event(s, "decision_recorded", `Decision: ${input.title}`, { changeEventId: input.changeEventId, runId: input.evolutionRunId }), ...s.history] })),

      createScenario: (input) => {
        const id = uid("scn");
        const u = currentUser(get());
        const scenario: SecisScenario = { id, name: input.name, description: input.description, changeEventId: input.changeEventId, interventionIds: input.interventionIds, constraintIds: [], ownerId: u.id, createdAt: now(), updatedAt: now() };
        set((s) => ({ scenarios: [scenario, ...s.scenarios], history: [event(s, "scenario_created", `Created scenario '${input.name}'`, { changeEventId: input.changeEventId }), ...s.history] }));
        return id;
      },
      deleteScenario: (id) => set((s) => ({ scenarios: s.scenarios.filter((x) => x.id !== id) })),

      startEvolutionRun: (changeEventId, interventionIds, name, scenarioId) => {
        const id = uid("evo");
        set((s) => {
          const ev = s.changeEvents.find((x) => x.id === changeEventId);
          if (!ev) return {};
          const run: EvolutionRun = {
            id,
            changeEventId,
            changeEventName: ev.name,
            scenarioId,
            name: name || `${ev.name} · run`,
            interventionIds,
            status: "running",
            progress: 0,
            startedAt: now(),
            runtimeMs: 0,
            triggeredBy: currentUser(s).id,
            logs: [{ at: now(), level: "info", message: "Run started" }],
          };
          return { evolutionRuns: [run, ...s.evolutionRuns], history: [event(s, "evolution_started", `Started evolution run for '${ev.name}'`, { changeEventId, runId: id }), ...s.history] };
        });
        return id;
      },
      setRunProgress: (runId, progress) => set((s) => ({ evolutionRuns: s.evolutionRuns.map((r) => (r.id === runId ? { ...r, progress: Math.min(100, Math.max(0, progress)) } : r)) })),
      appendRunLog: (runId, message, level = "info") => set((s) => ({ evolutionRuns: s.evolutionRuns.map((r) => (r.id === runId ? { ...r, logs: [...r.logs, { at: now(), level, message }] } : r)) })),
      pauseRun: (runId) => set((s) => ({ evolutionRuns: s.evolutionRuns.map((r) => (r.id === runId && r.status === "running" ? { ...r, status: "paused", logs: [...r.logs, { at: now(), level: "warn", message: "Run paused" }] } : r)) })),
      resumeRun: (runId) => set((s) => ({ evolutionRuns: s.evolutionRuns.map((r) => (r.id === runId && r.status === "paused" ? { ...r, status: "running", logs: [...r.logs, { at: now(), level: "info", message: "Run resumed" }] } : r)) })),
      cancelRun: (runId) => set((s) => ({ evolutionRuns: s.evolutionRuns.map((r) => (r.id === runId && (r.status === "running" || r.status === "paused") ? { ...r, status: "cancelled", completedAt: now(), logs: [...r.logs, { at: now(), level: "error", message: "Run cancelled" }] } : r)), history: [event(s, "evolution_cancelled", `Cancelled evolution run`, { runId }), ...s.history] })),

      completeRun: (runId) =>
        set((s) => {
          const run = s.evolutionRuns.find((r) => r.id === runId);
          if (!run || run.status === "completed" || run.status === "cancelled") return {};
          const ev = s.changeEvents.find((x) => x.id === run.changeEventId);
          if (!ev) return {};
          const { propagation, impact } = analyzeChange(ev, s.entities, s.edges, { severityThreshold: s.settings.severityThreshold, maxDepth: s.settings.maxDepth });
          const interventions = run.interventionIds.map(getIntervention).filter(Boolean) as NonNullable<ReturnType<typeof getIntervention>>[];
          const result = runEvolution(ev, propagation, impact, interventions, s.entities);
          const runtimeMs = Math.max(600, Date.parse(now()) - Date.parse(run.startedAt));
          return {
            evolutionRuns: s.evolutionRuns.map((r) => (r.id === runId ? { ...r, status: "completed", progress: 100, completedAt: now(), runtimeMs, result, logs: [...r.logs, { at: now(), level: "info", message: "Run completed" }] } : r)),
            history: [event(s, "evolution_completed", `Completed evolution run '${run.name}'`, { changeEventId: run.changeEventId, runId }), ...s.history],
          };
        }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetToSeed: () => {
        const seed = buildSeed();
        set({
          systems: SEED_SYSTEMS,
          subsystems: SEED_SUBSYSTEMS,
          entities: SEED_ENTITIES,
          edges: SEED_EDGES,
          changeEvents: SEED_EVENTS,
          recommendations: seed.recommendations,
          evolutionRuns: seed.evolutionRuns,
          scenarios: seed.scenarios,
          decisions: seed.decisions,
          mitigations: seed.mitigations,
          history: seed.history,
        });
      },
    }),
    { name: "vendorhub-secis", version: 1 },
  ),
);
