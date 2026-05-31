# O.9 — Showcase Certification

Verifies the showcase/realization surfaces and their readiness for evaluation
audiences.

---

## Components

| Element | Location | Status |
|---------|----------|--------|
| Platform Map | `/platform` → Platform Map tab | ✅ flow + fabric + dependencies |
| Platform Tour | `/platform` → Guided Tours (complete + per-subsystem) | ✅ interactive stepper |
| Storyboard | `/platform` → Storyboard tab | ✅ signal → outcome visual |
| Use Cases | `/platform` → Use Cases tab (8 domains) | ✅ deep-link to scenarios |
| Documentation Hub | `/platform` → Documentation + `/platform/docs` | ✅ quick ref + 8 audience guides |
| Business Value Dashboard | `/platform` → Business Value tab | ✅ 7 metrics with sparklines |
| Showcase Mode | `/showcase` | ✅ full-screen, minimal, story-driven |
| Search | `/platform` → Search tab | ✅ unified search (O.7) |

## Readiness

- **Investor readiness:** Showcase Mode + Business Value Dashboard + Investor
  Guide (`/platform/docs#investor`) present the problem, solution and value.
- **Faculty readiness:** Platform Map + Architecture Guide + Faculty Guide expose
  the design and verification rigour.
- **Competition readiness:** Judge Guide (`/platform/docs#judge`) gives a
  five-minute evaluation path; everything is public (no login) and builds clean.

## Render proof

- `/platform` is prerendered to `platform.html` (≈49 KB) containing all section
  labels (Platform Map, Intelligence flow, Business Value, Guided Tours, Enter
  Showcase Mode) — proof the showcase hub renders, not just compiles.
- `/platform/docs` builds as a static route (1.16 kB).
- `/showcase` builds as a dynamic route and renders the beat stepper.

**Verdict:** showcase surfaces are complete and investor/faculty/competition
ready. ✅ PASS.
