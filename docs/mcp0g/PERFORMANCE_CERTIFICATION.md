# MCP-0G.8 — Performance Certification

Measured from the real `next build` output (Next.js 15.5, React 19). Field
metrics (LCP/INP/CLS) require a hosted target and are not measured here.

## Bundle baseline
- **Shared First-Load JS:** ~174 kB (framework + commons chunks).
- **Middleware:** ~150 kB (edge auth + RBAC).
- Most routes add **<5 kB** of route-specific JS on top of the shared baseline.

## Representative route sizes (First Load JS)
| Route | Route JS | First Load |
|---|---|---|
| `/` home | ~3 kB | ~277 kB |
| `/search` | ~0.4 kB | ~278 kB |
| `/cart` | (server) | shared |
| `/checkout` | ~10 kB | ~408 kB |
| `/orders` (Order Center) | ~4.4 kB | ~202 kB |
| `/seller/fulfillment` | ~3.9 kB | ~200 kB |
| `/admin/commerce` | ~4 kB | ~200 kB |
| `/admin/platform-health` | ~3.4 kB | ~202 kB |
| `/seller/support` | ~1 kB | ~176 kB |
| `/seller/payouts` | ~1 kB | ~175 kB |

## Engineering posture (from code)
- **Server-first**: data surfaces are server components; client bundles carry
  only interactive widgets (dependency-free SVG charts, no heavy chart lib).
- **Code splitting**: per-route group; new 0F/0G centers are isolated routes.
- **Deterministic engines** (`lib/commerce-transaction`, `lib/marketplace-intelligence`)
  are pure and tree-shakeable; no runtime dependency added.
- **Caching/perf libs**: `lib/performance` cache + Next image optimisation
  (`remotePatterns` incl. Supabase storage from 0A).
- `next.config` enforces `ignoreBuildErrors: false` and security headers.

## Observations
- `/checkout` is the heaviest interactive route (~408 kB first load) — acceptable
  for a payment surface; candidate for further lazy-loading post-launch.

## Verdict
Bundle footprint is lean and consistent; no regressions introduced by 0F/0G.
Score **8.5/10** (−1.5 pending hosted Lighthouse/Web-Vitals capture).
