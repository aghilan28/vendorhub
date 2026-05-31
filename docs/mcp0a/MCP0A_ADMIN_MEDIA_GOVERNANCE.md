# MCP-0A.11 — Admin Media Governance

Route: `/admin/media` (force-dynamic, admin-gated) · Component
`features/media/components/admin-media-center.tsx` · Query `lib/media/queries.ts`.

## Delivered (computed from REAL data, honest empty states)
- **Catalog media coverage**: total images, coverage %, products with/without media.
- **Storage & integrity**: stored (Supabase) vs external URLs, primary images,
  broken references.
- **Duplicate analytics**: repeated storage paths (exact). Perceptual/AI-safety
  duplicate analytics activate once the worker writes hashes to `media_assets`.
- **Recent media** grid with primary badges.

## Principled design (no fake dashboards)
The Reality Audit condemned fabricated dashboards; this surface therefore:
- computes from `product_images` + `products` via `getMediaGovernanceSnapshot`;
- shows an explicit "backend not configured" state when Supabase env is absent;
- shows "no product media yet" when there is genuinely no data.

## Future write-paths
Approve/reject/flag and quality/perceptual analytics bind to the `media_moderation`
and `media_assets` tables provisioned by this phase, populated by the media worker.
