"use client";

// KARTEX M8 — Execution query hook
// React Query access to the server-computed execution snapshot (the API is
// role-gated). The interactive workspace is store-driven, but this hook lets
// any surface read the authoritative server snapshot when a session exists.

import { useQuery } from "@tanstack/react-query";
import { fetchJson, type ApiEnvelope } from "@/lib/api/client";
import type { ExecutionDataset, ExecutionSnapshot } from "@/lib/execution";

export type ExecutionApiPayload = {
  snapshot: ExecutionSnapshot;
  dataset: ExecutionDataset;
};

async function fetchExecution() {
  const envelope = await fetchJson<ApiEnvelope<ExecutionApiPayload>>("/api/execution", {
    cache: "no-store",
  });
  return envelope.data;
}

export function useExecutionSnapshotQuery() {
  return useQuery({
    queryKey: ["execution", "snapshot"],
    queryFn: fetchExecution,
    refetchInterval: 60_000,
    retry: false,
  });
}
