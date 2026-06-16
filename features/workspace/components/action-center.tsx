"use client";

import Link from "next/link";
import type { Route } from "next";
import { ListChecks, ClipboardCheck, Stamp, FlaskConical, Gavel, CheckSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import type { ActionKind } from "@/lib/workspace";
import { useHydrated, useActionItems } from "../hooks";
import { priorityVariant } from "../format";
import { WorkspaceShell, WSCard, StatTile, SystemPill } from "./primitives";
import { ListSkeleton } from "./skeletons";

const GROUPS: Array<{ kind: ActionKind; label: string; icon: typeof ListChecks }> = [
  { kind: "review", label: "Pending reviews", icon: ClipboardCheck },
  { kind: "approval", label: "Pending approvals", icon: Stamp },
  { kind: "decision", label: "Pending decisions", icon: Gavel },
  { kind: "simulation", label: "Pending simulations", icon: FlaskConical },
  { kind: "governance", label: "Pending governance actions", icon: Gavel },
  { kind: "task", label: "My tasks", icon: CheckSquare },
];

export function ActionCenter() {
  const hydrated = useHydrated();
  const actions = useActionItems();
  if (!hydrated) return <ListSkeleton />;

  return (
    <WorkspaceShell title="Action Center" description="Everything awaiting you across every system — reviews, approvals, simulations, decisions, governance actions, and tasks — in one place.">
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {GROUPS.map((g) => {
          const count = actions.filter((a) => a.kind === g.kind).length;
          return <StatTile key={g.kind} label={g.label} value={String(count)} icon={g.icon} tone={count ? "warning" : "neutral"} />;
        })}
      </div>

      {actions.length === 0 ? (
        <EmptyState icon={ListChecks} title="You're all caught up" description="No reviews, approvals, runs, or tasks are awaiting you." />
      ) : (
        GROUPS.map((g) => {
          const items = actions.filter((a) => a.kind === g.kind);
          if (items.length === 0) return null;
          const Icon = g.icon;
          return (
            <WSCard key={g.kind} title={g.label} description={`${items.length} item${items.length === 1 ? "" : "s"}`} action={<Icon className="size-4 text-secondary-text" />}>
              <div className="space-y-2">
                {items.map((a) => (
                  <Link key={a.id} href={a.route as Route} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 focus-ring hover:bg-slate-50">
                    <div className="min-w-0"><p className="truncate text-sm font-medium text-primary-text">{a.title}</p><p className="text-xs text-secondary-text">{a.detail}</p></div>
                    <div className="flex items-center gap-2"><Badge variant={priorityVariant(a.priority)}>{a.priority}</Badge><SystemPill system={a.system} /></div>
                  </Link>
                ))}
              </div>
            </WSCard>
          );
        })
      )}
    </WorkspaceShell>
  );
}
