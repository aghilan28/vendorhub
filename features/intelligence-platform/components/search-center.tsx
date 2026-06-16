"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/empty-state";
import { useHydrated, useSearchIndex, useUnifiedSearch } from "../hooks";
import { relativeTime } from "../format";
import { IntelShell, IntelCard, SystemPill } from "./primitives";
import { ListSkeleton } from "./skeletons";

const SYSTEMS = ["all", "research", "knowledge", "simulation", "secis", "governance"];

export function SearchCenter() {
  const hydrated = useHydrated();
  const index = useSearchIndex();
  const [query, setQuery] = useState("");
  const [system, setSystem] = useState("all");
  const [status, setStatus] = useState("all");
  const results = useUnifiedSearch({ query, system, status });

  if (!hydrated) return <ListSkeleton />;

  const statuses = ["all", ...Array.from(new Set(index.map((i) => i.status))).sort()];

  return (
    <IntelShell
      title="Cross-System Search"
      description="Search Research, Knowledge, Simulation, SECIS, and Governance from one place — and jump straight to any item."
    >
      <IntelCard title="Search the platform" description={`${index.length} items indexed across all systems`}>
        <div className="flex flex-col gap-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary-text" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search across every system…" className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={system} onValueChange={setSystem}>
              <SelectTrigger className="h-9 min-h-9 w-44"><SelectValue placeholder="System" /></SelectTrigger>
              <SelectContent>{SYSTEMS.map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All systems" : s === "secis" ? "SECIS" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 min-h-9 w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </IntelCard>

      <IntelCard title="Results" description={`${results.length} match${results.length === 1 ? "" : "es"}`}>
        {results.length === 0 ? (
          <EmptyState icon={SearchIcon} title="No matches" description="Try a different query or clear the filters." />
        ) : (
          <div className="space-y-2">
            {results.slice(0, 60).map((r) => (
              <Link key={`${r.system}-${r.id}`} href={r.route as Route} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 focus-ring hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary-text">{r.title}</p>
                  <p className="text-xs text-secondary-text">{r.type}{r.owner ? ` · ${r.owner}` : ""}{r.date ? ` · ${relativeTime(r.date)}` : ""}{r.tags.length ? ` · ${r.tags.slice(0, 3).join(", ")}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{r.status}</Badge>
                  <SystemPill system={r.system} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </IntelCard>
    </IntelShell>
  );
}
