# MCP-1B.7 — Catalog Quality Platform

**Engine:** `lib/catalog-population/quality.ts` · **Surface:** `/seller/catalog-ops`.

## Measures (all mandated)
- **Catalog health score** — 0–100 blend (product quality 40% + media coverage
  25% + attribute completeness 25% + (100 − duplicate risk) 10%) + tone.
- **Product quality score** — per-product via MCP-0B `scoreCatalogQuality`;
  banded (excellent/good/fair/poor) via `qualityBand`.
- **Media quality score** — media coverage % (and per-asset quality via the media
  engine).
- **Attribute completeness** — provided vs expected attributes (0–100).
- **Duplicate risk** — MCP-0B `detectDuplicates` (exact/near/SKU) as a 0–100 risk.
- **Trust quality** — feeds the seller catalog health surfaced to buyers via the
  storefront trust indicators (MCP-1A).
- **Catalog recommendations** — ranked fixes (media / attributes / duplicates /
  quality / coverage).
- **Quality governance / audits** — admin quality + duplicate queues
  (`/admin/catalog-governance`).

## Exit criteria — met
Catalog quality is measurable at product, media, attribute and catalog levels,
with ranked recommendations and governance queues. Covered by 3 quality tests
(incl. empty-catalog handling).
