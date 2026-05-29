import { describe, it, expect, beforeEach } from "vitest";
import { listModels, validateGovernance, canTransition, registrySummary } from "@/lib/ai-platform/registry";
import {
  populationStabilityIndex,
  psiStatus,
  toDistribution,
  freshnessDrift,
  embeddingCentroidDrift,
} from "@/lib/ai-platform/drift";
import { runInference } from "@/lib/ai-platform/inference";
import { resetCircuitsForTests } from "@/lib/reliability/circuit-breaker";
import { faultInjector } from "@/lib/reliability/fault-injection";

beforeEach(() => {
  resetCircuitsForTests();
  faultInjector.configure({ enabled: false, rules: [] });
});

describe("model registry governance", () => {
  it("every model has an owner and version (no orphan intelligence)", () => {
    for (const m of listModels()) {
      expect(m.owner, `${m.key} owner`).toBeTruthy();
      expect(m.version, `${m.key} version`).toBeTruthy();
    }
  });

  it("the committed catalog passes governance (no production model without eval/lineage/risk)", () => {
    expect(validateGovernance()).toEqual([]);
  });

  it("flags a production model that lacks evaluation metrics", () => {
    const bad = [
      {
        key: "x", name: "x", purpose: "", owner: "o", type: "t", implementation: "",
        inputSchema: {}, outputSchema: {}, trainingSource: "",
        evaluation: { metrics: [], lastEvaluatedAt: null },
        version: "1.0.0", state: "production" as const, risk: "low" as const,
        businessImpact: "", lineage: { consumes: ["a"], produces: ["b"] },
      },
    ];
    const v = validateGovernance(bad);
    expect(v.some((x) => x.rule === "eval_required_for_prod")).toBe(true);
  });

  it("enforces valid lifecycle transitions", () => {
    expect(canTransition("staging", "production")).toBe(true);
    expect(canTransition("development", "production")).toBe(false);
    expect(canTransition("production", "staging")).toBe(true); // rollback/hold
  });

  it("summary reports unevaluated production models honestly", () => {
    const s = registrySummary();
    expect(s.total).toBeGreaterThan(0);
    expect(s.unevaluatedProduction).toBeGreaterThan(0);
  });
});

describe("drift detection", () => {
  it("PSI ~0 for identical distributions, large for shifted", () => {
    const base = toDistribution([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5, [0, 10]);
    const same = toDistribution([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5, [0, 10]);
    const shifted = toDistribution([8, 9, 10, 9, 10, 8, 9, 10, 9, 10], 5, [0, 10]);
    expect(populationStabilityIndex(base, same)).toBeLessThan(0.01);
    expect(populationStabilityIndex(base, shifted)).toBeGreaterThan(0.25);
    expect(psiStatus(populationStabilityIndex(base, shifted))).toBe(2);
  });

  it("freshness drift flags stale artifacts", () => {
    const fresh = freshnessDrift(new Date().toISOString(), 24);
    const stale = freshnessDrift(new Date(Date.now() - 48 * 3.6e6).toISOString(), 24);
    expect(fresh.status).toBe(0);
    expect(stale.status).toBe(2);
    expect(freshnessDrift(null, 24).status).toBe(2);
  });

  it("embedding centroid drift detects directional shift", () => {
    const a = embeddingCentroidDrift([1, 0, 0], [1, 0, 0]);
    const b = embeddingCentroidDrift([1, 0, 0], [0, 1, 0]);
    expect(a.status).toBe(0);
    expect(b.status).toBe(2);
  });
});

describe("inference platform", () => {
  it("returns the model result on success", async () => {
    const r = await runInference("hybrid-ranking", async () => ["a", "b"], { breaker: false });
    expect(r).toEqual(["a", "b"]);
  });

  it("serves fallback (degrades, never throws) when inference fails", async () => {
    const r = await runInference(
      "recommendation-engine",
      async () => {
        throw new Error("model down");
      },
      { fallback: () => ["safe-default"] },
    );
    expect(r).toEqual(["safe-default"]);
  });

  it("enforces a latency budget via timeout + fallback", async () => {
    const r = await runInference(
      "semantic-search",
      () => new Promise((resolve) => setTimeout(() => resolve("late"), 200)),
      { timeoutMs: 20, fallback: () => "fallback", breaker: false },
    );
    expect(r).toBe("fallback");
  });
});
