import { describe, expect, it } from "vitest";
import {
  AttributeRegistry,
  TAXONOMY_LEVEL_DEPTH,
  TaxonomyEngine,
  TaxonomyGovernance,
  buildAffinityGraph,
  buildCanonicalTaxonomyEngine,
  buildCanonicalTaxonomyInputs,
  buildIntelligenceProjection,
  buildSearchIndex,
  buildSynonymGroups,
  certifyScaleTarget,
  createDeterministicClock,
  nodesForSearchTerm,
  resolveInputs,
  runScaleCertification,
  similarityScore,
  validateTaxonomy,
  type TaxonomyNode,
  type TaxonomyNodeInput,
  type TaxonomyNodeLevel,
} from "@/lib/taxonomy";

function fixedClock() {
  return createDeterministicClock(1_700_000_000_000, 1_000);
}

function smallInputs(): TaxonomyNodeInput[] {
  return [
    { id: "groceries", level: "DEPARTMENT", name: "Groceries", parentId: null, attributeKeys: ["organic"] },
    { id: "groceries-rice", level: "CATEGORY", name: "Rice", parentId: "groceries" },
    { id: "groceries-rice-basmati", level: "SUBCATEGORY", name: "Basmati Rice", parentId: "groceries-rice" },
    { id: "groceries-rice-sona", level: "SUBCATEGORY", name: "Sona Masoori", parentId: "groceries-rice" },
    { id: "groceries-oils", level: "CATEGORY", name: "Edible Oils", parentId: "groceries", attributeKeys: ["organic"] },
  ];
}

function craft(partial: Partial<TaxonomyNode> & { id: string; level: TaxonomyNodeLevel }): TaxonomyNode {
  return {
    id: partial.id,
    level: partial.level,
    depth: partial.depth ?? TAXONOMY_LEVEL_DEPTH[partial.level],
    slug: partial.slug ?? partial.id,
    localSlug: partial.localSlug ?? partial.id,
    name: partial.name ?? partial.id,
    parentId: partial.parentId ?? null,
    path: partial.path ?? partial.id,
    pathIds: partial.pathIds ?? [partial.id],
    names: partial.names ?? {},
    synonyms: partial.synonyms ?? [],
    searchTerms: partial.searchTerms ?? [],
    attributeKeys: partial.attributeKeys ?? [],
    seo: partial.seo ?? { metaTitle: "", metaDescription: "", keywords: [], canonicalPath: "" },
    regions: partial.regions ?? [],
    sortOrder: partial.sortOrder ?? 0,
    status: partial.status ?? "ACTIVE",
    isActive: partial.isActive ?? true,
    version: partial.version ?? 1,
    createdAt: partial.createdAt ?? "",
    updatedAt: partial.updatedAt ?? "",
    deletedAt: partial.deletedAt ?? null,
    mergedIntoId: partial.mergedIntoId ?? null,
    metadata: partial.metadata ?? {},
  };
}

describe("taxonomy hierarchy traversal & lookups", () => {
  const engine = TaxonomyEngine.fromInputs(smallInputs(), { clock: fixedClock() });

  it("resolves the six-level structure with correct depths and paths", () => {
    expect(engine.getNode("groceries")?.depth).toBe(0);
    expect(engine.getNode("groceries-rice")?.depth).toBe(1);
    expect(engine.getNode("groceries-rice-basmati")?.depth).toBe(2);
    expect(engine.getNode("groceries-rice-basmati")?.path).toBe("groceries/rice/basmati-rice");
    expect(engine.getNode("groceries-rice-basmati")?.slug).toBe("groceries-rice-basmati-rice");
  });

  it("supports parent, child, ancestor, descendant and sibling lookups", () => {
    expect(engine.getParent("groceries-rice")?.id).toBe("groceries");
    expect(engine.getChildren("groceries").map((node) => node.id).sort()).toEqual(["groceries-oils", "groceries-rice"]);
    expect(engine.getAncestors("groceries-rice-basmati").map((node) => node.id)).toEqual(["groceries-rice", "groceries"]);
    expect(engine.getDescendants("groceries").length).toBe(4);
    expect(engine.getSiblings("groceries-rice-basmati").map((node) => node.id)).toEqual(["groceries-rice-sona"]);
  });

  it("resolves by slug and path and reports roots/leaves/levels", () => {
    expect(engine.getBySlug("groceries-rice")?.id).toBe("groceries-rice");
    expect(engine.getByPath("groceries/rice")?.id).toBe("groceries-rice");
    expect(engine.getRoots().map((node) => node.id)).toEqual(["groceries"]);
    expect(engine.getLeaves().map((node) => node.id).sort()).toEqual(["groceries-oils", "groceries-rice-basmati", "groceries-rice-sona"]);
    expect(engine.getByLevel("CATEGORY").length).toBe(2);
  });
});

describe("attribute framework", () => {
  it("defines reusable attributes with no duplicate keys", () => {
    const registry = new AttributeRegistry();
    const keys = registry.all().map((definition) => definition.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(registry.has("weight")).toBe(true);
  });

  it("resolves inherited attributes from ancestors (nearest wins, inherited flagged)", () => {
    const engine = TaxonomyEngine.fromInputs(smallInputs(), { clock: fixedClock() });
    const resolved = engine.resolveAttributes("groceries-rice-basmati");
    const organic = resolved.find((attribute) => attribute.key === "organic");
    expect(organic).toBeDefined();
    expect(organic?.inherited).toBe(true);
    expect(organic?.sourceNodeId).toBe("groceries");
  });
});

describe("validation engine — integrity failures", () => {
  it("detects circular references", () => {
    const report = validateTaxonomy([
      craft({ id: "a", level: "CATEGORY", parentId: "b" }),
      craft({ id: "b", level: "CATEGORY", parentId: "a" }),
    ]);
    expect(report.valid).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toContain("CIRCULAR_REFERENCE");
  });

  it("detects orphan nodes (missing parent)", () => {
    const report = validateTaxonomy([craft({ id: "x", level: "CATEGORY", parentId: "ghost" })]);
    expect(report.issues.map((issue) => issue.code)).toContain("ORPHAN_NODE");
  });

  it("detects duplicate slugs and duplicate paths", () => {
    const dupSlug = validateTaxonomy([
      craft({ id: "a", level: "DEPARTMENT", slug: "same", path: "a" }),
      craft({ id: "b", level: "DEPARTMENT", slug: "same", path: "b" }),
    ]);
    expect(dupSlug.issues.map((issue) => issue.code)).toContain("DUPLICATE_SLUG");

    const dupPath = validateTaxonomy([
      craft({ id: "a", level: "DEPARTMENT", slug: "a", path: "same" }),
      craft({ id: "b", level: "DEPARTMENT", slug: "b", path: "same" }),
    ]);
    expect(dupPath.issues.map((issue) => issue.code)).toContain("DUPLICATE_PATH");
  });

  it("detects broken hierarchy (level skipping)", () => {
    const report = validateTaxonomy([
      craft({ id: "d", level: "DEPARTMENT" }),
      craft({ id: "s", level: "SUBCATEGORY", parentId: "d", depth: 1 }),
    ]);
    expect(report.issues.map((issue) => issue.code)).toContain("BROKEN_HIERARCHY");
  });

  it("detects invalid parent on a department and missing root parent", () => {
    const invalidParent = validateTaxonomy([
      craft({ id: "root", level: "DEPARTMENT" }),
      craft({ id: "d2", level: "DEPARTMENT", parentId: "root" }),
    ]);
    expect(invalidParent.issues.map((issue) => issue.code)).toContain("INVALID_PARENT");

    const missingRoot = validateTaxonomy([craft({ id: "c", level: "CATEGORY", parentId: null, depth: 1 })]);
    expect(missingRoot.issues.map((issue) => issue.code)).toContain("MISSING_ROOT_PARENT");
  });

  it("detects depth violations and unknown attributes", () => {
    const depth = validateTaxonomy([craft({ id: "d", level: "DEPARTMENT", depth: 3 })]);
    expect(depth.issues.map((issue) => issue.code)).toContain("DEPTH_VIOLATION");

    const unknownAttr = validateTaxonomy([craft({ id: "d", level: "DEPARTMENT", attributeKeys: ["does_not_exist"] })]);
    expect(unknownAttr.issues.map((issue) => issue.code)).toContain("UNKNOWN_ATTRIBUTE");
  });

  it("passes a clean tree", () => {
    const engine = TaxonomyEngine.fromInputs(smallInputs(), { clock: fixedClock() });
    const report = validateTaxonomy(engine.nodes());
    expect(report.valid).toBe(true);
    expect(report.errorCount).toBe(0);
  });
});

describe("governance operations", () => {
  function gov() {
    return new TaxonomyGovernance(TaxonomyEngine.fromInputs(smallInputs(), { clock: fixedClock() }), { clock: fixedClock() });
  }

  it("creates, edits, deprecates, archives and restores nodes with an audit trail", () => {
    const governance = gov();
    const created = governance.create({ level: "CATEGORY", name: "Pulses & Dals", parentId: "groceries" }, "admin");
    expect(created.id).toBe("groceries-pulses-dals");
    expect(governance.engine().getNode("groceries-pulses-dals")).toBeDefined();

    const edited = governance.edit("groceries-pulses-dals", { synonyms: ["dal", "paruppu"] }, "admin");
    expect(edited.version).toBe(2);
    expect(edited.synonyms).toContain("paruppu");

    expect(governance.deprecate("groceries-oils", "admin").status).toBe("DEPRECATED");
    const archived = governance.archive("groceries-oils", "admin");
    expect(archived.status).toBe("ARCHIVED");
    expect(archived.deletedAt).not.toBeNull();
    expect(governance.restore("groceries-oils", "admin").status).toBe("ACTIVE");

    const operations = governance.audit().map((entry) => entry.operation);
    expect(operations).toEqual(["CREATE", "EDIT", "DEPRECATE", "ARCHIVE", "RESTORE"]);
  });

  it("merges nodes, reparenting children and marking the source MERGED", () => {
    const governance = gov();
    governance.create({ level: "CATEGORY", name: "Cooking Oils", parentId: "groceries" }, "admin");
    governance.create({ level: "SUBCATEGORY", name: "Sunflower Oil", parentId: "groceries-cooking-oils" }, "admin");

    const result = governance.merge(["groceries-cooking-oils"], "groceries-oils", "admin");
    expect(result.merged[0].status).toBe("MERGED");
    expect(result.merged[0].mergedIntoId).toBe("groceries-oils");

    const child = governance.engine().getNode("groceries-cooking-oils-sunflower-oil");
    expect(child?.parentId).toBe("groceries-oils");
  });

  it("splits a node into siblings and reassigns children", () => {
    const governance = gov();
    const result = governance.split(
      "groceries-rice",
      [
        { name: "Raw Rice", reassignChildIds: ["groceries-rice-basmati"] },
        { name: "Boiled Rice", reassignChildIds: ["groceries-rice-sona"] },
      ],
      "admin",
    );
    expect(result.created.map((node) => node.id).sort()).toEqual(["groceries-boiled-rice", "groceries-raw-rice"]);
    expect(result.source.status).toBe("SPLIT");
    expect(governance.engine().getNode("groceries-rice-basmati")?.parentId).toBe("groceries-raw-rice");
  });

  it("runs the approval workflow (submit -> approve applies, reject blocks)", () => {
    const governance = gov();
    const request = governance.submitChangeRequest("CREATE", { input: { level: "CATEGORY", name: "Salt", parentId: "groceries" } }, "editor");
    expect(request.status).toBe("PENDING_APPROVAL");
    const { request: applied } = governance.approveChangeRequest(request.id, "approver");
    expect(applied.status).toBe("APPLIED");
    expect(governance.engine().getNode("groceries-salt")).toBeDefined();

    const rejectable = governance.submitChangeRequest("ARCHIVE", { id: "groceries-oils" }, "editor");
    expect(governance.rejectChangeRequest(rejectable.id, "approver").status).toBe("REJECTED");
    expect(governance.engine().getNode("groceries-oils")?.status).toBe("ACTIVE");
  });
});

describe("search / recommendation / intelligence readiness", () => {
  const engine = TaxonomyEngine.fromInputs(smallInputs(), { clock: fixedClock() });

  it("produces search-ready documents, synonym groups and term lookups", () => {
    const index = buildSearchIndex(engine);
    const rice = index.find((document) => document.nodeId === "groceries-rice");
    expect(rice?.tokens).toContain("rice");
    expect(rice?.tokens).toContain("groceries");
    const groups = buildSynonymGroups(engine);
    expect(groups.get("rice")).toContain("groceries-rice");
    expect(nodesForSearchTerm(engine, "basmati").map((node) => node.id)).toContain("groceries-rice-basmati");
  });

  it("produces recommendation-ready affinity edges and deterministic similarity", () => {
    const graph = buildAffinityGraph(engine);
    expect(graph.edges.some((edge) => edge.relation === "sibling")).toBe(true);
    const score = similarityScore(engine, "groceries-rice-basmati", "groceries-rice-sona");
    expect(score).toBeGreaterThan(0);
    expect(similarityScore(engine, "groceries-rice-basmati", "groceries-rice-basmati")).toBe(1);
  });

  it("produces intelligence aggregation hooks and rollups", () => {
    const projection = buildIntelligenceProjection(engine);
    expect(projection.hooks.length).toBeGreaterThan(0);
    const grocery = projection.departmentRollups.find((rollup) => rollup.departmentId === "groceries");
    expect(grocery?.categories).toBe(2);
    expect(grocery?.subcategories).toBe(2);
  });
});

describe("canonical taxonomy", () => {
  it("provides 26+ departments and 500+ categories and validates cleanly", () => {
    const engine = buildCanonicalTaxonomyEngine({ clock: fixedClock() });
    const stats = engine.stats();
    expect(stats.byLevel.DEPARTMENT).toBeGreaterThanOrEqual(26);
    expect(stats.byLevel.CATEGORY).toBeGreaterThanOrEqual(500);
    const report = validateTaxonomy(engine.nodes(), { attributeRegistry: engine.attributes });
    expect(report.errorCount).toBe(0);
    expect(report.warningCount).toBe(0);
  });

  it("expresses the full six-level hierarchy at least once", () => {
    const engine = buildCanonicalTaxonomyEngine({ clock: fixedClock() });
    const variantGroup = engine.getByLevel("VARIANT_GROUP")[0];
    expect(variantGroup).toBeDefined();
    expect(engine.getAncestors(variantGroup.id).length).toBe(5);
  });

  it("is deterministic across builds", () => {
    const first = JSON.stringify(resolveInputs(buildCanonicalTaxonomyInputs(), { clock: fixedClock() }));
    const second = JSON.stringify(resolveInputs(buildCanonicalTaxonomyInputs(), { clock: fixedClock() }));
    expect(first).toBe(second);
  });
});

describe("scale certification", () => {
  it("certifies 500 / 1,000 / 5,000 / 10,000 categories with integrity and traversal", () => {
    const results = runScaleCertification([500, 1000, 5000, 10000]);
    for (const result of results) {
      expect(result.valid).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.traversalOk).toBe(true);
      expect(result.lookupOk).toBe(true);
      expect(result.totalNodes).toBeGreaterThanOrEqual(result.targetCategories);
    }
  });

  it("scales to 10,000 categories within a deterministic time bound", () => {
    const result = certifyScaleTarget(10000, { subcategoriesPerCategory: 1 });
    expect(result.totalNodes).toBeGreaterThanOrEqual(20000);
    expect(result.valid).toBe(true);
    expect(result.buildMs).toBeLessThan(5000);
  });
});
