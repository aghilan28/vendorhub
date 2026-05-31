// MCP-0B — Catalog seed generator.
// Emits an idempotent Supabase migration that seeds the master taxonomy and a
// deterministic, ACTIVE (searchable) product catalog. Scales by COUNT env.
//
//   node scripts/generate-catalog-seed.mjs            # default 1200 products
//   COUNT=50000 node scripts/generate-catalog-seed.mjs
//   COUNT=100000 OUT=supabase/migrations/xxxx.sql node scripts/generate-catalog-seed.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const taxonomy = JSON.parse(readFileSync(join(root, "config/catalog/taxonomy.json"), "utf8"));

const COUNT = Number(process.env.COUNT ?? 1200);
const OUT = process.env.OUT ?? join(root, "supabase/migrations/20260531010000_mcp0b_catalog_seed.sql");

// ── deterministic RNG (mirrors lib/catalog/generator.ts) ──
function xfnv1a(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
const slugify = (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const esc = (v) => String(v).replace(/'/g, "''");

const BRAND_POOLS = {
  groceries: ["Tata", "Fortune", "Aashirvaad", "India Gate", "Patanjali"],
  fresh: ["Farm Fresh", "Local Harvest", "Natures Basket"],
  dairy: ["Amul", "Aavin", "Mother Dairy", "Nandini"],
  bakery: ["Britannia", "Modern", "English Oven"],
  snacks: ["Lays", "Haldirams", "Bingo", "Cadbury"],
  beverages: ["Tata Tea", "Bru", "Coca-Cola", "Real", "Bisleri"],
  household: ["Surf Excel", "Vim", "Harpic", "Lizol"],
  personalcare: ["Dove", "Clinic Plus", "Colgate"],
  health: ["Dabur", "Himalaya", "HealthKart"],
  beauty: ["Lakme", "Maybelline", "Mamaearth"],
  baby: ["Pampers", "Huggies", "MamyPoko"],
  pet: ["Pedigree", "Whiskas", "Drools"],
  electronics: ["Samsung", "LG", "Sony", "boAt"],
  mobiles: ["Samsung", "Apple", "Redmi", "Realme"],
  computers: ["HP", "Dell", "Lenovo", "Asus"],
  accessories: ["boAt", "Anker", "SanDisk"],
  fashion: ["Roadster", "Levis", "Allen Solly", "Biba"],
  footwear: ["Nike", "Adidas", "Bata", "Campus"],
  home: ["Home Centre", "Spaces", "Solimo"],
  kitchen: ["Prestige", "Hawkins", "Milton"],
  furniture: ["Nilkamal", "Godrej Interio"],
  sports: ["Nivia", "Cosco", "Yonex"],
  books: ["Penguin", "HarperCollins", "Rupa"],
  automotive: ["Bosch", "3M", "Michelin"],
  industrial: ["Bosch", "Stanley", "Taparia"],
  office: ["Classmate", "Cello", "Camlin"],
  generic: ["VendorHub"],
};
const DESCRIPTORS = ["Premium", "Classic", "Everyday", "Pro", "Essential", "Value", "Deluxe", "Smart"];
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

// flatten leaf categories
const leaves = [];
const roots = [];
for (const root of taxonomy.roots) {
  roots.push({ slug: root.slug, name: root.name, parent: null });
  const subs = root.subcategories ?? [];
  if (subs.length === 0) leaves.push({ slug: root.slug, name: root.name, family: root.attrFamily });
  for (const sub of subs) {
    roots.push({ slug: sub.slug, name: sub.name, parent: root.slug });
    leaves.push({ slug: sub.slug, name: sub.name, family: sub.attrFamily ?? root.attrFamily });
  }
}

// ── build SQL ──
const lines = [];
lines.push(`-- MCP-0B — Catalog seed (taxonomy + ${COUNT} ACTIVE products). Generated; idempotent.`);
lines.push(`-- Regenerate: COUNT=${COUNT} node scripts/generate-catalog-seed.mjs`);
lines.push("");

// categories: roots first
lines.push("-- Master taxonomy categories");
for (const r of roots.filter((x) => x.parent === null)) {
  lines.push(`insert into public.categories (name, slug, is_active) values ('${esc(r.name)}', '${esc(r.slug)}', true) on conflict (slug) do nothing;`);
}
for (const r of roots.filter((x) => x.parent !== null)) {
  lines.push(`insert into public.categories (name, slug, parent_id, is_active) select '${esc(r.name)}', '${esc(r.slug)}', c.id, true from public.categories c where c.slug = '${esc(r.parent)}' on conflict (slug) do nothing;`);
}
lines.push("");

// products + images + inventory in a guarded DO block
lines.push("do $mcp0b$");
lines.push("declare seed_vendor uuid;");
lines.push("begin");
lines.push("  select id into seed_vendor from public.vendors order by created_at limit 1;");
lines.push("  if seed_vendor is null then");
lines.push("    raise notice 'MCP-0B catalog seed skipped: no vendor present (create a vendor, then re-run).';");
lines.push("    return;");
lines.push("  end if;");

const CHUNK = 500;
const rows = [];
for (let i = 0; i < COUNT; i += 1) {
  const rng = mulberry32(xfnv1a(`mcp0b:${i}`));
  const node = leaves[i % leaves.length];
  const brand = pick(rng, BRAND_POOLS[node.family] ?? BRAND_POOLS.generic);
  const descriptor = pick(rng, DESCRIPTORS);
  const noun = node.name.replace(/&/g, "and");
  const name = `${brand} ${descriptor} ${noun}`.replace(/\s+/g, " ").trim();
  const slug = `${slugify(name)}-${i}`;
  const description = `${name} - ${descriptor.toLowerCase()} ${noun.toLowerCase()} from ${brand}. Quality assured for everyday use.`;
  const price = Math.round((49 + rng() * 4951) * 100) / 100;
  const stock = Math.floor(rng() * 200);
  const image = pick(rng, IMAGE_POOL);
  const meta = esc(JSON.stringify({ brand, rootSlug: node.slug, sku: `MCP0B-${String(i).padStart(7, "0")}` }));
  rows.push({ slug, name, description, price, category: node.slug, image, stock, meta });
}

function emitChunk(chunk) {
  // products
  lines.push("  insert into public.products (vendor_id, category_id, name, slug, description, status, base_price, currency, ai_index_metadata, published_at)");
  lines.push("  select seed_vendor, c.id, v.name, v.slug, v.description, 'ACTIVE'::public.product_status, v.base_price, 'INR', v.meta::jsonb, now()");
  lines.push("  from (values");
  lines.push(
    chunk
      .map((r) => `    ('${esc(r.name)}', '${esc(r.slug)}', '${esc(r.description)}', ${r.price}, '${esc(r.category)}', '${r.meta}')`)
      .join(",\n"),
  );
  lines.push("  ) as v(name, slug, description, base_price, category_slug, meta)");
  lines.push("  join public.categories c on c.slug = v.category_slug");
  lines.push("  on conflict (vendor_id, slug) do nothing;");
  // images
  lines.push("  insert into public.product_images (product_id, storage_path, alt_text, is_primary, sort_order)");
  lines.push("  select p.id, v.image, v.name, true, 0 from (values");
  lines.push(chunk.map((r) => `    ('${esc(r.slug)}', '${esc(r.image)}', '${esc(r.name)}')`).join(",\n"));
  lines.push("  ) as v(slug, image, name)");
  lines.push("  join public.products p on p.slug = v.slug and p.vendor_id = seed_vendor");
  lines.push("  where not exists (select 1 from public.product_images pi where pi.product_id = p.id);");
  // inventory
  lines.push("  insert into public.inventory (vendor_id, product_id, stock_quantity, low_stock_threshold, stock_status)");
  lines.push("  select seed_vendor, p.id, v.stock, 5, (case when v.stock = 0 then 'OUT_OF_STOCK' when v.stock < 10 then 'LOW_STOCK' else 'IN_STOCK' end)::public.stock_status");
  lines.push("  from (values");
  lines.push(chunk.map((r) => `    ('${esc(r.slug)}', ${r.stock})`).join(",\n"));
  lines.push("  ) as v(slug, stock)");
  lines.push("  join public.products p on p.slug = v.slug and p.vendor_id = seed_vendor");
  lines.push("  on conflict (product_id, variant_id) do nothing;");
}

for (let i = 0; i < rows.length; i += CHUNK) emitChunk(rows.slice(i, i + CHUNK));

lines.push(`  raise notice 'MCP-0B catalog seed applied: % products targeted', ${COUNT};`);
lines.push("end");
lines.push("$mcp0b$;");
lines.push("");

writeFileSync(OUT, lines.join("\n"));
console.log(`Wrote ${OUT}: ${roots.length} categories, ${rows.length} products (${(lines.join("\n").length / 1_000_000).toFixed(2)} MB).`);
