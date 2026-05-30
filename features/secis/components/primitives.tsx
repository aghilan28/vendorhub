"use client";

import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RiskLevel, RunStatus, WorkflowState } from "@/lib/secis";
import { RUN_STATUS_META, WORKFLOW_META, riskVariant } from "../format";

export function SecisShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <section className="operational-surface rounded-lg p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-secondary-text">System Evolution &amp; Change Impact</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-primary-text">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-secondary-text">{description}</p>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </section>
      {children}
    </div>
  );
}

export function SecisCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("operational-surface rounded-lg p-4 sm:p-5", className)}>
      {title || action ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold text-primary-text">{title}</h2> : null}
            {description ? <p className="mt-1 text-xs text-secondary-text">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn(title || action ? "mt-4" : "")}>{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  helper,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const toneColor: Record<string, string> = {
    neutral: "text-secondary-text",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    info: "text-ai",
  };
  return (
    <div className="operational-surface rounded-lg p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-secondary-text">{label}</p>
        {Icon ? <Icon className={cn("size-4", toneColor[tone])} /> : null}
      </div>
      <p className="metric-value mt-3">{value}</p>
      {helper ? <p className="mt-1 text-xs text-secondary-text">{helper}</p> : null}
    </div>
  );
}

export function WorkflowBadge({ state }: { state: WorkflowState }) {
  const meta = WORKFLOW_META[state];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const meta = RUN_STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function RiskBadge({ level, score }: { level: RiskLevel; score?: number }) {
  return (
    <Badge variant={riskVariant(level)}>
      {level.toUpperCase()}
      {typeof score === "number" ? ` · ${score}` : ""}
    </Badge>
  );
}

export function NavCard({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <Link href={href as Route} className="flex items-center gap-3 rounded-md border border-border p-3 focus-ring hover:bg-slate-50">
      <span className="flex size-9 items-center justify-center rounded-md bg-emerald-50 text-brand">
        <Icon className="size-4" />
      </span>
      <span className="text-sm font-medium text-primary-text">{label}</span>
    </Link>
  );
}
