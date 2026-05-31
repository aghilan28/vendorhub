// KARTEX M8 — Execution UI helpers
// Shared lookups, formatters and tone mappers used across the workspace tabs.

import type {
  ExecutionDataset,
  Initiative,
  KPI,
  Owner,
  Priority,
  Program,
  Tone,
} from "@/lib/execution";
import { computeKpiAttainment } from "@/lib/execution";

export function ownerName(data: ExecutionDataset, ownerId: string | null): string {
  if (!ownerId) return "Unassigned";
  return data.owners.find((o) => o.id === ownerId)?.name ?? "Unassigned";
}

export function programName(data: ExecutionDataset, programId: string | null): string {
  if (!programId) return "—";
  return data.programs.find((p) => p.id === programId)?.name ?? "—";
}

export function initiativeName(data: ExecutionDataset, initiativeId: string | null): string {
  if (!initiativeId) return "—";
  return data.initiatives.find((i) => i.id === initiativeId)?.name ?? "—";
}

export function priorityTone(priority: Priority): "default" | "secondary" | "warning" | "danger" {
  switch (priority) {
    case "critical":
      return "danger";
    case "high":
      return "warning";
    case "medium":
      return "secondary";
    case "low":
    default:
      return "default";
  }
}

export function severityTone(severity: string): "default" | "secondary" | "warning" | "danger" {
  switch (severity) {
    case "critical":
      return "danger";
    case "high":
      return "warning";
    case "medium":
      return "secondary";
    default:
      return "default";
  }
}

export function kpiStatusTone(status: KPI["status"]): "default" | "warning" | "danger" {
  if (status === "on_track") return "default";
  if (status === "at_risk") return "warning";
  return "danger";
}

export function healthTone(tone: Tone): "default" | "secondary" | "warning" | "danger" {
  if (tone === "healthy") return "default";
  if (tone === "watch") return "secondary";
  if (tone === "degraded") return "warning";
  return "danger";
}

export function kpiAttainmentPct(kpi: KPI): number {
  return Math.round(computeKpiAttainment(kpi.current, kpi.target, kpi.direction) * 100);
}

export function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

export function progressTone(progress: number): string {
  if (progress >= 80) return "bg-emerald-500";
  if (progress >= 50) return "bg-blue-500";
  if (progress >= 25) return "bg-amber-500";
  return "bg-slate-400";
}

export function owners(data: ExecutionDataset): Owner[] {
  return data.owners;
}

export function initiativeProgress(initiative: Initiative): number {
  return Math.max(0, Math.min(100, Math.round(initiative.progress)));
}

export function programInitiatives(data: ExecutionDataset, program: Program): Initiative[] {
  return data.initiatives.filter((i) => program.initiativeIds.includes(i.id));
}
