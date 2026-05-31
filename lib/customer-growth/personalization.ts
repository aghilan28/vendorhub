// MCP-1D Phase 7 — Personalization Engine (deterministic, pure).
//
// Behaviour tracking → store / category / brand / location affinities → a
// personalization profile that drives personalized home / search /
// recommendations / offers. Affinities are normalized 0..100 and reproducible.

import type { AffinityScore, PersonalizationProfile } from "./types";

export interface BehaviorSignal {
  kind: "category" | "brand" | "store" | "location";
  key: string;
  label?: string;
  views?: number;
  purchases?: number;
  wishlists?: number;
}

const WEIGHTS = { views: 1, wishlists: 3, purchases: 6 };

function aggregate(signals: BehaviorSignal[], kind: BehaviorSignal["kind"]): AffinityScore[] {
  const map = new Map<string, { label: string; raw: number }>();
  for (const s of signals.filter((x) => x.kind === kind)) {
    const raw = (s.views ?? 0) * WEIGHTS.views + (s.wishlists ?? 0) * WEIGHTS.wishlists + (s.purchases ?? 0) * WEIGHTS.purchases;
    const entry = map.get(s.key) ?? { label: s.label ?? s.key, raw: 0 };
    entry.raw += raw;
    map.set(s.key, entry);
  }
  const max = Math.max(1, ...[...map.values()].map((v) => v.raw));
  return [...map.entries()]
    .map(([key, v]) => ({ key, label: v.label, score: Math.round((v.raw / max) * 100) }))
    .sort((a, b) => b.score - a.score);
}

export function buildPersonalizationProfile(customerId: string, signals: BehaviorSignal[], declaredInterests: string[] = []): PersonalizationProfile {
  const categoryAffinity = aggregate(signals, "category");
  const brandAffinity = aggregate(signals, "brand");
  const storeAffinity = aggregate(signals, "store");
  const locationAffinity = aggregate(signals, "location");

  const topInterests = Array.from(
    new Set([...declaredInterests, ...categoryAffinity.slice(0, 3).map((a) => a.label), ...brandAffinity.slice(0, 2).map((a) => a.label)]),
  ).slice(0, 6);

  // data richness: how many affinity dimensions are populated + signal volume
  const dimensions = [categoryAffinity, brandAffinity, storeAffinity, locationAffinity].filter((d) => d.length > 0).length;
  const signalVolume = Math.min(100, signals.reduce((s, x) => s + (x.views ?? 0) + (x.purchases ?? 0) + (x.wishlists ?? 0), 0));
  const personalizationScore = Math.round((dimensions / 4) * 60 + (signalVolume / 100) * 40);

  return {
    customerId,
    categoryAffinity,
    brandAffinity,
    storeAffinity,
    locationAffinity,
    topInterests,
    personalizationScore: Math.max(0, Math.min(100, personalizationScore)),
  };
}

/** Rank arbitrary candidate keys by a customer's affinity for personalized surfaces. */
export function personalizeRanking<T extends { key: string; baseScore?: number }>(
  candidates: T[],
  affinities: AffinityScore[],
): Array<T & { personalizedScore: number }> {
  const lookup = new Map(affinities.map((a) => [a.key, a.score]));
  return candidates
    .map((c) => {
      const affinity = lookup.get(c.key) ?? 0;
      const personalizedScore = Math.round((c.baseScore ?? 50) * 0.4 + affinity * 0.6);
      return { ...c, personalizedScore };
    })
    .sort((a, b) => b.personalizedScore - a.personalizedScore);
}
