# O.8 — Demo Certification

Every mandated demo scenario exists, walks the full six-stage intelligence flow
in order, carries quantified impact, and ends with an outcome. Verified in
`tests/unit/phase-o-completion.test.ts` and `tests/unit/platform-realization.test.ts`.

---

## Mandated scenarios

| Scenario | Id | Stages (6, in order) | Impact metrics | Outcome | Status |
|----------|----|----------------------|----------------|---------|--------|
| Supplier Failure | `supplier-failure` | ✅ | Revenue protected, stock-out avoided, decision time | ✅ | ✅ completes |
| Demand Surge | `demand-surge` | ✅ | Revenue captured, SLA held, overstock avoided | ✅ | ✅ completes |
| Inventory Crisis | `inventory-crisis` | ✅ | Margin recovered, dead stock cleared, carrying cost | ✅ | ✅ completes |
| Pricing Change | `pricing-change` | ✅ | Revenue/margin impact, conversion risk | ✅ | ✅ completes |
| Store Expansion | `store-expansion` | ✅ | Capital at risk reduced, payback clarity | ✅ | ✅ completes |
| Customer Growth | `customer-growth` | ✅ | Retention lift, CAC, LTV/CAC | ✅ | ✅ completes |

(The model also includes a seventh scenario — Logistics Disruption — used by
Journey E and the Operations use case.)

## "Completes" means

For each scenario, Showcase Mode renders **8 beats**: intro → 6 ordered stages →
measured outcome, navigable end-to-end with prev/next and replay. Each stage
shows the subsystem's action and the artefact it produces; the outcome beat
shows the quantified impact.

## Verification

- `searchPlatform("supplier")` resolves `supplier-failure` (deep-link works).
- Tests assert each required scenario exists, has exactly 6 stages, ≥1 impact
  metric and a non-empty outcome.
- `/showcase?scenario=<id>` builds and renders for every scenario id.

**Verdict:** all mandated demo scenarios complete end-to-end. ✅ PASS.
