// KARTEX M7 — Workspace helpers: system metadata, formatters, ids.

import type { RefSystem } from "./types";

export interface SystemMeta {
  system: RefSystem;
  label: string;
  color: string;
  route: string;
}

export const SYSTEM_META: Record<RefSystem, SystemMeta> = {
  research: { system: "research", label: "Research", color: "#7c3aed", route: "/intelligence/workflows" },
  knowledge: { system: "knowledge", label: "Knowledge", color: "#2563eb", route: "/intelligence/workflows" },
  simulation: { system: "simulation", label: "Simulation", color: "#059669", route: "/simulations" },
  secis: { system: "secis", label: "SECIS", color: "#f59e0b", route: "/secis" },
  governance: { system: "governance", label: "Governance", color: "#e11d48", route: "/governance" },
  intelligence: { system: "intelligence", label: "Intelligence", color: "#0ea5e9", route: "/intelligence" },
};

export const REF_SYSTEMS: RefSystem[] = ["research", "knowledge", "simulation", "secis", "governance", "intelligence"];

export function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(then).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "—" : new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

let seq = 0;
export function uid(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}
