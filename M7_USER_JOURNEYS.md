# M7.13 — Mandatory User Journeys Report

Phase: KARTEX M7

All three mandatory journeys function from the unified workspace.

## Journey A — Workspace → Tasks → Research → Knowledge → Simulation → Approve

1. **Open Workspace** (`/workspace`) — the personal landing shows My Tasks,
   pending actions, projects, and notifications.
2. **View Tasks** — My Tasks (or the Action Center) lists assigned work with deep
   links.
3. **Open Research / Generate Knowledge** — open the relevant project, then its
   Intelligence workflow (Research → Knowledge stages) via the project's linked
   workflow.
4. **Run Simulation** — the project's simulation link (or workflow simulation
   stage) opens the Simulation OS in one click.
5. **Approve Decision** — the Action Center surfaces the pending governance
   approval; "Open" deep-links to the decision to approve.

## Journey B — Notification → Recommendation → SECIS → Approve

1. **Open Notification** — the header bell / Notification Center shows a new
   recommendation or event.
2. **Review Recommendation** — the Intelligence Inbox unifies recommendations
   from Simulation and SECIS; open the item.
3. **Launch SECIS** — the inbox item / notification deep-links into the SECIS
   change-impact analysis.
4. **Approve Action** — return to the Action Center and approve the resulting
   governance action.

## Journey C — Search Project → Knowledge → Simulations → Governance

1. **Search Project** — Unified Search (`/workspace/search`) finds a project (and
   groups results by type).
2. **Open Related Knowledge** — the project's linked Intelligence workflow opens
   the Lineage Center showing the research/knowledge origin.
3. **View Simulations** — the project's simulation link opens the Simulation OS.
4. **View Governance** — the project's governance link opens the governed
   decision; the lineage round-trips back to its simulation/knowledge/research
   source.

## Verification

- `next build` compiles all workspace routes alongside the five systems and the
  intelligence spine.
- `tests/unit/workspace.test.ts` validates system metadata, RBAC, and id
  generation; the aggregation hooks read real store state.
- Seeded projects wrap the real M6 workflows, so every journey traverses real
  cross-system links.
