import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Shared presentational primitives for the Commerce Intelligence product surfaces (Phase K).
// Pure components — no data fetching, no side effects.

export function IntelPageHeader({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  return (
    <header className="mb-6">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wide text-secondary-text">{eyebrow}</p> : null}
      <h1 className="mt-1 text-2xl font-semibold text-primary-text">{title}</h1>
      {subtitle ? <p className="mt-2 max-w-3xl text-sm text-secondary-text">{subtitle}</p> : null}
    </header>
  );
}

export function IntelSection({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="operational-surface rounded-lg p-4" aria-label={title}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-primary-text">{title}</h2>
          {description ? <p className="mt-1 text-sm text-secondary-text">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const severityClass: Record<string, string> = {
  info: "bg-slate-100 text-slate-700",
  opportunity: "bg-emerald-100 text-emerald-700",
  watch: "bg-amber-100 text-amber-700",
  warning: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
  healthy: "bg-emerald-100 text-emerald-700",
  steady: "bg-slate-100 text-slate-700",
  fast: "bg-emerald-100 text-emerald-700",
  slow: "bg-amber-100 text-amber-700",
  restock: "bg-amber-100 text-amber-700",
  dead_stock: "bg-red-100 text-red-700",
  cold_start: "bg-slate-100 text-slate-700",
  strong: "bg-emerald-100 text-emerald-700",
  improving: "bg-amber-100 text-amber-700",
  weak: "bg-red-100 text-red-700",
  premium: "bg-violet-100 text-violet-700",
  balanced: "bg-emerald-100 text-emerald-700",
  value: "bg-sky-100 text-sky-700",
  review: "bg-amber-100 text-amber-700",
};

export function StatusPill({ value, className }: { value: string; className?: string }) {
  const key = value.toLowerCase().replace(/\s+/g, "_");
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", severityClass[key] ?? "bg-slate-100 text-slate-700", className)}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function ScoreBar({ label, score, hint }: { label: string; score: number; hint?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tone = clamped >= 75 ? "bg-emerald-500" : clamped >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="operational-surface rounded-lg p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-secondary-text">{label}</p>
        <p className="text-xl font-semibold text-primary-text">{clamped}</p>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200" role="meter" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${clamped}%` }} />
      </div>
      {hint ? <p className="mt-2 text-xs text-secondary-text">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="operational-surface rounded-lg border border-dashed p-8 text-center">
      <p className="text-sm font-medium text-primary-text">{title}</p>
      {hint ? <p className="mt-2 text-sm text-secondary-text">{hint}</p> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading intelligence…" }: { label?: string }) {
  return (
    <div className="operational-surface animate-pulse rounded-lg p-8 text-center text-sm text-secondary-text" aria-busy="true">
      {label}
    </div>
  );
}
