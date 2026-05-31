"use client";

// MCP-1B Phase 10/11 — Admin Catalog Governance Center.
// Six catalog queues (catalog/quality/duplicate/media/import/risk), governance
// dashboard, category coverage and population intelligence.

import { Activity, BarChart3, Boxes, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import type { CatalogGovernanceSnapshot, PopulationIntelligence, Severity, Tone } from "@/lib/catalog-population";

const sevBadge: Record<Severity, "default" | "secondary" | "warning" | "danger" | "ai"> = {
  info: "secondary",
  opportunity: "ai",
  watch: "ai",
  warning: "warning",
  critical: "danger",
};
const coverageBadge: Record<string, "default" | "secondary" | "warning" | "danger"> = { rich: "default", growing: "secondary", thin: "warning", empty: "danger" };

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" }) {
  const color = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : "text-primary-text";
  return (
    <div className="operational-surface rounded-lg p-4">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

export function AdminCatalogGovernance({
  governance,
  intelligence,
  sampled,
}: {
  governance: CatalogGovernanceSnapshot;
  intelligence: PopulationIntelligence;
  sampled: boolean;
}) {
  const toneTone: Tone = governance.tone;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-primary-text"><Boxes className="size-5" /> Catalog Governance</h1>
          <p className="text-sm text-secondary-text">Review, quality-gate and grow the marketplace catalog.</p>
        </div>
        <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview (sample data)" : "Live data"}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Products" value={governance.products.toLocaleString("en-IN")} />
        <Stat label="Published" value={governance.publishedProducts.toLocaleString("en-IN")} />
        <Stat label="Catalog health" value={`${governance.catalogHealth}`} tone={toneTone === "critical" ? "danger" : toneTone === "healthy" ? undefined : "warning"} />
        <Stat label="Duplicate risk" value={`${governance.duplicateRisk}%`} tone={governance.duplicateRisk > 20 ? "warning" : undefined} />
        <Stat label="Pending" value={String(governance.totalPending)} tone={governance.totalPending ? "warning" : undefined} />
      </div>

      <Tabs defaultValue={governance.queues[0]?.kind ?? "catalog"}>
        <TabsList>
          {governance.queues.map((q) => (
            <TabsTrigger key={q.kind} value={q.kind}>{q.label} ({q.items.length})</TabsTrigger>
          ))}
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
        </TabsList>

        {governance.queues.map((queue) => (
          <TabsContent key={queue.kind} value={queue.kind}>
            <GovernanceCard title={queue.label} description={`${queue.items.length} item(s).`}>
              {queue.items.length ? (
                <ul className="space-y-2">
                  {queue.items.slice(0, 40).map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={sevBadge[item.severity]}>{item.severity}</Badge>
                          <span className="truncate text-sm font-medium text-primary-text">{item.label}</span>
                        </div>
                        <p className="mt-1 text-xs text-secondary-text">{item.summary}</p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-brand">Review</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-secondary-text">Queue is clear.</p>
              )}
            </GovernanceCard>
          </TabsContent>
        ))}

        <TabsContent value="coverage">
          <GovernanceCard title="Category coverage" description="Products and sellers per root category." action={<BarChart3 className="size-4 text-secondary-text" />}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-secondary-text">
                  <tr><th className="py-2 pr-3">Category</th><th className="py-2 pr-3">Products</th><th className="py-2 pr-3">Sellers</th><th className="py-2 pr-3">Status</th></tr>
                </thead>
                <tbody>
                  {intelligence.coverage.slice(0, 30).map((c) => (
                    <tr key={c.rootSlug} className="border-t border-border">
                      <td className="py-2 pr-3 font-medium text-primary-text">{c.name}</td>
                      <td className="py-2 pr-3 text-secondary-text">{c.products}</td>
                      <td className="py-2 pr-3 text-secondary-text">{c.sellers}</td>
                      <td className="py-2 pr-3"><Badge variant={coverageBadge[c.status]}>{c.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="intelligence">
          <GovernanceCard title="Population intelligence" description={`${intelligence.forecast.currentProducts.toLocaleString("en-IN")} products · ${intelligence.forecast.targetProgress}% to target.`} action={<ShieldAlert className="size-4 text-secondary-text" />}>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Current" value={intelligence.forecast.currentProducts.toLocaleString("en-IN")} />
              <Stat label="30-day" value={intelligence.forecast.projected30d.toLocaleString("en-IN")} />
              <Stat label="90-day" value={intelligence.forecast.projected90d.toLocaleString("en-IN")} />
              <Stat label="Target" value={intelligence.forecast.targetProducts.toLocaleString("en-IN")} />
            </div>
            {intelligence.recommendations.length ? (
              <ul className="space-y-2">
                {intelligence.recommendations.map((r) => (
                  <li key={r.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={sevBadge[r.severity]}>{r.kind.replace(/_/g, " ")}</Badge>
                      <span className="text-sm font-medium text-primary-text">{r.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-secondary-text">{r.detail}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand"><Activity className="size-3" /> {r.action}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary-text">No population recommendations right now.</p>
            )}
          </GovernanceCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
