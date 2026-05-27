"use client";

import { Activity, BarChart3, Brain, SearchCheck, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { marketplaceProducts } from "@/features/marketplace/lib/data";
import { useMarketplaceIntelligence } from "../queries";

export function AdminIntelligencePanel() {
  const { data: insights } = useMarketplaceIntelligence(marketplaceProducts);
  if (!insights) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="rounded-md border border-border bg-slate-50 p-3">
        <p className="flex items-center gap-2 text-sm font-medium text-primary-text"><SearchCheck className="size-4" /> Search performance</p>
        <p className="mt-2 text-2xl font-semibold text-primary-text">{insights.searchQuality}</p>
        <p className="mt-1 text-xs text-secondary-text">{insights.fallbackHealth}</p>
      </div>
      <div className="rounded-md border border-border bg-slate-50 p-3">
        <p className="flex items-center gap-2 text-sm font-medium text-primary-text"><BarChart3 className="size-4" /> Query trends</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {insights.queryTrends.slice(0, 5).map((query) => <Badge key={query} variant="secondary">{query}</Badge>)}
        </div>
      </div>
      <div className="rounded-md border border-border bg-slate-50 p-3">
        <p className="text-sm font-medium text-primary-text">Recommendation readiness</p>
        <p className="mt-2 text-sm text-secondary-text">{insights.semanticCoverage}</p>
        <p className="mt-1 text-xs text-secondary-text">{insights.lowStockOpportunity}</p>
      </div>
      <div className="rounded-md border border-border bg-slate-50 p-3">
        <p className="flex items-center gap-2 text-sm font-medium text-primary-text"><Brain className="size-4" /> Ranking diagnostics</p>
        <p className="mt-2 text-xs text-secondary-text">{insights.rankingDiagnostics.scoringLayer}</p>
        <p className="mt-1 text-xs text-secondary-text">{insights.rankingDiagnostics.diversityLayer}</p>
      </div>
      <div className="rounded-md border border-border bg-slate-50 p-3">
        <p className="flex items-center gap-2 text-sm font-medium text-primary-text"><Activity className="size-4" /> Local intelligence</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {insights.localTrends.map((trend) => <Badge key={trend.slug} variant="secondary">{trend.label} {trend.score}</Badge>)}
        </div>
      </div>
      <div className="rounded-md border border-border bg-slate-50 p-3">
        <p className="flex items-center gap-2 text-sm font-medium text-primary-text"><ShieldCheck className="size-4" /> AI oversight</p>
        <p className="mt-2 text-sm text-secondary-text">{insights.searchAnalytics.privacyPosture}</p>
        <p className="mt-1 text-xs text-secondary-text">{insights.newSellerSlots} exploration-ready products keep discovery fair.</p>
      </div>
    </div>
  );
}
