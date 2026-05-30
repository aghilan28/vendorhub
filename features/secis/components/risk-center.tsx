"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/empty-state";
import { analyzeChange, type RiskEvent, type RiskLevel } from "@/lib/secis";
import { useSecisStore } from "@/store/secis-store";
import { useHydrated } from "../hooks";
import { riskVariant } from "../format";
import { SecisShell, SecisCard, StatTile } from "./primitives";
import { HBars } from "./charts";
import { ListSkeleton } from "./skeletons";

const LEVELS: Array<RiskLevel | "all"> = ["all", "critical", "high", "medium", "low"];
const CATEGORIES = ["all", "dependency", "propagation", "operational", "financial"] as const;

export function RiskCenter() {
  const hydrated = useHydrated();
  const changeEvents = useSecisStore((s) => s.changeEvents);
  const entities = useSecisStore((s) => s.entities);
  const edges = useSecisStore((s) => s.edges);
  const settings = useSecisStore((s) => s.settings);
  const [levelFilter, setLevelFilter] = useState<RiskLevel | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<(typeof CATEGORIES)[number]>("all");

  const data = useMemo(() => {
    const active = changeEvents.filter((e) => e.status === "active");
    const eventRisks: Array<{ id: string; name: string; score: number; level: RiskLevel }> = [];
    const allRiskEvents: Array<RiskEvent & { eventId: string; eventName: string }> = [];
    for (const ev of active) {
      const { risk } = analyzeChange(ev, entities, edges, { severityThreshold: settings.severityThreshold, maxDepth: settings.maxDepth });
      eventRisks.push({ id: ev.id, name: ev.name, score: risk.score, level: risk.level });
      for (const re of risk.events) allRiskEvents.push({ ...re, eventId: ev.id, eventName: ev.name });
    }
    eventRisks.sort((a, b) => b.score - a.score);
    allRiskEvents.sort((a, b) => b.score - a.score);
    return { eventRisks, allRiskEvents };
  }, [changeEvents, entities, edges, settings]);

  if (!hydrated) return <ListSkeleton />;

  const filtered = data.allRiskEvents.filter((r) => (levelFilter === "all" || r.level === levelFilter) && (categoryFilter === "all" || r.category === categoryFilter));
  const critical = data.allRiskEvents.filter((r) => r.level === "critical" || r.level === "high");
  const byCategory = ["dependency", "propagation", "operational", "financial"].map((cat) => ({ label: cat, value: data.allRiskEvents.filter((r) => r.category === cat).length, display: String(data.allRiskEvents.filter((r) => r.category === cat).length) }));

  if (data.eventRisks.length === 0) {
    return (
      <SecisShell title="Risk Center" description="Risk registry, scores, trends, and critical risks across the change portfolio.">
        <EmptyState icon={ShieldAlert} title="No active change events" description="Create and analyse change events to populate the risk registry." />
      </SecisShell>
    );
  }

  return (
    <SecisShell title="Risk Center" description="A live risk registry across every active change event — scores, trends, critical risks, and dependency / propagation / operational breakdowns.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Registry entries" value={String(data.allRiskEvents.length)} icon={ShieldAlert} tone="info" />
        <StatTile label="Critical / high" value={String(critical.length)} tone={critical.length ? "danger" : "success"} />
        <StatTile label="Events tracked" value={String(data.eventRisks.length)} tone="neutral" />
        <StatTile label="Top risk score" value={`${data.eventRisks[0]?.score ?? 0}/100`} tone="warning" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SecisCard title="Risk scores by event" description="Portfolio risk trend.">
          <HBars rows={data.eventRisks.map((r) => ({ label: r.name, value: r.score, display: `${r.score}`, tone: r.score >= 78 ? "danger" : r.score >= 55 ? "danger" : r.score >= 30 ? "warning" : "brand" }))} />
        </SecisCard>
        <SecisCard title="Risks by category" description="Where risk concentrates.">
          <HBars rows={byCategory.map((c) => ({ label: c.label, value: c.value, display: c.display, tone: "ai" }))} max={Math.max(...byCategory.map((c) => c.value), 1)} />
        </SecisCard>
      </div>

      <SecisCard title="Critical risks" description="Highest-severity entries needing attention.">
        {critical.length === 0 ? <p className="text-sm text-secondary-text">No critical or high risks.</p> : (
          <div className="grid gap-2 md:grid-cols-2">
            {critical.slice(0, 8).map((r) => (
              <Link key={r.id} href={`/secis/${r.eventId}` as Route} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 focus-ring hover:bg-slate-50">
                <div className="min-w-0"><p className="truncate text-sm font-medium text-primary-text">{r.entityName}</p><p className="text-xs text-secondary-text">{r.eventName} · {r.category}</p></div>
                <Badge variant={riskVariant(r.level)}>{r.level} · {r.score}</Badge>
              </Link>
            ))}
          </div>
        )}
      </SecisCard>

      <SecisCard
        title="Risk registry"
        description={`${filtered.length} entries`}
        action={
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((l) => <button key={l} type="button" onClick={() => setLevelFilter(l)} className={`min-h-8 rounded-full border px-2.5 text-xs font-medium focus-ring ${levelFilter === l ? "border-brand bg-emerald-50 text-brand" : "border-border text-secondary-text hover:bg-slate-50"}`}>{l}</button>)}
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => <button key={c} type="button" onClick={() => setCategoryFilter(c)} className={`min-h-8 rounded-full border px-2.5 text-xs font-medium focus-ring ${categoryFilter === c ? "border-ai bg-blue-50 text-ai" : "border-border text-secondary-text hover:bg-slate-50"}`}>{c}</button>)}
        </div>
        <div className="responsive-table-shell max-h-[28rem] overflow-y-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Entity</TableHead><TableHead>Event</TableHead><TableHead>Category</TableHead><TableHead>Level</TableHead><TableHead>Score</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}><TableCell className="font-medium text-primary-text">{r.entityName}</TableCell><TableCell><Link href={`/secis/${r.eventId}` as Route} className="text-ai hover:underline">{r.eventName}</Link></TableCell><TableCell>{r.category}</TableCell><TableCell><Badge variant={riskVariant(r.level)}>{r.level}</Badge></TableCell><TableCell>{r.score}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SecisCard>
    </SecisShell>
  );
}
