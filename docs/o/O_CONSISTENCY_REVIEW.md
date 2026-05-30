# O.4 — Platform Consistency Review

Audit of navigation, naming, terminology and visual/UX/workflow consistency
across the intelligence platform surfaces, with corrective notes.

---

## 1. Navigation

- **Admin sidebar** (`lib/constants/navigation.ts`) exposes Platform and
  Execution alongside existing admin sections, in a single ordered list.
- **Public entry points:** `/platform` (hub) and `/showcase` (presentation) are
  reachable directly and cross-linked (hub → Showcase; tours → Showcase; docs →
  `/platform/docs`).
- **Finding:** no orphan routes within platform scope; every platform surface is
  reachable in ≤ 2 clicks from `/platform`.

## 2. Naming & terminology

Canonical terms are defined once in `lib/platform/subsystems.ts` and reused
everywhere (map, storyboard, scenarios, search, docs), preventing drift:

| Concept | Canonical term |
|---------|----------------|
| The six stages | Research, Knowledge, Simulation, SECIS, Governance, Execution |
| The two layers | Integration Layer, Workspace Layer |
| The flow | "intelligence flow" |
| The presentation surface | "Showcase Mode" |

- **Resolved:** Execution is labelled "Execution OS" in the platform model to
  match the "OS" naming of the other subsystems, while the operator route stays
  `/admin/execution`.

## 3. Visual consistency

- All platform UI uses the shared design system: `polished-surface` /
  `operational-surface`, `Badge`, `Button`, `Tabs`, `Select`, and the
  `text-primary-text` / `text-secondary-text` / `border-border` tokens.
- Subsystem colour accents are centralised in one `accent()` map
  (`features/platform/components/shared.tsx`) and reused by map, storyboard,
  scenarios, search and showcase — so a subsystem's colour is identical everywhere.

## 4. UX & workflow consistency

- **Steppers** (Tour, Showcase) share the same progress-bar + prev/next pattern.
- **Cards** share consistent header/body structure across map, value explanation,
  scenarios, use cases and docs.
- **Deep-linking** uses one convention: `/showcase?scenario=<id>`.

## 5. Duplicates / conflicts / legacy labels removed or reconciled

| Item | Action |
|------|--------|
| Two "documentation" surfaces (hub tab + `/platform/docs`) | Reconciled: the tab shows quick reference and links to the full `/platform/docs` |
| Icon resolution scattered | Centralised in one `Icon`/`accent` module |
| Marketplace `*-placeholder` routes | Flagged as out-of-scope (next program); not surfaced in platform nav |

**Verdict:** platform experience is consistent in navigation, naming, visuals and
workflow. ✅ PASS.
