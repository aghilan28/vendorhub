# N.1 — Platform Audit

**Phase:** KARTEX Phase N — Platform Realization, Showcase & Demonstration System
**Repository:** vendorhub (Next.js 15 / React 19 / TypeScript)

Phase N is not a new capability phase. It audits everything built in M1–M8 and
closes the **demonstration, navigation and presentation** gaps so a newcomer can
understand the platform in minutes.

---

## 1. Capability audit (M1–M8)

| Phase | Subsystem | Capability delivered | Demonstrable before N? |
|-------|-----------|----------------------|------------------------|
| M1 | Research OS | Signal ingestion, evidence synthesis, source traceability | Engine only |
| M2 | Knowledge OS | Knowledge graph, belief revision, drift detection | Engine only |
| M3 | Simulation OS | Scenario modelling, outcome forecasting | Engine only |
| M4 | SECIS | Threat detection, integrity & calibration | Engine only |
| M5 | Governance OS | Decision review, approval, audit trail | Admin surfaces |
| M6 | Integration Layer | Shared contracts, typed envelopes, event flow | Implicit (API) |
| M7 | Workspace Layer | Dashboards, navigation, operator surfaces | Admin dashboards |
| M8 | Execution OS | Action plans, initiatives, KPIs, decision activation | `/admin/execution` |

## 2. User journeys that existed

- **Operator journeys** (authenticated): admin dashboards, governance, and the
  M8 execution workspace.
- **Demo journeys**: a marketing `/demo` flow and `/launch` certification page
  (commerce-focused, not platform-explanatory).

## 3. Gap analysis

### 3.1 Demonstration gaps
- No single place that shows **all eight subsystems working as one system**.
- No prebuilt, end-to-end **scenarios** a presenter can run.
- No **showcase / presentation mode** for judges, investors or faculty.

### 3.2 Navigation gaps
- No **platform map** showing subsystems, relationships and dependencies.
- Subsystem engines were reachable only by reading code or admin dashboards.
- No **guided tours** to walk a newcomer through the platform.

### 3.3 Presentation gaps
- No **value explanation** (what / why / problem / value / who) per subsystem.
- No **intelligence storyboard** visualising the flow.
- No **business value dashboard** expressing impact in business terms.
- No in-app **documentation hub** (architecture, capabilities, workflows).
- No **use case library** mapping domains to demonstrations.

### 3.4 Audience gap (the core problem)
The platform was understandable mainly to its **builders**. There was no
audience-facing surface for **judges, investors, mentors, faculty and
customers**.

## 4. What Phase N adds

A public **Platform Realization Layer**:

- `/platform` — Platform Map, Storyboard, Value Explanation, Demo Scenarios,
  Use Case Library, Business Value Dashboard, Guided Tours, Documentation Hub.
- `/showcase` — presentation-ready, minimal, full-screen, story-driven mode.
- `lib/platform/` — a deterministic model that is the single source of truth for
  all of the above and is fully unit-tested.

Both routes are **public** (no login) because the target audience does not have
operator credentials.

## 5. Audit conclusion

M1–M8 delivered powerful capability with weak explainability. Phase N converts
that capability into a **demonstrable product** without adding new intelligence
logic. Subsequent reports (Platform Map, User Journeys, Realization,
Certification) document the delivered layer against these gaps.
