"use client";

// KARTEX Phase N — Shared platform-UI primitives: icon resolution, accent
// theming, sparkline and small presentational helpers.

import {
  Activity,
  ArrowRight,
  BookOpen,
  Boxes,
  BrainCircuit,
  Briefcase,
  Building2,
  CheckCircle2,
  Compass,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Map as MapIcon,
  Microscope,
  Network,
  Rocket,
  Scale,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Tags,
  Truck,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Accent } from "@/lib/platform";

const ICONS: Record<string, LucideIcon> = {
  Microscope,
  BrainCircuit,
  Workflow,
  ShieldCheck,
  Scale,
  Rocket,
  Network,
  LayoutDashboard,
  Store,
  ShoppingCart,
  Boxes,
  Truck,
  Tags,
  Map: MapIcon,
  Activity,
  ShieldAlert,
  Layers,
  Sparkles,
  BookOpen,
  Compass,
  Building2,
  GraduationCap,
  Briefcase,
  Users,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const Resolved = ICONS[name] ?? Sparkles;
  return <Resolved className={className} aria-hidden="true" />;
}

export interface AccentTheme {
  chip: string;
  text: string;
  ring: string;
  dot: string;
  soft: string;
}

const ACCENTS: Record<Accent, AccentTheme> = {
  research: { chip: "bg-indigo-50 text-indigo-700", text: "text-indigo-600", ring: "ring-indigo-200", dot: "bg-indigo-500", soft: "bg-indigo-500/10" },
  knowledge: { chip: "bg-violet-50 text-violet-700", text: "text-violet-600", ring: "ring-violet-200", dot: "bg-violet-500", soft: "bg-violet-500/10" },
  simulation: { chip: "bg-sky-50 text-sky-700", text: "text-sky-600", ring: "ring-sky-200", dot: "bg-sky-500", soft: "bg-sky-500/10" },
  secis: { chip: "bg-amber-50 text-amber-700", text: "text-amber-600", ring: "ring-amber-200", dot: "bg-amber-500", soft: "bg-amber-500/10" },
  governance: { chip: "bg-emerald-50 text-emerald-700", text: "text-emerald-600", ring: "ring-emerald-200", dot: "bg-emerald-500", soft: "bg-emerald-500/10" },
  integration: { chip: "bg-slate-100 text-slate-700", text: "text-slate-600", ring: "ring-slate-200", dot: "bg-slate-500", soft: "bg-slate-500/10" },
  workspace: { chip: "bg-teal-50 text-teal-700", text: "text-teal-600", ring: "ring-teal-200", dot: "bg-teal-500", soft: "bg-teal-500/10" },
  execution: { chip: "bg-blue-50 text-blue-700", text: "text-blue-600", ring: "ring-blue-200", dot: "bg-blue-500", soft: "bg-blue-500/10" },
};

export function accent(theme: Accent): AccentTheme {
  return ACCENTS[theme] ?? ACCENTS.integration;
}

export function AccentIcon({ name, theme, className }: { name: string; theme: Accent; className?: string }) {
  const a = accent(theme);
  return (
    <span className={cn("flex size-10 items-center justify-center rounded-lg ring-1", a.chip, a.ring, className)}>
      <Icon name={name} className="size-5" />
    </span>
  );
}

export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 120;
  const height = 36;
  const step = width / (values.length - 1);
  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} className={cn("overflow-visible", className)} aria-hidden="true">
      <polyline points={points} fill="none" strokeWidth={2} className="stroke-brand" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export { ArrowRight, CheckCircle2 };
