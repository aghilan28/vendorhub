"use client";

// KARTEX Phase O.7 — Unified Platform Search UI
// A single search box that reaches every part of the platform model.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { searchKindLabel, searchPlatform, SEARCH_DOMAINS } from "@/lib/platform";

const SUGGESTIONS = ["supplier", "fraud", "pricing", "knowledge", "execution", "revenue"];

export function PlatformSearch() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchPlatform(query), [query]);
  const trimmed = query.trim();

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="platform-search" className="sr-only">
          Search the platform
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary-text" />
          <Input
            id="platform-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search research, knowledge, simulation, SECIS, governance, execution, scenarios, docs…"
            className="pl-9"
            autoComplete="off"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-secondary-text">Try:</span>
          {SUGGESTIONS.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => setQuery(term)}
              className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-secondary-text transition hover:bg-slate-50 focus-ring"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {!trimmed ? (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-sm font-medium text-primary-text">Unified search reaches</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SEARCH_DOMAINS.map((domain) => (
              <Badge key={domain} variant="secondary">
                {domain}
              </Badge>
            ))}
          </div>
        </div>
      ) : results.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface p-6 text-center text-sm text-secondary-text">
          No matches for “{trimmed}”. Try a broader term.
        </p>
      ) : (
        <ul className="space-y-2" aria-live="polite">
          {results.map((result) => (
            <li key={`${result.kind}-${result.id}`}>
              <Link
                href={result.href}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 shadow-sm transition hover:bg-slate-50 focus-ring"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="ai">{searchKindLabel(result.kind)}</Badge>
                    <span className="truncate text-sm font-medium text-primary-text">{result.title}</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-secondary-text">{result.subtitle}</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-secondary-text" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
