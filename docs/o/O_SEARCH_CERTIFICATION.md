# O.7 — Search Certification

Unified platform search was added in Phase O: `lib/platform/search.ts` (engine)
and `features/platform/components/platform-search.tsx` (the "Search" tab on
`/platform`).

---

## What it indexes

`buildSearchIndex()` produces one flat, deterministic index across the entire
platform model. The index covers seven entity kinds:

| Kind | Source | Mandated coverage |
|------|--------|-------------------|
| `subsystem` | 8 subsystems | Research, Knowledge, Simulation, SECIS, Governance, Execution, Workspace, Integration |
| `scenario` | 7 demo scenarios | Actions / end-to-end flows |
| `use-case` | 8 use cases | Projects (domain initiatives) |
| `metric` | 7 value metrics | Business value |
| `tour` | guided tours | Walkthroughs |
| `document` | doc sections | Documents |
| `guide` | 8 audience guides | Reports / guides |

## Required reach (Section O.7) — verified

| Target | Reached via | Verified |
|--------|-------------|----------|
| Research | subsystem entry | ✅ `searchPlatform("research")` |
| Knowledge | subsystem entry | ✅ |
| Simulation | subsystem entry | ✅ |
| SECIS | subsystem entry | ✅ `searchPlatform("secis")` |
| Governance | subsystem entry | ✅ |
| Execution | subsystem entry | ✅ |
| Projects | use cases | ✅ |
| Actions | scenarios (stages) | ✅ `searchPlatform("supplier")` → supplier-failure |
| Documents | doc sections | ✅ |
| Reports | audience guides | ✅ |

## Behaviour

- **Scoring:** title match (×5) > subtitle (×2) > keyword/body (×1); ties broken
  alphabetically for stable ordering.
- **Empty query** returns an empty list and the UI shows the reachable domains.
- **Navigable:** every result has a `/`-rooted `href` into the relevant surface
  (subsystem focus, `/showcase?scenario=…`, `/platform/docs#guide`).
- **Deterministic:** identical queries return identical results.

## Tests

`tests/unit/phase-o-completion.test.ts` asserts: all seven kinds are indexed,
every intelligence subsystem is reachable by name, the supplier scenario is
found, hrefs are navigable, and results are deterministic.

**Verdict:** unified search reaches every mandated domain. ✅ PASS.
