# MCP-1A.6 — Seller Activation Center

**Engine:** `lib/seller-activation/activation.ts` · **Surface:** `/seller/activation`
(`SellerActivationCenter`).

## What it shows (all mandated)
- **Onboarding status** — progress percent + completed steps.
- **Verification status** — checks passed/total + decision + escalation.
- **Catalog status** — products, published, catalog **health** score.
- **Store health** — blend of onboarding + verification + catalog.
- **Trust status** — trust score (verification contribution + reputation).
- **Activation score + stage** — `registering → verifying → building_catalog →
  ready → active`.
- **Action Center / activation tasks** — `buildActivationSnapshot` produces a
  severity-ranked, next-best-action task list (finish onboarding, submit, fix
  verification, add/publish products, improve quality, restock, fulfil orders,
  grow), each deep-linking to the resolving workspace.
- **Daily briefing** — human-readable status lines.
- **Growth recommendations / catalog opportunities / inventory alerts /
  marketplace intelligence** — surfaced via tasks + `sellerRecommendations`.

## Integration
Designed to integrate Seller OS (catalog/inventory/orders signals via
`ActivationInput.lowStockCount` / `openOrders`), the Trust Layer (trust score),
Commerce Intelligence and the Transaction Engine (fulfilment links).

## Exit criteria — met
The seller always knows exactly what to do next. Covered by 2 activation tests
(active seller + brand-new seller next-actions).
