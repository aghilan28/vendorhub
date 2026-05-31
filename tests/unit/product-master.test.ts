import { describe, expect, it } from "vitest";
import { AttributeRegistry, buildCanonicalTaxonomyEngine, createDeterministicClock } from "@/lib/taxonomy";
import { buildCanonicalBrandEngine } from "@/lib/brands";
import {
  ProductGovernance,
  buildProductAffinityGraph,
  buildProductIntelligenceProjection,
  buildProductSearchIndex,
  buildSampleProductSystem,
  certifyProductScaleTarget,
  generateInternalSku,
  productSimilarity,
  productsForSearchTerm,
  resolveInheritance,
  resolveProducts,
  runProductScaleCertification,
  validateProducts,
  variantSimilarity,
  type ProductMaster,
  type ProductMasterInput,
} from "@/lib/products";

function fixedClock() {
  return createDeterministicClock(1_700_000_000_000, 1_000);
}

function product(input: ProductMasterInput): ProductMaster {
  return resolveProducts([input], fixedClock())[0];
}

describe("product + variant creation, SKU generation, barcode registry", () => {
  const engine = buildSampleProductSystem({ clock: fixedClock() }).engine;

  it("creates product masters with variants", () => {
    expect(engine.productCount).toBe(6);
    expect(engine.getProduct("aavin-milk")?.variants).toHaveLength(3);
    expect(engine.getVariantsByProduct("dove-shampoo").map((v) => v.axes.volume)).toEqual(["180ml", "340ml", "650ml"]);
  });

  it("generates deterministic, collision-free internal SKUs", () => {
    const sku = engine.getProduct("aavin-milk")?.variants[0].internalSku;
    expect(sku).toBe(generateInternalSku({ departmentId: "dairy", brandId: "aavin-milk", productId: "aavin-milk", variantKey: "500ml" }));
    expect(sku?.startsWith("VH-DAIR-AAVI-")).toBe(true);
    expect(engine.skuCollisions()).toHaveLength(0);
  });

  it("registers and resolves SKUs and barcodes", () => {
    const milk = engine.getProduct("aavin-milk")?.variants[0];
    expect(engine.getBySku(milk!.internalSku)?.product.id).toBe("aavin-milk");
    expect(engine.getByBarcode("8901234500015")?.product.id).toBe("aavin-milk");
    expect(engine.barcodeCollisions()).toHaveLength(0);
  });
});

describe("attribute inheritance (Phase 6)", () => {
  const registry = new AttributeRegistry();

  it("resolves nearest-scope value and records overrides", () => {
    const { resolved } = resolveInheritance(
      { global: { country_of_origin: "India" }, product: { vegetarian: "veg" }, variant: { vegetarian: "vegan" } },
      { registry },
    );
    const veg = resolved.find((a) => a.key === "vegetarian");
    expect(veg?.value).toBe("vegan");
    expect(veg?.scope).toBe("VARIANT");
    expect(veg?.overridden.map((o) => o.scope)).toEqual(["PRODUCT"]);
  });

  it("detects invalid enum values, unknown attributes and locked overrides", () => {
    const invalidEnum = resolveInheritance({ product: { vegetarian: "maybe" } }, { registry });
    expect(invalidEnum.conflicts.map((c) => c.reason)).toContain("INVALID_ENUM_VALUE");

    const unknown = resolveInheritance({ product: { not_a_real_attr: "x" } }, { registry });
    expect(unknown.conflicts.map((c) => c.reason)).toContain("UNKNOWN_ATTRIBUTE");

    const locked = resolveInheritance({ product: { organic: true }, variant: { organic: false } }, { registry, lockedKeys: ["organic"] });
    expect(locked.conflicts.map((c) => c.reason)).toContain("LOCKED_OVERRIDE");
  });
});

describe("validation engine (Phase 12)", () => {
  it("detects duplicate SKUs and barcodes", () => {
    const a = product({ id: "a", name: "A", departmentId: "dairy", variants: [{ name: "v", identifiers: { vendorSku: "DUP" } }] });
    const b = product({ id: "b", name: "B", departmentId: "dairy", variants: [{ name: "v", identifiers: { vendorSku: "DUP" } }] });
    const codes = validateProducts([a, b]).issues.map((i) => i.code);
    expect(codes).toContain("DUPLICATE_SKU");

    const c = product({ id: "c", name: "C", departmentId: "dairy", variants: [{ name: "v", identifiers: { ean: "111" } }] });
    const d = product({ id: "d", name: "D", departmentId: "dairy", variants: [{ name: "v", identifiers: { ean: "111" } }] });
    expect(validateProducts([c, d]).issues.map((i) => i.code)).toContain("DUPLICATE_BARCODE");
  });

  it("detects broken variant trees and missing SKUs", () => {
    const p = product({ id: "p", name: "P", departmentId: "dairy", variants: [{ name: "v" }] });
    p.variants[0].productId = "wrong";
    expect(validateProducts([p]).issues.map((i) => i.code)).toContain("BROKEN_VARIANT_TREE");

    const q = product({ id: "q", name: "Q", departmentId: "dairy", variants: [{ name: "v" }] });
    q.variants[0].internalSku = "";
    expect(validateProducts([q]).issues.map((i) => i.code)).toContain("MISSING_VARIANT_SKU");
  });

  it("detects orphan products and invalid taxonomy/brand mappings", () => {
    const taxonomy = buildCanonicalTaxonomyEngine({ clock: fixedClock() });
    const brands = buildCanonicalBrandEngine({ clock: fixedClock() });
    const orphan = product({ id: "o", name: "O", departmentId: "" });
    expect(validateProducts([orphan]).issues.map((i) => i.code)).toContain("ORPHAN_PRODUCT");

    const badTaxo = product({ id: "t", name: "T", departmentId: "not-a-dept" });
    expect(validateProducts([badTaxo], { taxonomy }).issues.map((i) => i.code)).toContain("INVALID_TAXONOMY_MAPPING");

    const badBrand = product({ id: "br", name: "Br", departmentId: "dairy", brandId: "ghost-brand" });
    expect(validateProducts([badBrand], { brands }).issues.map((i) => i.code)).toContain("INVALID_BRAND_MAPPING");
  });

  it("detects inheritance conflicts and governance violations", () => {
    const conflict = product({ id: "ic", name: "IC", departmentId: "dairy", attributes: { vegetarian: "maybe" }, variants: [{ name: "v" }] });
    expect(validateProducts([conflict]).issues.map((i) => i.code)).toContain("INHERITANCE_CONFLICT");

    const merged = product({ id: "m", name: "M", departmentId: "dairy" });
    merged.status = "MERGED";
    expect(validateProducts([merged]).issues.map((i) => i.code)).toContain("GOVERNANCE_VIOLATION");
  });

  it("passes a clean sample", () => {
    const { engine, taxonomy, brands } = buildSampleProductSystem({ clock: fixedClock() });
    const report = validateProducts(engine.products(), { taxonomy, brands });
    expect(report.valid).toBe(true);
    expect(report.errorCount).toBe(0);
  });
});

describe("product governance (Phase 7)", () => {
  function gov() {
    return new ProductGovernance(buildSampleProductSystem({ clock: fixedClock() }).engine, { clock: fixedClock() });
  }

  it("creates, edits (with version history), approves/rejects, archives, restores with audit", () => {
    const governance = gov();
    const created = governance.create({ id: "new-prod", name: "New Prod", departmentId: "groceries" }, "admin");
    expect(created.id).toBe("new-prod");
    const edited = governance.edit("new-prod", { description: "updated" }, "admin");
    expect(edited.version).toBe(2);
    expect(governance.versionHistory("new-prod").length).toBeGreaterThanOrEqual(2);
    expect(governance.approve("new-prod", "admin").metadata.approvalState).toBe("APPROVED");
    expect(governance.reject("aavin-milk", "admin").metadata.approvalState).toBe("REJECTED");
    expect(governance.archive("amul-butter", "admin").status).toBe("ARCHIVED");
    expect(governance.restore("amul-butter", "admin").status).toBe("ACTIVE");
    expect(governance.audit().map((a) => a.operation)).toEqual(["CREATE", "EDIT", "APPROVE", "REJECT", "ARCHIVE", "RESTORE"]);
  });

  it("merges products (re-parenting variants) and marks source MERGED", () => {
    const governance = gov();
    const { source } = governance.merge("amul-butter", "aavin-milk", "admin");
    expect(source.status).toBe("MERGED");
    expect(source.mergedIntoId).toBe("aavin-milk");
    expect(governance.engine().getVariantsByProduct("aavin-milk").length).toBe(5);
  });

  it("splits a product into multiple products", () => {
    const governance = gov();
    const variants = governance.engine().getVariantsByProduct("aavin-milk");
    const { source, created } = governance.split(
      "aavin-milk",
      [
        { name: "Aavin Small", variantIds: [variants[0].id] },
        { name: "Aavin Large", variantIds: [variants[1].id, variants[2].id] },
      ],
      "admin",
    );
    expect(source.status).toBe("SPLIT");
    expect(created).toHaveLength(2);
    expect(governance.engine().getVariantsByProduct(created[1].id).length).toBe(2);
  });

  it("runs the approval workflow", () => {
    const governance = gov();
    const request = governance.submitChangeRequest("ARCHIVE", { id: "aavin-milk" }, "editor");
    expect(governance.approveChangeRequest(request.id, "approver").request.status).toBe("APPLIED");
    expect(governance.engine().getProduct("aavin-milk")?.status).toBe("ARCHIVED");
  });
});

describe("search / recommendation / intelligence readiness", () => {
  const { engine, brands } = buildSampleProductSystem({ clock: fixedClock() });

  it("builds product search documents and resolves terms", () => {
    const index = buildProductSearchIndex(engine, { brands });
    const milk = index.find((d) => d.productId === "aavin-milk");
    expect(milk?.tokens).toContain("aavin");
    expect(milk?.skus.length).toBe(3);
    expect(productsForSearchTerm(engine, "dove", { brands }).map((p) => p.id)).toContain("dove-shampoo");
  });

  it("builds recommendation affinity and deterministic similarity", () => {
    const graph = buildProductAffinityGraph(engine);
    expect(Array.isArray(graph.edges)).toBe(true);
    expect(productSimilarity(engine, "aavin-milk", "amul-butter")).toBeGreaterThan(0);
    expect(productSimilarity(engine, "aavin-milk", "aavin-milk")).toBe(1);
    const variants = engine.getVariantsByProduct("aavin-milk");
    expect(variantSimilarity(engine, variants[0].id, variants[0].id)).toBe(1);
  });

  it("builds intelligence projection with hooks and buckets", () => {
    const projection = buildProductIntelligenceProjection(engine);
    expect(projection.hooks.length).toBeGreaterThan(0);
    expect(projection.byDepartment.dairy).toBe(2);
    expect(projection.totalVariants).toBe(13);
  });
});

describe("determinism", () => {
  it("builds the sample engine identically across runs", () => {
    const a = JSON.stringify(buildSampleProductSystem({ clock: fixedClock() }).engine.products());
    const b = JSON.stringify(buildSampleProductSystem({ clock: fixedClock() }).engine.products());
    expect(a).toBe(b);
  });
});

describe("scale certification (Phase 13)", () => {
  const taxonomy = buildCanonicalTaxonomyEngine();

  it("certifies 10,000 and 100,000 products (integrity, traversal, lookup, inheritance)", () => {
    const results = runProductScaleCertification([10_000, 100_000], { taxonomy });
    for (const result of results) {
      expect(result.skuCollisions).toBe(0);
      expect(result.integrityValid).toBe(true);
      expect(result.traversalOk).toBe(true);
      expect(result.lookupOk).toBe(true);
      expect(result.inheritanceOk).toBe(true);
      expect(result.variantsOk).toBe(true);
      expect(result.uniqueSkus).toBe(result.totalVariants);
    }
  });

  it("certifies 500,000 and 1,000,000 products (collision-free SKUs at scale)", () => {
    for (const target of [500_000, 1_000_000]) {
      const result = certifyProductScaleTarget(target, { taxonomy });
      expect(result.targetProducts).toBe(target);
      expect(result.skuCollisions).toBe(0);
      expect(result.uniqueSkus).toBe(result.totalVariants);
      expect(result.integrityValid).toBe(true);
    }
  }, 120_000);
});
