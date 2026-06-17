import { describe, expect, it } from "vitest";
import {
  BUILT_IN_TEMPLATES,
  can,
  canEdit,
  compareRuns,
  defaultParameters,
  deriveInsights,
  deterministicSeed,
  getTemplate,
  runSimulationModel,
  type ModelKey,
  type Simulation,
  type SimulationRun,
  type SimulationUser,
} from "@/lib/simulation";

const MODELS: ModelKey[] = [
  "market_adoption",
  "demand_forecast",
  "revenue_projection",
  "pricing_sensitivity",
  "inventory_simulation",
  "competitive_dynamics",
];

describe("simulation OS engine", () => {
  it("produces a complete, well-formed result for every built-in model", () => {
    for (const template of BUILT_IN_TEMPLATES) {
      const result = runSimulationModel(template.modelKey, defaultParameters(template), 12345, []);
      expect(result.kpis.length).toBeGreaterThan(0);
      expect(result.series.length).toBeGreaterThan(0);
      expect(result.series[0].points.length).toBeGreaterThan(0);
      expect(result.table.columns.length).toBeGreaterThan(0);
      expect(result.table.rows.length).toBeGreaterThan(0);
      expect(result.sensitivity.length).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(result.risk.level);
      expect(result.kpis.some((k) => k.key === result.headlineKpiKey)).toBe(true);
      expect(result.outcomeSummary.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic: identical inputs and seed yield identical output", () => {
    const tpl = getTemplate("tpl-revenue-projection")!;
    const params = defaultParameters(tpl);
    const a = runSimulationModel(tpl.modelKey, params, 999, []);
    const b = runSimulationModel(tpl.modelKey, params, 999, []);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it("changes outcome when a different seed is used for stochastic models", () => {
    const tpl = getTemplate("tpl-revenue-projection")!;
    const params = defaultParameters(tpl);
    const a = runSimulationModel(tpl.modelKey, params, 1, []);
    const b = runSimulationModel(tpl.modelKey, params, 2, []);
    expect(JSON.stringify(a.series)).not.toEqual(JSON.stringify(b.series));
  });

  it("validates constraints and flags violations", () => {
    const tpl = getTemplate("tpl-inventory")!;
    const params = defaultParameters(tpl);
    // Impossible constraint to force a violation.
    const result = runSimulationModel(tpl.modelKey, params, 7, [
      { id: "c1", label: "Service level >= 100", metric: "service_level", operator: "gte", threshold: 100.0001 },
    ]);
    const check = result.constraintChecks.find((c) => c.constraintId === "c1");
    expect(check).toBeDefined();
    expect(check!.satisfied).toBe(false);
  });

  it("derives insights and recommendations from a result", () => {
    const tpl = getTemplate("tpl-pricing-sensitivity")!;
    const result = runSimulationModel(tpl.modelKey, defaultParameters(tpl), 42, tpl.defaultConstraints.map((c, i) => ({ id: `c${i}`, ...c })));
    const derived = deriveInsights(tpl.modelKey, result, "test scenario");
    expect(derived.insights.length).toBeGreaterThan(0);
    expect(derived.recommendations.length).toBeGreaterThan(0);
    expect(derived.insights.every((i) => i.confidence > 0 && i.confidence <= 1)).toBe(true);
  });

  it("deterministicSeed is stable for the same string", () => {
    expect(deterministicSeed("hello")).toEqual(deterministicSeed("hello"));
    expect(deterministicSeed("hello")).not.toEqual(deterministicSeed("world"));
  });
});

function makeRun(id: string, modelKey: ModelKey, seed: number): SimulationRun {
  const tpl = BUILT_IN_TEMPLATES.find((t) => t.modelKey === modelKey)!;
  const result = runSimulationModel(modelKey, defaultParameters(tpl), seed, []);
  return {
    id,
    simulationId: "sim",
    scenarioId: "scn",
    scenarioName: "scn",
    modelKey,
    label: `run ${id}`,
    status: "completed",
    progress: 100,
    seed,
    parameters: defaultParameters(tpl),
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    runtimeMs: 1000,
    triggeredBy: "u",
    logs: [],
    result,
    insightIds: [],
    recommendationIds: [],
  };
}

describe("simulation comparison", () => {
  it("compares completed runs and identifies a best run", () => {
    const runs = [makeRun("r1", "revenue_projection", 1), makeRun("r2", "revenue_projection", 50)];
    const comparison = compareRuns(runs);
    expect(comparison.runs.length).toBe(2);
    expect(comparison.sharedKpis.length).toBeGreaterThan(0);
    expect(comparison.bestRunId).toBeDefined();
    expect(["r1", "r2"]).toContain(comparison.bestRunId);
  });

  it("returns empty comparison when no completed runs are provided", () => {
    const comparison = compareRuns([]);
    expect(comparison.sharedKpis.length).toBe(0);
  });
});

describe("simulation RBAC", () => {
  const admin: SimulationUser = { id: "a", name: "Admin", role: "admin" };
  const analyst: SimulationUser = { id: "b", name: "Analyst", role: "analyst" };
  const viewer: SimulationUser = { id: "c", name: "Viewer", role: "viewer" };

  it("grants and denies permissions per role", () => {
    expect(can(admin, "settings.manage")).toBe(true);
    expect(can(analyst, "scenario.run")).toBe(true);
    expect(can(analyst, "settings.manage")).toBe(false);
    expect(can(viewer, "scenario.run")).toBe(false);
    expect(can(null, "simulation.create")).toBe(false);
  });

  it("controls edit access via ownership and role", () => {
    const sim: Simulation = {
      id: "sim",
      name: "S",
      description: "",
      category: "Growth",
      tags: [],
      modelKey: "demand_forecast",
      ownerId: "b",
      ownerName: "Analyst",
      visibility: "team",
      workflowState: "draft",
      version: 1,
      contributors: [{ userId: "b", name: "Analyst", role: "owner", addedAt: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(canEdit(analyst, sim)).toBe(true);
    expect(canEdit(viewer, sim)).toBe(false);
    expect(canEdit(admin, sim)).toBe(true);
  });
});
