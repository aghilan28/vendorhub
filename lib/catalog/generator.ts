// MCP-0B — Exhaustive Product Generator (Section MCP-0B.6)
// Deterministic, seedable generation of a large, realistic, searchable catalog
// across the master taxonomy. Pure + reproducible; scales to 100,000+ rows.

import { templateForCategory } from "./attributes";
import { buildSearchDocument } from "./searchdoc";
import { scoreCatalogQuality } from "./quality";
import { leafCategories, getCategory } from "./taxonomy";
import { generateVariants } from "./variants";
import type { GeneratedProduct, TaxonomyNode } from "./types";

// Deterministic RNG (xfnv1a seed + mulberry32).
function xfnv1a(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BRAND_POOLS: Record<string, string[]> = {
  groceries: ["Tata", "Fortune", "Aashirvaad", "India Gate", "Patanjali"],
  fresh: ["Farm Fresh", "Local Harvest", "Nature's Basket"],
  dairy: ["Amul", "Aavin", "Mother Dairy", "Nandini", "iD Fresh"],
  bakery: ["Britannia", "Modern", "English Oven"],
  snacks: ["Lays", "Haldiram's", "Bingo", "Cadbury"],
  beverages: ["Tata Tea", "Bru", "Coca-Cola", "Real", "Bisleri"],
  household: ["Surf Excel", "Vim", "Harpic", "Lizol"],
  personalcare: ["Dove", "Clinic Plus", "Colgate", "Pepsodent"],
  health: ["Dabur", "Himalaya", "HealthKart"],
  beauty: ["Lakme", "Maybelline", "Mamaearth", "Nykaa"],
  baby: ["Pampers", "Huggies", "MamyPoko", "Cerelac"],
  pet: ["Pedigree", "Whiskas", "Drools"],
  electronics: ["Samsung", "LG", "Sony", "boAt", "Philips"],
  mobiles: ["Samsung", "Apple", "Redmi", "Realme", "OnePlus"],
  computers: ["HP", "Dell", "Lenovo", "Asus", "Acer"],
  accessories: ["boAt", "Anker", "SanDisk", "Portronics"],
  fashion: ["Roadster", "Levi's", "Allen Solly", "H&M", "Biba"],
  footwear: ["Nike", "Adidas", "Bata", "Puma", "Campus"],
  home: ["Home Centre", "Spaces", "Solimo"],
  kitchen: ["Prestige", "Hawkins", "Milton", "Pigeon"],
  furniture: ["Nilkamal", "Godrej Interio", "Urban Ladder"],
  sports: ["Nivia", "Cosco", "Yonex"],
  books: ["Penguin", "HarperCollins", "Rupa", "Oxford"],
  automotive: ["Bosch", "3M", "Michelin"],
  industrial: ["Bosch", "Stanley", "Taparia"],
  office: ["Classmate", "Cello", "Camlin", "HP"],
  generic: ["VendorHub"],
};

const DESCRIPTORS = ["Premium", "Classic", "Everyday", "Pro", "Essential", "Value", "Deluxe", "Smart"];

// A pool of real, next.config-whitelisted Unsplash images so seeded products render.
const IMAGE_POOL = [
  "https://images.unsplash.com/photo-1542838132-92c53300491e",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
  "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f",
  "https://images.unsplash.com/photo-1560472354-b33ff0c44a43",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136",
  "https://images.unsplash.com/photo-1571091718767-18b5b1457add",
  "https://images.unsplash.com/photo-1583947215259-38e31be8751f",
];

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function fillAttributes(node: TaxonomyNode, rng: () => number): Record<string, string | number | boolean> {
  const template = templateForCategory(node.slug);
  const attrs: Record<string, string | number | boolean> = {};
  for (const def of template) {
    if (def.type === "enum" && def.options?.length) attrs[def.key] = pick(rng, def.options);
    else if (def.type === "boolean") attrs[def.key] = rng() > 0.4;
    else if (def.type === "number" || def.type === "unit") attrs[def.key] = Math.round((1 + rng() * 99) * 10) / 10;
    else if (def.key === "brand") continue; // set separately
    else attrs[def.key] = `${node.name} ${def.label}`.slice(0, 40);
  }
  return attrs;
}

/** Generates a single deterministic product for a given index. */
export function generateProduct(index: number, seed = "mcp0b"): GeneratedProduct {
  const rng = mulberry32(xfnv1a(`${seed}:${index}`));
  const node = leafCategories[index % leafCategories.length];
  const root = node.parentSlug ? getCategory(node.parentSlug) ?? node : node;
  const family = node.attrFamily;
  const brand = pick(rng, BRAND_POOLS[family] ?? BRAND_POOLS.generic);
  const descriptor = pick(rng, DESCRIPTORS);
  const noun = node.name.replace(/&/g, "and");
  const name = `${brand} ${descriptor} ${noun}`.replace(/\s+/g, " ").trim();
  const price = Math.round((49 + rng() * 4951) * 100) / 100;
  const stock = Math.floor(rng() * 200);
  const sku = `MCP0B-${String(index).padStart(7, "0")}`;
  const attributes = fillAttributes(node, rng);
  attributes.brand = brand;

  const variants = generateVariants({
    baseSku: sku,
    baseName: name,
    axes: node.variantAxes,
    basePrice: price,
  });

  const imageUrl = pick(rng, IMAGE_POOL);
  const input = {
    name,
    description: `${name} — ${descriptor.toLowerCase()} ${noun.toLowerCase()} from ${brand}. Quality assured for everyday use.`,
    categorySlug: node.slug,
    brand,
    sku,
    price,
    attributes,
    imageUrls: [imageUrl],
  };

  return {
    externalId: sku,
    name,
    slug: `${slugify(name)}-${index}`,
    description: input.description,
    categorySlug: node.slug,
    rootSlug: root.slug,
    brand,
    sku,
    price,
    currency: "INR",
    stock,
    attributes,
    variants,
    searchDocument: buildSearchDocument(input),
    imageUrl,
    qualityScore: scoreCatalogQuality(input).score,
  };
}

/** Generates a deterministic catalog of `count` products across the taxonomy. */
export function generateCatalog(count: number, seed = "mcp0b"): GeneratedProduct[] {
  const products: GeneratedProduct[] = [];
  for (let i = 0; i < count; i += 1) products.push(generateProduct(i, seed));
  return products;
}

/** Distribution summary of a generated catalog (for analytics/validation). */
export function catalogDistribution(products: GeneratedProduct[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const p of products) dist[p.rootSlug] = (dist[p.rootSlug] ?? 0) + 1;
  return dist;
}
