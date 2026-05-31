import { describe, expect, it } from "vitest";
import {
  analyzeImport,
  buildSearchDocument,
  catalogDistribution,
  detectDuplicates,
  filterableAttributes,
  generateCatalog,
  generateProduct,
  generateVariants,
  isKnownCategory,
  leafCategories,
  nameSimilarity,
  parseCsv,
  parseJson,
  planVariantCombinations,
  publishableRows,
  qualityBand,
  rootCategories,
  rootSlugFor,
  scoreCatalogQuality,
  taxonomyNodes,
  templateForCategory,
  validateAttributes,
  validateVariants,
} from "@/lib/catalog";

describe("MCP-0B master taxonomy", () => {
  it("provides a deep, navigable taxonomy", () => {
    expect(rootCategories.length).toBeGreaterThanOrEqual(27);
    expect(taxonomyNodes.length).toBeGreaterThanOrEqual(90);
    expect(leafCategories.length).toBeGreaterThan(rootCategories.length);
  });

  it("resolves categories and roots", () => {
    expect(isKnownCategory("smartphones")).toBe(true);
    expect(isKnownCategory("not-real")).toBe(false);
    expect(rootSlugFor("smartphones")).toBe("mobiles");
    expect(rootSlugFor("groceries")).toBe("groceries");
  });
});

describe("MCP-0B attribute engine", () => {
  it("supplies category-specific templates with inheritance", () => {
    const mobile = templateForCategory("smartphones").map((a) => a.key);
    expect(mobile).toEqual(expect.arrayContaining(["ram", "storage", "color"]));
    const fashion = templateForCategory("men").map((a) => a.key);
    expect(fashion).toEqual(expect.arrayContaining(["size", "color"]));
  });

  it("validates required + enum attributes", () => {
    const missing = validateAttributes("smartphones", { color: "Black" });
    expect(missing.ok).toBe(false);
    expect(missing.errors).toContain("missing_required_attribute:ram");

    const ok = validateAttributes("smartphones", { ram: 8, storage: 128, color: "Black" });
    expect(ok.ok).toBe(true);

    const warn = validateAttributes("men", { size: "ZZ", color: "Black" });
    expect(warn.warnings).toContain("unexpected_option:size");
  });

  it("exposes filterable facets", () => {
    expect(filterableAttributes("smartphones").length).toBeGreaterThan(0);
  });
});

describe("MCP-0B variant engine", () => {
  it("plans capped cartesian combinations", () => {
    const plan = planVariantCombinations(["color", "storage"]);
    expect(plan.axes).toEqual(["color", "storage"]);
    expect(plan.combinations.length).toBeGreaterThan(1);
    expect(plan.combinations.length).toBeLessThanOrEqual(24);
  });

  it("generates unique, valid variant SKUs", () => {
    const variants = generateVariants({ baseSku: "SKU1", baseName: "Phone", axes: ["color", "storage"], basePrice: 1000 });
    expect(variants.length).toBeGreaterThan(0);
    expect(validateVariants(variants).ok).toBe(true);
    expect(new Set(variants.map((v) => v.sku)).size).toBe(variants.length);
  });

  it("returns no variants for axis-less categories", () => {
    expect(generateVariants({ baseSku: "S", baseName: "X", axes: [], basePrice: 100 })).toHaveLength(0);
  });
});

describe("MCP-0B catalog quality engine", () => {
  it("scores complete vs incomplete products", () => {
    const good = scoreCatalogQuality({
      name: "Samsung Galaxy M14 5G",
      description: "A capable 5G smartphone with a large battery and crisp display.",
      categorySlug: "smartphones",
      brand: "Samsung",
      price: 13999,
      attributes: { ram: 6, storage: 128, color: "Blue" },
      imageUrls: ["https://images.unsplash.com/x"],
    });
    expect(good.score).toBeGreaterThan(80);
    expect(qualityBand(good.score)).toMatch(/good|excellent/);

    const bad = scoreCatalogQuality({ name: "test", categorySlug: "nope", price: 0 });
    expect(bad.score).toBeLessThan(50);
    expect(bad.flags).toEqual(expect.arrayContaining(["missing_media", "unknown_category", "invalid_price"]));
  });
});

describe("MCP-0B duplicate detection", () => {
  it("detects exact, near and SKU collisions", () => {
    const matches = detectDuplicates([
      { ref: "1", name: "Premium Basmati Rice Five Kg", brand: "Tata", sku: "A1" },
      { ref: "2", name: "Premium Basmati Rice Five Kg", brand: "Tata", sku: "A2" },
      { ref: "3", name: "Premium Basmati Rice Five Kg Bag", brand: "Tata", sku: "A3" },
      { ref: "4", name: "Totally Different Item Name Here", brand: "X", sku: "A1" },
    ]);
    expect(matches.find((m) => m.ref === "2")?.kind).toBe("exact");
    expect(matches.find((m) => m.ref === "3")?.kind).toBe("near");
    expect(matches.find((m) => m.ref === "4")?.kind).toBe("sku_collision");
    expect(nameSimilarity("Amul Butter", "Amul Butter")).toBe(1);
  });
});

describe("MCP-0B ingestion platform", () => {
  it("parses CSV and reports missing columns", () => {
    const ok = parseCsv("name,category,price,brand\nGalaxy,smartphones,13999,Samsung");
    expect(ok.rows).toHaveLength(1);
    expect(ok.rows[0].categorySlug).toBe("smartphones");

    const bad = parseCsv("name,price\nGalaxy,1");
    expect(bad.errors).toContain("missing_column:category");
  });

  it("parses JSON arrays", () => {
    const ok = parseJson('[{"name":"X","categorySlug":"snacks","price":10}]');
    expect(ok.rows).toHaveLength(1);
    expect(parseJson("{").errors).toContain("invalid_json");
  });

  it("analyzes an import with valid / invalid / duplicate classification", () => {
    const report = analyzeImport([
      { name: "Galaxy M14", categorySlug: "smartphones", price: 13999, brand: "Samsung", sku: "S1", attributes: { ram: 6, storage: 128, color: "Blue" }, imageUrls: ["u"] },
      { name: "Galaxy M14", categorySlug: "smartphones", price: 13999, brand: "Samsung", sku: "S2", attributes: { ram: 6, storage: 128, color: "Blue" }, imageUrls: ["u"] },
      { name: "Broken", categorySlug: "unknown-cat", price: 0 },
    ]);
    expect(report.total).toBe(3);
    expect(report.invalid).toBeGreaterThanOrEqual(1);
    expect(report.duplicates).toBeGreaterThanOrEqual(1);
    expect(publishableRows(report).length).toBeGreaterThanOrEqual(1);
  });
});

describe("MCP-0B exhaustive generator", () => {
  it("generates a deterministic, distributed, searchable catalog", () => {
    const a = generateCatalog(500);
    const b = generateCatalog(500);
    expect(a).toEqual(b); // deterministic
    expect(a).toHaveLength(500);

    for (const p of a.slice(0, 50)) {
      expect(p.price).toBeGreaterThan(0);
      expect(isKnownCategory(p.categorySlug)).toBe(true);
      expect(p.searchDocument.length).toBeGreaterThan(0);
      expect(p.sku.startsWith("MCP0B-")).toBe(true);
    }

    const dist = catalogDistribution(a);
    expect(Object.keys(dist).length).toBeGreaterThanOrEqual(20); // spread across many roots
  });

  it("produces unique slugs and SKUs at scale", () => {
    const products = generateCatalog(2000);
    expect(new Set(products.map((p) => p.slug)).size).toBe(2000);
    expect(new Set(products.map((p) => p.sku)).size).toBe(2000);
  });

  it("builds search documents containing brand + category", () => {
    const p = generateProduct(7);
    const doc = buildSearchDocument({ name: p.name, categorySlug: p.categorySlug, price: p.price, brand: p.brand, attributes: p.attributes });
    expect(doc).toContain(p.brand.toLowerCase());
  });
});
