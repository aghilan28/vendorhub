// MCP-1B — Deterministic sample catalog-population data (PREVIEW ONLY).
//
// Built from the MCP-0B generator so products carry valid categories,
// attributes, variants and media. Always labelled; never drives a "live" count.

import { generateCatalog, type CatalogProductInput, type GeneratedProduct } from "@/lib/catalog";
import type { GovernanceProductInput } from "./governance";
import type { PopulationProductInput } from "./intelligence";
import type { MediaAssetInput } from "./types";
import { planImportJob, processChunk } from "./import-v2";

const SELLERS = ["seller-1", "seller-2", "seller-3", "seller-4"];

const GENERATED: GeneratedProduct[] = generateCatalog(120, "mcp1b");

function toInput(p: GeneratedProduct): CatalogProductInput {
  return {
    externalId: p.externalId,
    name: p.name,
    description: p.description,
    categorySlug: p.categorySlug,
    brand: p.brand,
    sku: p.sku,
    price: p.price,
    stock: p.stock,
    attributes: p.attributes,
    imageUrls: p.imageUrl ? [p.imageUrl] : [],
  };
}

export const SAMPLE_PRODUCTS: CatalogProductInput[] = GENERATED.map(toInput);

// Inject a few quality gaps for realism: strip media/attributes from some rows.
export const SAMPLE_PRODUCTS_WITH_GAPS: CatalogProductInput[] = SAMPLE_PRODUCTS.map((p, i) => {
  if (i % 7 === 0) return { ...p, imageUrls: [] }; // missing media
  if (i % 11 === 0) return { ...p, attributes: {} }; // missing attributes
  return p;
});

export const SAMPLE_POPULATION_PRODUCTS: PopulationProductInput[] = GENERATED.map((p, i) => ({
  ...toInput(p),
  sellerId: SELLERS[i % SELLERS.length],
  hasVariants: p.variants.length > 0,
}));

export const SAMPLE_GOVERNANCE_PRODUCTS: GovernanceProductInput[] = SAMPLE_PRODUCTS_WITH_GAPS.map((p, i) => ({
  ...p,
  status: i % 9 === 0 ? "pending" : i % 13 === 0 ? "draft" : "active",
  flagged: i % 29 === 0,
}));

export const SAMPLE_MEDIA_ASSETS: MediaAssetInput[] = [
  { ref: "m1", url: "https://cdn.example.com/p1.jpg", bytes: 320_000, width: 1200, height: 1200, hash: "h1" },
  { ref: "m2", url: "https://cdn.example.com/p2.jpg", bytes: 2_400_000, width: 2000, height: 2000, hash: "h2" }, // oversized
  { ref: "m3", url: "https://cdn.example.com/p3.jpg", bytes: 90_000, width: 300, height: 300, hash: "h3" }, // low res
  { ref: "m4", url: "https://cdn.example.com/p1.jpg", bytes: 320_000, width: 1200, height: 1200, hash: "h1" }, // duplicate of m1
  { ref: "m5", url: "not-a-url", bytes: 10_000, hash: "h5" }, // invalid
  { ref: "m6", url: "https://cdn.example.com/p6.webp", bytes: 410_000, width: 1080, height: 1350, hash: "h6" },
];

export const SAMPLE_IMPORT_CSV_HEADERS = "name,category,price,sku,brand,stock,attributes,images";

// A sample large import job, partially processed (for dashboards).
export function sampleImportJob() {
  let job = planImportJob("seller-1", "catalog-50k.csv", 5200, 1000, "2026-05-31T06:00:00.000Z");
  // process the first two chunks with a slice of valid sample rows
  job = processChunk(job, 0, SAMPLE_PRODUCTS.slice(0, 60));
  job = processChunk(job, 1, SAMPLE_PRODUCTS.slice(60, 120));
  return job;
}
