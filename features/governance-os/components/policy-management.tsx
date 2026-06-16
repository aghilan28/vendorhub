"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { POLICY_CATEGORIES, SOURCE_SYSTEM_META } from "@/lib/governance-os";
import { useGovernanceStore } from "@/store/governance-store";
import { useHydrated, usePermission } from "../hooks";
import { relativeTime } from "../format";
import { GovShell, GovCard, PolicyStatusBadge } from "./primitives";
import { PolicyForm } from "./policy-form";
import { ListSkeleton } from "./skeletons";

export function PolicyManagement() {
  const hydrated = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const policies = useGovernanceStore((s) => s.policies);
  const canManage = usePermission("policy.manage");
  const [open, setOpen] = useState(params.get("new") === "1");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  if (!hydrated) return <ListSkeleton />;

  const filtered = policies.filter((p) => (statusFilter === "all" || p.status === statusFilter) && (categoryFilter === "all" || p.category === categoryFilter));
  const categoryName = (id: string) => POLICY_CATEGORIES.find((c) => c.id === id)?.name ?? id;

  return (
    <GovShell
      title="Policy Management Center"
      description="Author, version, categorise, and govern policies through their full lifecycle — assigning owners, reviewers, and approvers, and linking controls."
      actions={<Button onClick={() => setOpen(true)} disabled={!canManage}><Plus className="size-4" /> New policy</Button>}
    >
      <GovCard title="Policies" description={`${filtered.length} shown`} action={
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 min-h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="review">Review</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 min-h-9 w-40"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All categories</SelectItem>{POLICY_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      }>
        {filtered.length === 0 ? <p className="text-sm text-secondary-text">No policies match.</p> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <Link key={p.id} href={`/governance/policies/${p.id}` as Route} className="operational-surface flex flex-col rounded-lg p-4 focus-ring hover:bg-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex size-9 items-center justify-center rounded-md bg-emerald-50 text-brand"><FileText className="size-4" /></span>
                  <PolicyStatusBadge status={p.status} />
                </div>
                <p className="mt-3 font-medium text-primary-text">{p.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-secondary-text">{p.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="secondary">{categoryName(p.category)}</Badge>
                  <Badge variant="secondary">v{p.version}</Badge>
                  <Badge variant="secondary">{p.rules.length} rules</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.appliesToSystems.map((sys) => <span key={sys} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-secondary-text">{SOURCE_SYSTEM_META[sys].label}</span>)}
                </div>
                <p className="mt-auto pt-3 text-[11px] text-secondary-text">{p.ownerName} · {relativeTime(p.updatedAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </GovCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Create policy</DialogTitle></DialogHeader>
          <div className="mt-2"><PolicyForm onSaved={(id) => { setOpen(false); router.push(`/governance/policies/${id}`); }} onCancel={() => setOpen(false)} /></div>
        </DialogContent>
      </Dialog>
    </GovShell>
  );
}
