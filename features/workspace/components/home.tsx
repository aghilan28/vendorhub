"use client";

import Link from "next/link";
import type { Route } from "next";
import { FolderKanban, ListChecks, Inbox, Bell, CheckSquare, Clock, ArrowRight, Stamp, FlaskConical, ShieldCheck, Waypoints, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useHydrated, useMyTasks, useActionItems, useActivity, useProductAnalytics } from "../hooks";
import { SYSTEM_META, relativeTime, priorityVariant, projectStatusVariant, NOTIFICATION_META } from "../format";
import { WorkspaceShell, WSCard, StatTile, SystemPill, NavCard } from "./primitives";
import { HomeSkeleton } from "./skeletons";

export function WorkspaceHome() {
  const hydrated = useHydrated();
  const projects = useWorkspaceStore((s) => s.projects);
  const notifications = useWorkspaceStore((s) => s.notifications);
  const favorites = useWorkspaceStore((s) => s.favorites);
  const currentUser = useWorkspaceStore((s) => s.users.find((u) => u.id === s.currentUserId) ?? s.users[0]);
  const myTasks = useMyTasks();
  const actions = useActionItems();
  const activity = useActivity(6);
  const analytics = useProductAnalytics();

  if (!hydrated) return <HomeSkeleton />;

  const myProjects = projects.filter((p) => p.status !== "archived").slice(0, 4);
  const openTasks = myTasks.filter((t) => t.status !== "done");
  const reviews = actions.filter((a) => a.kind === "review");
  const approvals = actions.filter((a) => a.kind === "approval");
  const unread = notifications.filter((n) => !n.read);

  return (
    <WorkspaceShell
      title={`Good to see you, ${currentUser.name.split(" ")[0]}`}
      description="Your unified workspace across Research, Knowledge, Simulation, Impact, and Governance — everything you own, are assigned, or must act on, in one place."
      actions={
        <>
          <Button asChild variant="secondary"><Link href="/workspace/inbox"><Inbox className="size-4" /> Inbox</Link></Button>
          <Button asChild><Link href="/workspace/actions"><ListChecks className="size-4" /> Action Center</Link></Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="My open tasks" value={String(openTasks.length)} helper={`${myTasks.length} assigned`} icon={CheckSquare} tone={openTasks.length ? "warning" : "success"} />
        <StatTile label="Pending actions" value={String(actions.length)} helper={`${approvals.length} approvals · ${reviews.length} reviews`} icon={ListChecks} tone={actions.length ? "warning" : "neutral"} />
        <StatTile label="Active projects" value={String(analytics.activeProjects)} helper={`${analytics.projects} total`} icon={FolderKanban} tone="info" />
        <StatTile label="Unread notifications" value={String(unread.length)} helper={`${notifications.length} total`} icon={Bell} tone={unread.length ? "warning" : "neutral"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <WSCard title="My projects" description="Initiatives spanning every system." action={<Link href={"/workspace/projects" as Route} className="text-xs font-medium text-ai hover:underline">All projects</Link>}>
          {myProjects.length === 0 ? <p className="text-sm text-secondary-text">No projects yet.</p> : (
            <div className="space-y-2">
              {myProjects.map((p) => (
                <Link key={p.id} href={`/workspace/projects?project=${p.id}` as Route} className="block rounded-md border border-border px-3 py-2 focus-ring hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-primary-text">{p.name}</p>
                    <Badge variant={projectStatusVariant(p.status)}>{p.status}</Badge>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${p.progress}%` }} /></div>
                  <p className="mt-1 text-[11px] text-secondary-text">{p.links.length} linked items · {p.progress}%</p>
                </Link>
              ))}
            </div>
          )}
        </WSCard>

        <WSCard title="My tasks" description="Assigned to you." action={<Link href={"/workspace/projects" as Route} className="text-xs font-medium text-ai hover:underline">Projects</Link>}>
          {openTasks.length === 0 ? <p className="text-sm text-secondary-text">No open tasks. Nice work.</p> : (
            <div className="space-y-2">
              {openTasks.slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary-text">{t.title}</p>
                    <p className="text-xs text-secondary-text">{t.system ? SYSTEM_META[t.system].label : "General"}{t.dueDate ? ` · due ${relativeTime(t.dueDate)}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={priorityVariant(t.priority)}>{t.priority}</Badge>
                    {t.route ? <Link href={t.route as Route} className="text-xs font-medium text-ai hover:underline">Open</Link> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </WSCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <WSCard title="Awaiting you" description="Reviews and approvals across systems." action={<Badge variant={actions.length ? "warning" : "default"}>{actions.length}</Badge>}>
          {actions.length === 0 ? <p className="text-sm text-secondary-text">Nothing awaiting you.</p> : (
            <div className="space-y-2">
              {actions.slice(0, 6).map((a) => (
                <Link key={a.id} href={a.route as Route} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 focus-ring hover:bg-slate-50">
                  <div className="flex min-w-0 items-center gap-2">
                    {a.kind === "approval" ? <Stamp className="size-4 text-secondary-text" /> : <ListChecks className="size-4 text-secondary-text" />}
                    <div className="min-w-0"><p className="truncate text-sm font-medium text-primary-text">{a.title}</p><p className="text-xs text-secondary-text">{a.detail}</p></div>
                  </div>
                  <SystemPill system={a.system} />
                </Link>
              ))}
            </div>
          )}
        </WSCard>

        <WSCard title="Recent activity" description="Across every system." action={<Link href={"/workspace/activity" as Route} className="text-xs font-medium text-ai hover:underline">Timeline</Link>}>
          <div className="space-y-2">
            {activity.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <div className="min-w-0"><p className="truncate text-sm text-primary-text">{a.summary}</p><p className="text-xs text-secondary-text"><Clock className="inline size-3" /> {a.actor} · {relativeTime(a.at)}</p></div>
                <SystemPill system={a.system} />
              </div>
            ))}
          </div>
        </WSCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <WSCard title="Notifications" description="Latest across the platform." action={<Link href={"/workspace/notifications" as Route} className="text-xs font-medium text-ai hover:underline">All</Link>}>
          <div className="space-y-2">
            {notifications.slice(0, 5).map((n) => (
              <Link key={n.id} href={(n.route ?? "/workspace/notifications") as Route} className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 focus-ring hover:bg-slate-50 ${n.read ? "border-border" : "border-ai/40 bg-blue-50/40"}`}>
                <div className="min-w-0"><p className="truncate text-sm font-medium text-primary-text">{n.title}</p><p className="text-xs text-secondary-text">{n.detail} · {relativeTime(n.createdAt)}</p></div>
                <Badge variant={NOTIFICATION_META[n.kind].variant}>{NOTIFICATION_META[n.kind].label}</Badge>
              </Link>
            ))}
          </div>
        </WSCard>

        <WSCard title="Quick access" description="Favorites and systems.">
          <div className="space-y-2">
            {favorites.map((f) => <NavCard key={f.id} href={f.route} label={f.label} icon={f.route.includes("inbox") ? Inbox : f.route.includes("actions") ? ListChecks : Network} />)}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <NavCard href="/simulations" label="Simulation" icon={FlaskConical} />
            <NavCard href="/secis" label="SECIS" icon={Waypoints} />
            <NavCard href="/governance" label="Governance" icon={ShieldCheck} />
          </div>
        </WSCard>
      </div>

      <WSCard title="System health" description="Usage across the five systems.">
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {analytics.usageByStage.map((s) => (
            <div key={s.label} className="rounded-md border border-border p-3">
              <p className="text-xs text-secondary-text">{s.label}</p>
              <p className="mt-1 text-lg font-semibold text-primary-text">{s.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-secondary-text">
          <ArrowRight className="size-3" /> <Link href={"/workspace/analytics" as Route} className="font-medium text-ai hover:underline">Open product analytics</Link>
        </div>
      </WSCard>
    </WorkspaceShell>
  );
}
