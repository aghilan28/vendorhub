// KARTEX Phase O.7 — Unified Platform Search
// A deterministic search index over the whole platform model so a single query
// can reach Research, Knowledge, Simulation, SECIS, Governance, Execution,
// Workspace, projects/use-cases, actions/scenarios, documents and reports.

import { docSections } from "./docs";
import { platformGuides } from "./guides";
import { scenarios } from "./scenarios";
import { subsystems } from "./subsystems";
import { tours } from "./tours";
import { useCases } from "./usecases";
import { valueMetrics } from "./value";

export type SearchKind =
  | "subsystem"
  | "scenario"
  | "use-case"
  | "metric"
  | "tour"
  | "document"
  | "guide";

export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  keywords: string;
}

const KIND_LABEL: Record<SearchKind, string> = {
  subsystem: "Subsystem",
  scenario: "Demo scenario",
  "use-case": "Use case",
  metric: "Business value",
  tour: "Guided tour",
  document: "Document",
  guide: "Guide",
};

export function searchKindLabel(kind: SearchKind): string {
  return KIND_LABEL[kind];
}

/** Builds the flat, deterministic search index across every platform entity. */
export function buildSearchIndex(): SearchResult[] {
  const index: SearchResult[] = [];

  for (const subsystem of subsystems) {
    index.push({
      kind: "subsystem",
      id: subsystem.id,
      title: subsystem.name,
      subtitle: subsystem.tagline,
      href: "/platform?focus=" + subsystem.id,
      keywords: [
        subsystem.name,
        subsystem.phase,
        subsystem.tagline,
        subsystem.what,
        subsystem.problem,
        subsystem.value,
        subsystem.capabilities.join(" "),
        subsystem.beneficiaries.join(" "),
      ]
        .join(" ")
        .toLowerCase(),
    });
  }

  for (const scenario of scenarios) {
    index.push({
      kind: "scenario",
      id: scenario.id,
      title: scenario.title,
      subtitle: scenario.summary,
      href: `/showcase?scenario=${scenario.id}`,
      keywords: [
        scenario.title,
        scenario.trigger,
        scenario.summary,
        scenario.outcome,
        scenario.stages.map((s) => `${s.action} ${s.output}`).join(" "),
      ]
        .join(" ")
        .toLowerCase(),
    });
  }

  for (const useCase of useCases) {
    index.push({
      kind: "use-case",
      id: useCase.id,
      title: useCase.name,
      subtitle: useCase.headline,
      href: "/platform",
      keywords: [useCase.name, useCase.headline, useCase.description].join(" ").toLowerCase(),
    });
  }

  for (const metric of valueMetrics) {
    index.push({
      kind: "metric",
      id: metric.id,
      title: `${metric.label} · ${metric.value}`,
      subtitle: metric.caption,
      href: "/platform",
      keywords: [metric.label, metric.value, metric.caption].join(" ").toLowerCase(),
    });
  }

  for (const tour of tours) {
    index.push({
      kind: "tour",
      id: tour.id,
      title: tour.title,
      subtitle: tour.audience,
      href: "/platform",
      keywords: [tour.title, tour.audience, tour.steps.map((s) => `${s.title} ${s.body}`).join(" ")]
        .join(" ")
        .toLowerCase(),
    });
  }

  for (const section of docSections) {
    index.push({
      kind: "document",
      id: section.id,
      title: section.title,
      subtitle: section.summary,
      href: "/platform/docs",
      keywords: [section.title, section.summary, section.items.map((i) => `${i.heading} ${i.body}`).join(" ")]
        .join(" ")
        .toLowerCase(),
    });
  }

  for (const guide of platformGuides) {
    index.push({
      kind: "guide",
      id: guide.id,
      title: guide.title,
      subtitle: guide.audience,
      href: `/platform/docs#${guide.id}`,
      keywords: [guide.title, guide.audience, guide.summary, guide.sections.map((s) => `${s.heading} ${s.body}`).join(" ")]
        .join(" ")
        .toLowerCase(),
    });
  }

  return index;
}

/**
 * Runs a unified search across the platform. Empty query returns an empty list.
 * Results are scored (title matches rank above keyword/body matches) and stable.
 */
export function searchPlatform(query: string, limit = 24): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const index = buildSearchIndex();

  const scored = index
    .map((entry) => {
      const title = entry.title.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (title.includes(term)) score += 5;
        if (entry.subtitle.toLowerCase().includes(term)) score += 2;
        if (entry.keywords.includes(term)) score += 1;
      }
      return { entry, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));

  return scored.slice(0, limit).map((row) => row.entry);
}

/** The domains unified search is certified to reach (Section O.7). */
export const SEARCH_DOMAINS = [
  "Research",
  "Knowledge",
  "Simulation",
  "SECIS",
  "Governance",
  "Execution",
  "Workspace",
  "Use cases / projects",
  "Scenarios / actions",
  "Documents",
  "Reports / guides",
] as const;
