"use client";

// KARTEX M8 — Shared execution UI primitives.

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  nextStates,
  STATUS_LABEL,
  statusTone,
  type ExecutionEntityType,
  type ExecutionStatus,
} from "@/lib/execution";
import { progressTone } from "../helpers";

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "warning" | "danger" | "ai";
}) {
  const valueColor =
    tone === "danger"
      ? "text-red-600"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "ai"
          ? "text-blue-600"
          : "text-primary-text";
  return (
    <div className="operational-surface rounded-lg p-4">
      <p className="text-xs font-medium text-secondary-text">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums", valueColor)}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-secondary-text">{hint}</p> : null}
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all", progressTone(clamped))}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function StatusBadge({ status }: { status: ExecutionStatus }) {
  return <Badge variant={statusTone(status)}>{STATUS_LABEL[status]}</Badge>;
}

/**
 * Renders the legal next-state transition buttons for any executable entity,
 * enforcing the mandatory workflow (Section M8.7).
 */
export function WorkflowControls({
  entityType,
  entityId,
  status,
  onTransition,
}: {
  entityType: ExecutionEntityType;
  entityId: string;
  status: ExecutionStatus;
  onTransition: (entityType: ExecutionEntityType, entityId: string, to: ExecutionStatus) => void;
}) {
  const targets = nextStates(status);
  if (targets.length === 0) {
    return <span className="text-xs text-secondary-text">No further transitions</span>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {targets.map((target) => (
        <Button
          key={target}
          size="sm"
          variant={target === "archived" ? "ghost" : "secondary"}
          onClick={() => onTransition(entityType, entityId, target)}
          aria-label={`Move ${entityId} to ${STATUS_LABEL[target]}`}
        >
          → {STATUS_LABEL[target]}
        </Button>
      ))}
    </div>
  );
}

export function SectionGrid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const colClass =
    cols === 2
      ? "sm:grid-cols-2"
      : cols === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";
  return <div className={cn("grid grid-cols-1 gap-3", colClass)}>{children}</div>;
}

export function Sparkline({ values, tone = "stroke-blue-500" }: { values: number[]; tone?: string }) {
  if (values.length < 2) return <span className="text-xs text-secondary-text">—</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 96;
  const height = 28;
  const step = width / (values.length - 1);
  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
      <polyline points={points} fill="none" strokeWidth={2} className={tone} />
    </svg>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
      {message}
    </p>
  );
}
