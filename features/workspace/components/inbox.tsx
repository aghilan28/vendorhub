"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Inbox as InboxIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import type { InboxKind } from "@/lib/workspace";
import { useHydrated, useInbox } from "../hooks";
import { INBOX_META, relativeTime } from "../format";
import { WorkspaceShell, WSCard, StatTile, SystemPill } from "./primitives";
import { ListSkeleton } from "./skeletons";

const KINDS: Array<InboxKind | "all"> = ["all", "insight", "recommendation", "warning", "risk", "approval", "exception", "task"];

export function IntelligenceInbox() {
  const hydrated = useHydrated();
  const items = useInbox();
  const [filter, setFilter] = useState<InboxKind | "all">("all");

  if (!hydrated) return <ListSkeleton />;

  const filtered = filter === "all" ? items : items.filter((i) => i.kind === filter);

  return (
    <WorkspaceShell title="Intelligence Inbox" description="One unified stream of everything relevant to you: insights, recommendations, warnings, risks, approvals, exceptions, and tasks.">
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Total" value={String(items.length)} icon={InboxIcon} tone="info" />
        <StatTile label="Recommendations" value={String(items.filter((i) => i.kind === "recommendation").length)} tone="info" />
        <StatTile label="Risks" value={String(items.filter((i) => i.kind === "risk").length)} tone="warning" />
        <StatTile label="Approvals" value={String(items.filter((i) => i.kind === "approval").length)} tone="warning" />
        <StatTile label="Exceptions" value={String(items.filter((i) => i.kind === "exception").length)} tone="warning" />
        <StatTile label="Tasks" value={String(items.filter((i) => i.kind === "task").length)} tone="neutral" />
      </div>

      <WSCard title="Inbox" description={`${filtered.length} item${filtered.length === 1 ? "" : "s"}`} action={
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => <button key={k} type="button" onClick={() => setFilter(k)} className={`min-h-8 rounded-full border px-2.5 text-xs font-medium focus-ring ${filter === k ? "border-brand bg-emerald-50 text-brand" : "border-border text-secondary-text hover:bg-slate-50"}`}>{k}</button>)}
        </div>
      }>
        {filtered.length === 0 ? <EmptyState icon={InboxIcon} title="Inbox zero" description="Nothing needs your attention right now." /> : (
          <div className="space-y-2">
            {filtered.map((i) => {
              const meta = INBOX_META[i.kind];
              const Icon = meta.icon;
              return (
                <Link key={i.id} href={i.route as Route} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 focus-ring hover:bg-slate-50">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-md bg-slate-100"><Icon className="size-4 text-secondary-text" /></span>
                    <div className="min-w-0"><p className="truncate text-sm font-medium text-primary-text">{i.title}</p><p className="text-xs text-secondary-text">{i.detail} · {relativeTime(i.at)}</p></div>
                  </div>
                  <div className="flex items-center gap-2"><Badge variant={meta.variant}>{meta.label}</Badge><SystemPill system={i.system} /></div>
                </Link>
              );
            })}
          </div>
        )}
      </WSCard>
    </WorkspaceShell>
  );
}
