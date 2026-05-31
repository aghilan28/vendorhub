import { describe, expect, it } from "vitest";
import {
  FLOW_SUBSYSTEM_IDS,
  getDependencies,
  getPlatformModel,
  getScenario,
  getScenariosForUseCase,
  getSubsystem,
  getUseCase,
  intelligenceFlow,
  scenarios,
  subsystems,
  tours,
  useCases,
  validatePlatformModel,
  valueMetrics,
} from "@/lib/platform";

const EXPECTED_FLOW = ["research", "knowledge", "simulation", "secis", "governance", "execution"];

describe("Phase N platform model integrity", () => {
  it("passes its own internal integrity validation", () => {
    const report = validatePlatformModel();
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("assembles a complete, non-empty model", () => {
    const model = getPlatformModel();
    expect(model.subsystems.length).toBe(8);
    expect(model.flow.length).toBe(6);
    expect(model.scenarios.length).toBeGreaterThanOrEqual(7);
    expect(model.useCases.length).toBe(8);
    expect(model.valueMetrics.length).toBeGreaterThanOrEqual(7);
    expect(model.tours.length).toBeGreaterThanOrEqual(9);
    expect(model.docs.length).toBeGreaterThanOrEqual(6);
  });

  it("is deterministic across calls", () => {
    expect(getPlatformModel()).toEqual(getPlatformModel());
  });

  it("has exactly six flow subsystems and two fabric layers", () => {
    expect(subsystems.filter((s) => s.layerKind === "flow").length).toBe(6);
    expect(subsystems.filter((s) => s.layerKind === "fabric").length).toBe(2);
  });
});

describe("Phase N intelligence flow", () => {
  it("orders the canonical six stages correctly", () => {
    expect(FLOW_SUBSYSTEM_IDS).toEqual(EXPECTED_FLOW);
    expect(intelligenceFlow.map((stage) => stage.order)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("derives flow titles from subsystem names", () => {
    for (const stage of intelligenceFlow) {
      const subsystem = getSubsystem(stage.subsystemId);
      expect(subsystem).toBeDefined();
      expect(stage.title).toBe(subsystem!.name);
    }
  });
});

describe("Phase N subsystem value content", () => {
  it("provides full value-explanation fields for every subsystem", () => {
    for (const subsystem of subsystems) {
      expect(subsystem.what.length).toBeGreaterThan(0);
      expect(subsystem.why.length).toBeGreaterThan(0);
      expect(subsystem.problem.length).toBeGreaterThan(0);
      expect(subsystem.value.length).toBeGreaterThan(0);
      expect(subsystem.beneficiaries.length).toBeGreaterThan(0);
      expect(subsystem.capabilities.length).toBeGreaterThan(0);
    }
  });

  it("resolves dependencies to known subsystems", () => {
    const deps = getDependencies("execution");
    expect(deps.map((d) => d.id)).toContain("governance");
    expect(getDependencies("research")).toEqual([]);
  });
});

describe("Phase N demo scenarios", () => {
  it("each scenario walks the full intelligence flow in order", () => {
    for (const scenario of scenarios) {
      expect(scenario.stages.map((stage) => stage.subsystemId)).toEqual(EXPECTED_FLOW);
      expect(scenario.impact.length).toBeGreaterThan(0);
      expect(scenario.outcome.length).toBeGreaterThan(0);
    }
  });

  it("includes the mandated demonstration scenarios", () => {
    const ids = scenarios.map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "supplier-failure",
        "demand-surge",
        "inventory-crisis",
        "pricing-change",
        "logistics-disruption",
        "store-expansion",
        "customer-growth",
      ]),
    );
  });

  it("looks up scenarios by id", () => {
    expect(getScenario("supplier-failure")?.title).toBe("Supplier Failure");
    expect(getScenario("missing")).toBeUndefined();
  });
});

describe("Phase N use cases", () => {
  it("covers the mandated domains", () => {
    expect(useCases.map((u) => u.id)).toEqual(
      expect.arrayContaining([
        "retail",
        "commerce",
        "inventory",
        "supply-chain",
        "pricing",
        "expansion",
        "operations",
        "risk-management",
      ]),
    );
  });

  it("links every use case to at least one resolvable scenario", () => {
    for (const useCase of useCases) {
      const linked = getScenariosForUseCase(useCase.id);
      expect(linked.length).toBeGreaterThan(0);
      expect(linked.every((scenario) => Boolean(scenario))).toBe(true);
    }
  });

  it("looks up use cases by id", () => {
    expect(getUseCase("retail")?.name).toBe("Retail");
  });
});

describe("Phase N business value metrics", () => {
  it("includes every mandated value category", () => {
    const ids = valueMetrics.map((m) => m.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "revenue-impact",
        "risk-reduction",
        "decision-quality",
        "execution-efficiency",
        "knowledge-reuse",
        "operational-impact",
        "strategic-impact",
      ]),
    );
    for (const metric of valueMetrics) {
      expect(metric.trend.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("Phase N tours", () => {
  it("provides a complete tour plus one per subsystem", () => {
    expect(tours.some((tour) => tour.id === "tour-complete")).toBe(true);
    for (const subsystem of subsystems) {
      expect(tours.some((tour) => tour.id === `tour-${subsystem.id}`)).toBe(true);
    }
  });

  it("references only valid subsystems (or null) in every step", () => {
    for (const tour of tours) {
      expect(tour.steps.length).toBeGreaterThan(0);
      for (const step of tour.steps) {
        if (step.subsystemId !== null) {
          expect(getSubsystem(step.subsystemId)).toBeDefined();
        }
      }
    }
  });
});
