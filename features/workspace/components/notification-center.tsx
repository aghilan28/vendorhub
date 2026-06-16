"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useHydrated } from "../hooks";
import { NOTIFICATION_META, relativeTime } from "../format";
import { WorkspaceShell, WSCard, StatTile, SystemPill } from "./primitives";
import { ListSkeleton } from "./skeletons";

const KINDS = ["all", "approval", "review", "event", "failure", "recommendation"] as const;

export function NotificationCenter() {
  const hydrated = useHydrated();
  const notifications = useWorkspaceStore((s) => s.notifications);
  const markRead = useWorkspaceStore((s) => s.markNotificationRead);
  const markAllRead = useWorkspaceStore((s) => s.markAllRead);
  const [filter, setFilter] = useState<(typeof KINDS)[number]>("all");

  if (!hydrated) return <ListSkeleton />;

  const sorted = [...notifications].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const filtered = filter === "all" ? sorted : sorted.filter((n) => n.kind === filter);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <WorkspaceShell
      title="Notification Center"
      description="Events from Research, Knowledge, Simulation, SECIS, and Governance — approvals, reviews, failures, and recommendations — unified."
      actions={<Button variant="secondary" disabled={!unread} onClick={markAllRead}><CheckCheck className="size-4" /> Mark all read</Button>}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Total" value={String(notifications.length)} icon={Bell} tone="info" />
        <StatTile label="Unread" value={String(unread)} tone={unread ? "warning" : "success"} />
        <StatTile label="Failures" value={String(notifications.filter((n) => n.kind === "failure").length)} tone={notifications.some((n) => n.kind === "failure") ? "danger" : "neutral"} />
      </div>

      <WSCard title="Notifications" description={`${filtered.length} shown`} action={
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => <button key={k} type="button" onClick={() => setFilter(k)} className={`min-h-8 rounded-full border px-2.5 text-xs font-medium focus-ring ${filter === k ? "border-brand bg-emerald-50 text-brand" : "border-border text-secondary-text hover:bg-slate-50"}`}>{k}</button>)}
        </div>
      }>
        {filtered.length === 0 ? <EmptyState icon={Bell} title="No notifications" description="You're all caught up." /> : (
          <div className="space-y-2">
            {filtered.map((n) => (
              <div key={n.id} className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${n.read ? "border-border" : "border-ai/40 bg-blue-50/40"}`}>
                <Link href={(n.route ?? "/workspace") as Route} className="min-w-0 flex-1" onClick={() => markRead(n.id)}>
                  <p className="truncate text-sm font-medium text-primary-text">{n.title}</p>
                  <p className="text-xs text-secondary-text">{n.detail} · {relativeTime(n.createdAt)}</p>
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant={NOTIFICATION_META[n.kind].variant}>{NOTIFICATION_META[n.kind].label}</Badge>
                  <SystemPill system={n.system} />
                  {!n.read ? <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </WSCard>
    </WorkspaceShell>
  );
}
