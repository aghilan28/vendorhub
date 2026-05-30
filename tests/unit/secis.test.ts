import { describe, expect, it } from "vitest";
import {
  analyzeChange,
  buildAdjacency,
  can,
  generateRecommendations,
  getIntervention,
  influenceReach,
  propagate,
  runEvolution,
  type ChangeEvent,
  type SecisEdge,
  type SecisEntity,
  type SecisUser,
} from "@/lib/secis";

const settings = { severityThreshold: 0.06, maxDepth: 6 };

function entity(id: string, partial: Partial<SecisEntity> = {}): SecisEntity {
  return {
    id,
    name: id,
    kind: "supplier",
    systemId: "sys",
    criticality: 0.7,
    vulnerability: 0.6,
    resilience: 0.5,
    monthlyRevenueExposure: 1_000_000,
    tags: [],
    status: "active",
    ownerId: "u",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

let seq = 0;
function edge(sourceId: string, targetId: string, weight = 0.8): SecisEdge {
  seq += 1;
  return { id: `e${seq}`, sourceId, targetId, category: "dependency", type: "supplies", weight, createdAt: "2026-01-01T00:00:00.000Z" };
}

const ENTITIES: SecisEntity[] = [
  entity("a", { kind: "supplier", criticality: 0.9 }),
  entity("b", { kind: "warehouse" }),
  entity("c", { kind: "dark_store" }),
  entity("d", { kind: "customer_segment", criticality: 0.8 }),
  entity("isolated", { kind: "marketing_channel" }),
];
const EDGES: SecisEdge[] = [edge("a", "b", 0.9), edge("b", "c", 0.8), edge("c", "d", 0.7)];

function changeEvent(originEntityId: string, magnitude = 0.8): ChangeEvent {
  return {
    id: "ce",
    name: "Test event",
    type: "supplier_failure",
    description: "",
    originEntityId,
    magnitude,
    horizonPeriods: 12,
    parameters: {},
    tags: [],
    ownerId: "u",
    ownerName: "u",
    visibility: "team",
    workflowState: "draft",
    version: 1,
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("SECIS graph", () => {
  it("computes downstream influence reach", () => {
    const adj = buildAdjacency(EDGES);
    expect(influenceReach("a", adj)).toBe(3); // b, c, d
    expect(influenceReach("d", adj)).toBe(0);
  });
});

describe("SECIS propagation", () => {
  it("propagates from the origin with decaying severity over hops", () => {
    const result = propagate(changeEvent("a"), ENTITIES, EDGES, settings);
    const origin = result.affected.find((x) => x.entityId === "a")!;
    const b = result.affected.find((x) => x.entityId === "b")!;
    const c = result.affected.find((x) => x.entityId === "c")!;
    expect(origin.depth).toBe(0);
    expect(origin.severity).toBeGreaterThan(b.severity);
    expect(b.severity).toBeGreaterThan(c.severity);
    expect(result.affected.some((x) => x.entityId === "isolated")).toBe(false);
    expect(result.totalRevenueAtRisk).toBeGreaterThan(0);
    expect(result.maxDepth).toBeGreaterThanOrEqual(2);
  });

  it("is deterministic", () => {
    const a = propagate(changeEvent("a"), ENTITIES, EDGES, settings);
    const b = propagate(changeEvent("a"), ENTITIES, EDGES, settings);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it("contains impact when the origin has no dependents", () => {
    const result = propagate(changeEvent("isolated"), ENTITIES, EDGES, settings);
    expect(result.affected).toHaveLength(1);
    expect(result.paths).toHaveLength(0);
  });
});

describe("SECIS impact + risk", () => {
  it("produces 8 impact dimensions and a risk level", () => {
    const { impact, risk } = analyzeChange(changeEvent("a"), ENTITIES, EDGES, settings);
    expect(impact.dimensions).toHaveLength(8);
    expect(impact.totalRevenueAtRisk).toBeGreaterThan(0);
    expect(["low", "medium", "high", "critical"]).toContain(risk.level);
    expect(risk.score).toBeGreaterThanOrEqual(0);
    expect(risk.score).toBeLessThanOrEqual(100);
  });

  it("higher magnitude yields higher or equal risk", () => {
    const low = analyzeChange(changeEvent("a", 0.3), ENTITIES, EDGES, settings).risk.score;
    const high = analyzeChange(changeEvent("a", 0.95), ENTITIES, EDGES, settings).risk.score;
    expect(high).toBeGreaterThanOrEqual(low);
  });
});

describe("SECIS evolution", () => {
  it("interventions improve recovery vs baseline", () => {
    const ev = changeEvent("a");
    const { propagation, impact } = analyzeChange(ev, ENTITIES, EDGES, settings);
    const baseline = runEvolution(ev, propagation, impact, [], ENTITIES);
    const intervention = runEvolution(ev, propagation, impact, [getIntervention("intv-backup-supplier")!, getIntervention("intv-safety-stock")!], ENTITIES);
    expect(intervention.resilienceScore).toBeGreaterThanOrEqual(baseline.resilienceScore);
    expect(intervention.residualImpactPct).toBeLessThanOrEqual(baseline.residualImpactPct);
    expect(intervention.interventionCost).toBeGreaterThan(0);
    expect(baseline.baselineSeries.length).toBeGreaterThan(0);
  });
});

describe("SECIS recommendations + RBAC", () => {
  it("generates recommendations from an analysis", () => {
    const ev = changeEvent("a");
    const { propagation, impact, risk } = analyzeChange(ev, ENTITIES, EDGES, settings);
    const recs = generateRecommendations(ev, propagation, impact, risk);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((r) => r.title && r.action)).toBe(true);
  });

  it("enforces role permissions", () => {
    const admin: SecisUser = { id: "1", name: "A", role: "admin" };
    const viewer: SecisUser = { id: "2", name: "V", role: "viewer" };
    const operator: SecisUser = { id: "3", name: "O", role: "operator" };
    expect(can(admin, "settings.manage")).toBe(true);
    expect(can(viewer, "event.run")).toBe(false);
    expect(can(operator, "event.run")).toBe(true);
    expect(can(operator, "entity.manage")).toBe(false);
    expect(can(null, "event.create")).toBe(false);
  });
});
