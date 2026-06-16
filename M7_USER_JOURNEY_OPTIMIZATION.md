# M7.10 — User Journey Optimization Report

Phase: KARTEX M7

Goal: reduce clicks, reduce context switching, reduce navigation depth, and
eliminate duplicated workflows.

## Before (post-M6)

| Task | Path | Clicks |
| --- | --- | --- |
| See everything awaiting me | Not possible — check each system separately | many |
| Act on a pending approval | Governance → Decisions → filter "review" → open → approve | 4-5 |
| Find a simulation by name | Simulation → command center → scan/scroll | 3+ |
| See my work for an initiative | Not possible — no project grouping | n/a |
| Know something happened | Not possible — no notifications | n/a |

## After (M7)

| Task | Path | Clicks |
| --- | --- | --- |
| See everything awaiting me | `/workspace` (landing) or Action Center | 0-1 |
| Act on a pending approval | Home/Action Center → "Open" (deep link to decision) → approve | 2 |
| Find anything by name | Unified Search → result deep link | 2 |
| See my work for an initiative | Project Center → project → linked items | 2 |
| Know something happened | Notification bell (badge) → open | 1 |

## Optimizations applied

1. **Single landing**: `/workspace` is the personal home; the user no longer
   needs to know which system to open first.
2. **One Action Center + one Inbox** replace scattered, duplicated pending-work
   surfaces across five systems.
3. **Deep links everywhere**: every action, inbox item, project link, search
   result, and notification links straight to the underlying item in one click.
4. **Cross-system search** removes the need to enter each system to find things.
5. **Notification bell** with an unread badge in the header surfaces events
   without navigating.
6. **Hub navigation**: each system sidebar starts with a back-to-platform link
   ("My Workspace" / "Intelligence Hub"), reducing dead-ends.
7. **Reduced depth**: the deepest common task (act on an approval) drops from
   4-5 clicks to 2.

## Eliminated duplication

- Pending work was implicitly duplicated across each system's command center;
  it is now unified in the Action Center.
- Recommendations/insights/risks/approvals scattered across Simulation/SECIS/
  Governance are unified in the Intelligence Inbox.
- Activity/history per system is unified into one Activity Timeline.
