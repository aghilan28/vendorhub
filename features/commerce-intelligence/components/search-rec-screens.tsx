"use client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { useSellerIntelligence } from "@/features/seller/queries";
import { EmptyState, IntelPageHeader, IntelSection, LoadingState, StatusPill } from "./primitives";

export function SearchIntelligenceScreen() {
  const { data: intel, isLoading } = useSellerIntelligence();
  if (isLoading) return <LoadingState />;
  if (!intel || intel.discoverability.length === 0) {
    return <EmptyState title="No discoverability analytics yet" hint="Search/discoverability scores are generated from catalog quality and ranking signals." />;
  }

  const items = intel.discoverability;
  const strong = items.filter((d) => d.visibility === "strong").length;
  const weak = items.filter((d) => d.visibility === "weak");
  const avgScore = Math.round(items.reduce((s, d) => s + d.score, 0) / items.length);

  return (
    <div className="space-y-6">
      <IntelPageHeader eyebrow="Search Intelligence" title="Discoverability analytics" subtitle="How findable your products are in search and discovery, with ranking-improvement recommendations." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard label="Avg discoverability" value={`${avgScore}/100`} />
        <MetricCard label="Strong visibility" value={String(strong)} />
        <MetricCard label="Weak visibility" value={String(weak.length)} />
      </div>
      {weak.length > 0 ? (
        <IntelSection title="Low-visibility products" description="Prioritize these for ranking improvements.">
          <ul className="space-y-2">
            {weak.map((d) => (
              <li key={d.productId} className="rounded-md border border-border/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-primary-text">{d.productName}</p>
                  <StatusPill value={d.visibility} />
                </div>
                <p className="mt-1 text-xs text-secondary-text">{d.recommendation}</p>
              </li>
            ))}
          </ul>
        </IntelSection>
      ) : null}
      <IntelSection title="Discoverability detail" description={`${items.length} products scored.`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-secondary-text">
                <th className="py-2 pr-3 font-medium">Product</th>
                <th className="py-2 pr-3 font-medium">Score</th>
                <th className="py-2 pr-3 font-medium">Visibility</th>
                <th className="py-2 pr-3 font-medium">Top reason</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.productId} className="border-b border-border/40">
                  <td className="py-2 pr-3 font-medium text-primary-text">{d.productName}</td>
                  <td className="py-2 pr-3">{d.score}</td>
                  <td className="py-2 pr-3"><StatusPill value={d.visibility} /></td>
                  <td className="py-2 pr-3 text-secondary-text">{d.reasons[0] ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </IntelSection>
    </div>
  );
}

export function RecommendationsScreen() {
  const { data: intel, isLoading } = useSellerIntelligence();
  if (isLoading) return <LoadingState />;
  if (!intel) {
    return <EmptyState title="No recommendation insights yet" hint="Recommendation analytics surface once discovery and ranking signals are available." />;
  }

  const recInsights = intel.insights.filter((i) => i.domain === "discoverability" || i.domain === "demand");
  const improving = intel.discoverability.filter((d) => d.visibility === "improving" || d.visibility === "strong");

  return (
    <div className="space-y-6">
      <IntelPageHeader eyebrow="Recommendations" title="Recommendation insights" subtitle="Signals driving on-site recommendations and the products best positioned to be surfaced to buyers." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MetricCard label="Recommendation-ready products" value={String(improving.length)} />
        <MetricCard label="Recommendation signals" value={String(recInsights.length)} />
      </div>
      <IntelSection title="Signals" description="Insights influencing recommendation surfaces.">
        {recInsights.length === 0 ? (
          <p className="text-sm text-secondary-text">No recommendation signals right now.</p>
        ) : (
          <ul className="space-y-2">
            {recInsights.map((i) => (
              <li key={i.id} className="rounded-md border border-border/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-primary-text">{i.title}</p>
                  <StatusPill value={i.severity} />
                </div>
                <p className="mt-1 text-xs text-secondary-text">{i.explanation}</p>
              </li>
            ))}
          </ul>
        )}
      </IntelSection>
      <IntelSection title="Best-positioned products" description="Products most ready to feature in recommendations.">
        <div className="flex flex-wrap gap-2">
          {improving.slice(0, 24).map((d) => (
            <span key={d.productId} className="rounded-full border border-border/60 px-3 py-1 text-xs text-primary-text">{d.productName}</span>
          ))}
        </div>
      </IntelSection>
    </div>
  );
}
