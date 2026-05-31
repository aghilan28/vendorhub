import { describe, expect, it } from "vitest";
import {
  buildSearchIndex,
  getPlatformModel,
  platformGuides,
  scenarios,
  searchKindLabel,
  searchPlatform,
  SEARCH_DOMAINS,
  validatePlatformModel,
} from "@/lib/platform";

describe("Phase O — platform completion integrity", () => {
  it("keeps the platform model internally consistent", () => {
    expect(validatePlatformModel().ok).toBe(true);
  });

  it("exposes the full model unchanged (no new subsystems added in Phase O)", () => {
    const model = getPlatformModel();
    expect(model.subsystems.length).toBe(8);
    expect(model.flow.length).toBe(6);
  });
});

describe("Phase O.10 — audience guides", () => {
  it("provides all eight mandated guides with non-empty sections", () => {
    const ids = platformGuides.map((g) => g.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "platform",
        "architecture",
        "capability",
        "user",
        "demo",
        "judge",
        "investor",
        "faculty",
      ]),
    );
    for (const guide of platformGuides) {
      expect(guide.title.length).toBeGreaterThan(0);
      expect(guide.audience.length).toBeGreaterThan(0);
      expect(guide.sections.length).toBeGreaterThan(0);
      for (const section of guide.sections) {
        expect(section.heading.length).toBeGreaterThan(0);
        expect(section.body.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Phase O.7 — unified platform search", () => {
  it("indexes every kind of platform entity", () => {
    const index = buildSearchIndex();
    const kinds = new Set(index.map((entry) => entry.kind));
    expect(kinds).toEqual(
      new Set(["subsystem", "scenario", "use-case", "metric", "tour", "document", "guide"]),
    );
    expect(index.length).toBeGreaterThan(30);
  });

  it("returns nothing for an empty query and ranked results for a real one", () => {
    expect(searchPlatform("")).toEqual([]);
    const results = searchPlatform("supplier");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.kind === "scenario" && r.id === "supplier-failure")).toBe(true);
  });

  it("reaches each intelligence subsystem by name", () => {
    for (const term of ["research", "knowledge", "simulation", "secis", "governance", "execution"]) {
      const results = searchPlatform(term);
      expect(results.length).toBeGreaterThan(0);
    }
  });

  it("produces navigable hrefs and labelled kinds", () => {
    const results = searchPlatform("pricing");
    for (const result of results) {
      expect(result.href.startsWith("/")).toBe(true);
      expect(searchKindLabel(result.kind).length).toBeGreaterThan(0);
    }
  });

  it("is deterministic for the same query", () => {
    expect(searchPlatform("revenue")).toEqual(searchPlatform("revenue"));
  });

  it("documents every certified search domain", () => {
    expect(SEARCH_DOMAINS.length).toBeGreaterThanOrEqual(10);
  });
});

describe("Phase O.8 — demo scenarios complete end-to-end", () => {
  it("every mandated demo scenario exists and walks all six stages", () => {
    const required = [
      "supplier-failure",
      "demand-surge",
      "inventory-crisis",
      "pricing-change",
      "store-expansion",
      "customer-growth",
    ];
    for (const id of required) {
      const scenario = scenarios.find((s) => s.id === id);
      expect(scenario, `scenario ${id} must exist`).toBeDefined();
      expect(scenario!.stages.length).toBe(6);
      expect(scenario!.impact.length).toBeGreaterThan(0);
      expect(scenario!.outcome.length).toBeGreaterThan(0);
    }
  });
});
