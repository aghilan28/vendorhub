# M7.1 — Workspace Baseline Audit Report

Phase: KARTEX M7 — Intelligence Workspace & User Experience Platform
Date: 2026-05-30

## 1. Method

Audited the post-M6 platform (M3 Simulation, M4 SECIS, M5 Governance, M6
Intelligence spine) for usability: navigation, workflow friction, duplication,
context switching, discoverability, and information overload — from the
perspective of a non-technical operator.

## 2. Findings

| Dimension | Finding | Severity |
| --- | --- | --- |
| **Navigation** | Six sidebars (Simulation, SECIS, Governance, Intelligence + the M6 hub links). The hub helps, but there is no single *personal* landing page; the user must know which system to enter. | High |
| **Workflow friction** | M6 added a continuous workflow, but doing work still means jumping into each system's UI and back. No "my work" surface. | High |
| **Duplication** | Each system has its own command center, history, settings, and a "decisions/recommendations/risks" notion. From a user's view these overlap; there is no single Action/Inbox surface. | Medium |
| **Context switching** | To act on a pending governance approval the user navigates: Governance to Decisions to filter review to open. Pending work is scattered across systems. | High |
| **Discoverability** | M6 cross-system search exists at `/intelligence/search`, but there is no project grouping, no notifications, and no inbox of what is relevant to *me*. | Medium |
| **Information overload** | Each command center shows everything for its domain; nothing filters to the items the current user owns, is assigned, or must act on. | Medium |
| **Personalization** | None. No favorites, bookmarks, saved searches, preferences, or saved views. | High |
| **Landing experience** | No default platform landing; `/intelligence` is system-level, not person-level. | High |

## 3. Gap summary

M1-M6 delivered **capability and integration**, but the user still assembles
their own experience by hopping between systems. There is no:

1. Personal home / workspace.
2. Project layer that groups cross-system work for an initiative.
3. Single Action Center for everything awaiting the user.
4. Notification Center / unified Inbox.
5. Personalization (favorites, bookmarks, saved searches, preferences).
6. Activity timeline or product-usage analytics.

## 4. M7 realization strategy

Add a **personal workspace layer** on top of the integrated platform - without
changing the underlying systems:

1. **Workspace model** (`lib/workspace/types.ts`) - Workspace, Project, Task,
   Action, Insight, Notification, Assignment, Review/Approval refs, Bookmark,
   Favorite, SavedSearch, Preferences, Activity (M7.2).
2. **Persisted workspace store** (`store/workspace-store.ts`) - projects, tasks,
   notifications, bookmarks, favorites, saved searches, preferences - seeded to
   wrap the real M6 workflows and cross-system items.
3. **Cross-store aggregation** reusing the M6 hooks plus workspace-specific hooks
   (my tasks, my approvals, inbox, notifications, analytics).
4. **Unified UI** (`(workspace)` route group): Intelligence Home (`/workspace`),
   Project Center, Action Center, Notification Center, Intelligence Inbox,
   Unified Search, Activity Timeline, Personalization, and Analytics.
5. **Reduced friction**: `/workspace` is the personal landing; one Action Center
   and one Inbox replace scattered pending-work surfaces; deep links jump
   straight to the underlying item in one click.

This baseline confirms M7 is the usability phase: capability is done; the work is
to make one coherent workspace experience.
