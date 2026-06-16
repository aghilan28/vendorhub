"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Search as SearchIcon, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/empty-state";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useHydrated, useWorkspaceSearch } from "../hooks";
import { relativeTime } from "../format";
import { WorkspaceShell, WSCard } from "./primitives";
import { ListSkeleton } from "./skeletons";

const SYSTEMS = ["all", "projects", "tasks", "research", "knowledge", "simulation", "secis", "governance"];

export function WorkspaceSearch() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const savedSearches = useWorkspaceStore((s) => s.savedSearches);
  const saveSearch = useWorkspaceStore((s) => s.saveSearch);
  const deleteSearch = useWorkspaceStore((s) => s.deleteSearch);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [system, setSystem] = useState(params.get("system") ?? "all");
  const grouped = useWorkspaceSearch(query, system);

  if (!hydrated) return <ListSkeleton />;

  const groups = Object.entries(grouped);
  const total = groups.reduce((sum, [, items]) => sum + items.length, 0);

  return (
    <WorkspaceShell title="Unified Search" description="One search across Projects, Tasks, Research, Knowledge, Simulation, SECIS, and Governance — results grouped by type.">
      <WSCard title="Search everything">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary-text" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects, tasks, and every system…" className="pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={system} onValueChange={setSystem}>
              <SelectTrigger className="h-9 min-h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{SYSTEMS.map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All" : s === "secis" ? "SECIS" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="secondary" onClick={() => saveSearch({ label: query || `${system} items`, query, system })}><Bookmark className="size-4" /> Save search</Button>
          </div>
        </div>
      </WSCard>

      {savedSearches.length > 0 ? (
        <WSCard title="Saved searches">
          <div className="flex flex-wrap gap-2">
            {savedSearches.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs">
                <button type="button" className="font-medium text-primary-text hover:underline" onClick={() => { setQuery(s.query); setSystem(s.system); }}>{s.label}</button>
                <button type="button" aria-label="Delete saved search" className="text-secondary-text hover:text-danger" onClick={() => deleteSearch(s.id)}>×</button>
              </span>
            ))}
          </div>
        </WSCard>
      ) : null}

      <WSCard title="Results" description={`${total} match${total === 1 ? "" : "es"} across ${groups.length} type${groups.length === 1 ? "" : "s"}`}>
        {total === 0 ? <EmptyState icon={SearchIcon} title="No matches" description="Try a different query or system." /> : (
          <div className="space-y-5">
            {groups.map(([type, items]) => (
              <div key={type}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary-text">{type} ({items.length})</p>
                <div className="space-y-2">
                  {items.slice(0, 30).map((r) => (
                    <Link key={`${r.system}-${r.id}`} href={r.route as Route} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 focus-ring hover:bg-slate-50">
                      <div className="min-w-0"><p className="truncate text-sm font-medium text-primary-text">{r.title}</p><p className="text-xs text-secondary-text">{r.system} · {relativeTime(r.date)}</p></div>
                      <Badge variant="secondary">{r.status}</Badge>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </WSCard>
    </WorkspaceShell>
  );
}
