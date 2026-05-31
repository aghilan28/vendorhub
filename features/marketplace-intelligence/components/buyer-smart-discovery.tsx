"use client";

// MCP-0E.7 — Buyer Smart Discovery.
// Personalized discovery, recommendations, availability and delivery
// predictions from real marketplace behaviour. Labelled sample before data.

import { Clock, Compass, Sparkles, Truck, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import type { BuyerIntelligence } from "@/lib/marketplace-intelligence";

export function BuyerSmartDiscovery({ intelligence, sampled }: { intelligence: BuyerIntelligence; sampled: boolean }) {
  const { trending, recommended, availabilityPredictions, deliveryPredictions, smartDiscovery } = intelligence;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary-text">Smart Discovery</h1>
          <p className="text-sm text-secondary-text">Trending products, personalized picks, and availability &amp; delivery predictions from live marketplace activity.</p>
        </div>
        <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview (sample data)" : "Live data"}</Badge>
      </div>

      {smartDiscovery.length ? (
        <div className="flex flex-wrap gap-1.5">
          {smartDiscovery.map((s) => (
            <Badge key={s} variant="ai"><Compass className="size-3" /> {s}</Badge>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <GovernanceCard title="Trending now" description="What buyers are choosing right now." action={<TrendingUp className="size-4 text-secondary-text" />}>
          <ul className="space-y-2">
            {trending.map((p) => (
              <li key={p.productId} className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                <span className="truncate text-primary-text">{p.name}</span>
                <span className="text-xs text-secondary-text">{p.reason}</span>
              </li>
            ))}
            {trending.length === 0 ? <p className="text-xs text-secondary-text">No trending products yet.</p> : null}
          </ul>
        </GovernanceCard>

        <GovernanceCard title="Recommended for you" description="Personalized from ratings, conversion and demand." action={<Sparkles className="size-4 text-secondary-text" />}>
          <ul className="space-y-2">
            {recommended.map((p) => (
              <li key={p.productId} className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                <span className="truncate text-primary-text">{p.name}</span>
                <span className="text-xs text-secondary-text">{p.reason}</span>
              </li>
            ))}
            {recommended.length === 0 ? <p className="text-xs text-secondary-text">No recommendations yet.</p> : null}
          </ul>
        </GovernanceCard>

        <GovernanceCard title="Availability predictions" action={<Clock className="size-4 text-secondary-text" />}>
          <ul className="space-y-2">
            {availabilityPredictions.slice(0, 8).map((a) => (
              <li key={a.productId} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-primary-text">{a.name}</span>
                <span className="text-secondary-text">{a.prediction}</span>
              </li>
            ))}
          </ul>
        </GovernanceCard>

        <GovernanceCard title="Delivery predictions" action={<Truck className="size-4 text-secondary-text" />}>
          <ul className="space-y-2">
            {deliveryPredictions.slice(0, 8).map((d) => (
              <li key={d.sellerId} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-primary-text">{d.name}</span>
                <span className="text-secondary-text">~{d.etaMinutes} min · {d.confidence}% conf</span>
              </li>
            ))}
          </ul>
        </GovernanceCard>
      </div>
    </div>
  );
}
