import { describe, expect, it } from "vitest";
import { buildCanonicalTaxonomyEngine, createDeterministicClock } from "@/lib/taxonomy";
import {
  BrandClassification,
  BrandEngine,
  BrandGovernance,
  brandSimilarity,
  brandsForSearchTerm,
  buildBrandAffinityGraph,
  buildBrandIntelligenceProjection,
  buildBrandSearchIndex,
  buildBrandSynonymGroups,
  buildCanonicalBrandSystem,
  certifyBrandScaleTarget,
  resolveBrands,
  resolveCompanies,
  runBrandScaleCertification,
  validateBrandUniverse,
  type Brand,
  type BrandInput,
  type Company,
  type CompanyInput,
} from "@/lib/brands";

function fixedClock() {
  return createDeterministicClock(1_700_000_000_000, 1_000);
}

function smallCompanies(): CompanyInput[] {
  return [
    { id: "hul", name: "Hindustan Unilever", aliases: ["HUL", "Hindustan Unilever Limited"], industry: "FMCG" },
    { id: "unilever", name: "Unilever", industry: "FMCG" },
  ];
}

function smallBrands(): BrandInput[] {
  return [
    { id: "dove", name: "Dove", companyId: "hul", departments: ["personal-care"], aliases: ["Dove Soap"] },
    { id: "lux", name: "Lux", companyId: "hul", departments: ["personal-care"] },
    { id: "surf-excel", name: "Surf Excel", companyId: "hul", departments: ["household", "cleaning"] },
    { id: "amul-milk", name: "Amul Milk", companyId: null, departments: ["dairy"] },
  ];
}

function buildSmall() {
  return BrandEngine.fromInputs(smallBrands(), smallCompanies(), { clock: fixedClock() });
}

function craftBrand(partial: Partial<Brand> & { id: string }): Brand {
  return resolveBrands([{ id: partial.id, name: partial.name ?? partial.id, ...partial }])[0];
}

function craftCompany(partial: Partial<Company> & { id: string }): Company {
  return resolveCompanies([{ id: partial.id, name: partial.name ?? partial.id, ...partial }])[0];
}

describe("brand engine — creation, lookups, ownership traversal", () => {
  const engine = buildSmall();

  it("resolves brands and companies with slugs", () => {
    expect(engine.brandCount).toBe(4);
    expect(engine.companyCount).toBe(2);
    expect(engine.getBrand("dove")?.slug).toBe("dove");
    expect(engine.getBrandBySlug("lux")?.id).toBe("lux");
  });

  it("traverses brand -> company ownership", () => {
    expect(engine.getBrandsByCompany("hul").map((b) => b.id).sort()).toEqual(["dove", "lux", "surf-excel"]);
    const chain = engine.getOwnershipChain("dove");
    expect(chain[0].id).toBe("hul");
  });

  it("traverses company hierarchy (parent / subsidiary / ancestors)", () => {
    const e = BrandEngine.fromInputs(
      [{ id: "dove", name: "Dove", companyId: "hul", departments: ["personal-care"] }],
      [
        { id: "hul", name: "Hindustan Unilever", parentCompanyId: "unilever", industry: "FMCG" },
        { id: "unilever", name: "Unilever", industry: "FMCG" },
      ],
      { clock: fixedClock() },
    );
    expect(e.getParentCompany("hul")?.id).toBe("unilever");
    expect(e.getSubsidiaries("unilever").map((c) => c.id)).toEqual(["hul"]);
    expect(e.getOwnershipChain("dove").map((c) => c.id)).toEqual(["hul", "unilever"]);
    expect(e.getAllBrandsUnderCompany("unilever").map((b) => b.id)).toEqual(["dove"]);
  });
});

describe("brand classification against PP-1 taxonomy", () => {
  const taxonomy = buildCanonicalTaxonomyEngine({ clock: fixedClock() });
  const engine = buildSmall();
  const classification = new BrandClassification(engine, taxonomy);

  it("maps brands to real taxonomy departments", () => {
    expect(classification.getDepartmentsForBrand("dove").map((n) => n.slug)).toContain("personal-care");
    expect(classification.getBrandsForDepartment("personal-care").map((b) => b.id).sort()).toEqual(["dove", "lux"]);
    expect(classification.getBrandsForDepartment("household").map((b) => b.id)).toEqual(["surf-excel"]);
  });

  it("reports no unclassified brands or invalid mappings for the sample", () => {
    expect(classification.unclassifiedBrands()).toHaveLength(0);
    expect(classification.invalidMappings()).toHaveLength(0);
  });

  it("flags invalid taxonomy mapping", () => {
    const e = BrandEngine.fromInputs([{ id: "x", name: "X", departments: ["not-a-department"] }], [], { clock: fixedClock() });
    const c = new BrandClassification(e, taxonomy);
    expect(c.invalidMappings()).toHaveLength(1);
  });
});

describe("alias / search readiness", () => {
  const engine = buildSmall();

  it("builds brand search documents with company + alias surface forms", () => {
    const index = buildBrandSearchIndex(engine);
    const dove = index.find((doc) => doc.brandId === "dove");
    expect(dove?.companyName).toBe("Hindustan Unilever");
    expect(dove?.tokens).toContain("dove");
    expect(dove?.tokens).toContain("hindustan");
  });

  it("resolves company synonyms to brands (HUL -> Hindustan Unilever)", () => {
    const groups = buildBrandSynonymGroups(engine);
    expect(groups.get("hul")).toContain("dove");
    expect(brandsForSearchTerm(engine, "hul").map((b) => b.id)).toContain("dove");
    expect(brandsForSearchTerm(engine, "Hindustan Unilever").map((b) => b.id)).toContain("lux");
  });
});

describe("recommendation readiness", () => {
  const engine = buildSmall();

  it("builds affinity edges and groups, and deterministic similarity", () => {
    const graph = buildBrandAffinityGraph(engine);
    expect(graph.edges.some((e) => e.relation === "same_company")).toBe(true);
    expect(graph.groups.some((g) => g.kind === "company" && g.key === "hul")).toBe(true);
    expect(brandSimilarity(engine, "dove", "lux")).toBeGreaterThan(0);
    expect(brandSimilarity(engine, "dove", "dove")).toBe(1);
  });
});

describe("intelligence readiness", () => {
  it("builds hooks and aggregation buckets", () => {
    const engine = buildSmall();
    const projection = buildBrandIntelligenceProjection(engine);
    expect(projection.hooks.length).toBeGreaterThan(0);
    expect(projection.byDepartment["personal-care"]).toBe(2);
    expect(projection.topCompaniesByBrandCount[0].companyId).toBe("hul");
  });
});

describe("validation engine — failures", () => {
  it("detects duplicate brand slugs and ids", () => {
    const report = validateBrandUniverse(
      [craftBrand({ id: "a", slug: "same", departments: ["dairy"] }), craftBrand({ id: "b", slug: "same", departments: ["dairy"] })],
      [],
    );
    expect(report.issues.map((i) => i.code)).toContain("DUPLICATE_BRAND_SLUG");
  });

  it("detects broken ownership", () => {
    const report = validateBrandUniverse([craftBrand({ id: "a", companyId: "ghost", departments: ["dairy"] })], []);
    expect(report.issues.map((i) => i.code)).toContain("BROKEN_OWNERSHIP");
  });

  it("detects unclassified brands", () => {
    const report = validateBrandUniverse([craftBrand({ id: "a", departments: [], categories: [] })], []);
    expect(report.issues.map((i) => i.code)).toContain("UNCLASSIFIED_BRAND");
  });

  it("detects orphan companies", () => {
    const report = validateBrandUniverse([], [craftCompany({ id: "lonely", name: "Lonely Co" })]);
    expect(report.issues.map((i) => i.code)).toContain("ORPHAN_COMPANY");
  });

  it("detects circular ownership", () => {
    const report = validateBrandUniverse(
      [],
      [craftCompany({ id: "a", parentCompanyId: "b" }), craftCompany({ id: "b", parentCompanyId: "a" })],
    );
    expect(report.issues.map((i) => i.code)).toContain("CIRCULAR_OWNERSHIP");
  });

  it("detects alias conflicts", () => {
    const report = validateBrandUniverse(
      [craftBrand({ id: "a", departments: ["dairy"], aliases: ["Shared"] }), craftBrand({ id: "b", departments: ["dairy"], aliases: ["Shared"] })],
      [],
    );
    expect(report.issues.map((i) => i.code)).toContain("ALIAS_CONFLICT");
  });
});

describe("brand governance", () => {
  function gov() {
    return new BrandGovernance(buildSmall(), { clock: fixedClock() });
  }

  it("creates, edits, verifies, rejects, deprecates, archives and restores with audit", () => {
    const governance = gov();
    const created = governance.create({ name: "Lifebuoy", companyId: "hul", departments: ["personal-care"] }, "admin");
    expect(created.id).toBe("lifebuoy");
    expect(governance.edit("lifebuoy", { aliases: ["Life Buoy"] }, "admin").aliases).toContain("Life Buoy");
    expect(governance.verify("dove", "admin").verificationStatus).toBe("VERIFIED");
    expect(governance.reject("lux", "admin").verificationStatus).toBe("REJECTED");
    expect(governance.deprecate("lux", "admin").status).toBe("DEPRECATED");
    expect(governance.archive("surf-excel", "admin").status).toBe("ARCHIVED");
    expect(governance.restore("surf-excel", "admin").status).toBe("ACTIVE");
    expect(governance.audit().map((a) => a.operation)).toEqual(["CREATE", "EDIT", "VERIFY", "REJECT", "DEPRECATE", "ARCHIVE", "RESTORE"]);
  });

  it("merges a brand into another, folding aliases and marking MERGED", () => {
    const governance = gov();
    const { source, target } = governance.merge("lux", "dove", "admin");
    expect(source.status).toBe("MERGED");
    expect(source.mergedIntoId).toBe("dove");
    expect(target.aliases).toContain("Lux");
  });

  it("runs the approval workflow", () => {
    const governance = gov();
    const request = governance.submitChangeRequest("VERIFY", { id: "dove" }, "editor");
    expect(governance.approveChangeRequest(request.id, "approver").request.status).toBe("APPLIED");
    expect(governance.engine().getBrand("dove")?.verificationStatus).toBe("VERIFIED");
    const rejectable = governance.submitChangeRequest("ARCHIVE", { id: "lux" }, "editor");
    expect(governance.rejectChangeRequest(rejectable.id, "approver").status).toBe("REJECTED");
  });
});

describe("canonical brand universe", () => {
  it("contains 1000+ real brands, fully classified, validating cleanly", () => {
    const taxonomy = buildCanonicalTaxonomyEngine({ clock: fixedClock() });
    const { engine, classification } = buildCanonicalBrandSystem({ taxonomy, clock: fixedClock() });
    expect(engine.brandCount).toBeGreaterThanOrEqual(1000);
    expect(engine.companyCount).toBeGreaterThan(0);
    const report = validateBrandUniverse(engine.brands(), engine.companies(), { taxonomy });
    expect(report.errorCount).toBe(0);
    expect(classification.unclassifiedBrands()).toHaveLength(0);
    expect(classification.invalidMappings()).toHaveLength(0);
  });

  it("includes well-known brands mapped to their owning companies", () => {
    const { engine } = buildCanonicalBrandSystem({ clock: fixedClock() });
    expect(engine.getBrandBySlug("amul-butter")).toBeDefined();
    expect(engine.getBrandBySlug("maggi")?.companyId).toBe("nestle-india");
    expect(engine.getBrandsByCompany("hindustan-unilever").length).toBeGreaterThan(10);
  });

  it("is deterministic across builds", () => {
    const a = JSON.stringify(buildCanonicalBrandSystem({ clock: fixedClock() }).engine.brands());
    const b = JSON.stringify(buildCanonicalBrandSystem({ clock: fixedClock() }).engine.brands());
    expect(a).toBe(b);
  });
});

describe("scale certification", () => {
  it("certifies 100 / 500 / 1,000 / 5,000 brands with integrity, ownership and classification", () => {
    const taxonomy = buildCanonicalTaxonomyEngine();
    const results = runBrandScaleCertification([100, 500, 1000, 5000], taxonomy);
    for (const result of results) {
      expect(result.valid).toBe(true);
      expect(result.ownershipOk).toBe(true);
      expect(result.classificationOk).toBe(true);
      expect(result.lookupOk).toBe(true);
      expect(result.totalBrands).toBe(result.targetBrands);
    }
  });

  it("scales to 5,000 brands within a deterministic time bound", () => {
    const result = certifyBrandScaleTarget(5000);
    expect(result.totalBrands).toBe(5000);
    expect(result.valid).toBe(true);
    expect(result.buildMs).toBeLessThan(5000);
  });
});
