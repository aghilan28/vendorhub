"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson, type ApiEnvelope } from "@/lib/api/client";

export type OperationalHealthSnapshot = {
  service: string;
  generatedAt: string;
  latencyMs: number;
  overall: {
    tone: "healthy" | "watch" | "degraded" | "critical";
    label: string;
    detail: string;
  };
  signals: Record<string, number>;
  alerts: Array<{
    id: string;
    title: string;
    domain: string;
    severity: "info" | "warning" | "critical";
    signal: string;
    action: string;
  }>;
  systems: Array<{
    domain: string;
    value: string;
    detail: string;
    tone: "healthy" | "watch" | "degraded" | "critical";
  }>;
  audit: {
    last7d: number;
    immutableAware: boolean;
    actorLinked: boolean;
    traceable: boolean;
  };
};

async function fetchOperationalHealth() {
  const envelope = await fetchJson<ApiEnvelope<OperationalHealthSnapshot>>("/api/operations/health", { cache: "no-store" });
  return envelope.data;
}

export function useOperationalHealth() {
  return useQuery({
    queryKey: ["operations", "health"],
    queryFn: fetchOperationalHealth,
    refetchInterval: 30_000,
  });
}
