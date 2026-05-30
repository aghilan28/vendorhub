import { env } from "@/lib/env";

// Runtime readiness checks. These perform ACTUAL dependency probes so the readiness
// endpoint reflects measured state rather than self-declared "validated" literals.

export type ReadinessStatus = "ok" | "unreachable" | "not_configured";

export type ReadinessCheck = {
  name: string;
  status: ReadinessStatus;
  latencyMs: number | null;
  detail: string;
};

export type OverallReadiness = {
  ready: boolean;
  status: "ready" | "degraded" | "not_ready";
};

// Probe Supabase by calling its unauthenticated auth health endpoint with the anon key.
export async function checkSupabaseConnectivity(timeoutMs = 3000): Promise<ReadinessCheck> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return {
      name: "supabase",
      status: "not_configured",
      latencyMs: null,
      detail: "NEXT_PUBLIC_SUPABASE_URL / ANON_KEY not configured",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(`${env.supabaseUrl}/auth/v1/health`, {
      headers: { apikey: env.supabaseAnonKey },
      signal: controller.signal,
      cache: "no-store",
    });
    const latencyMs = Date.now() - started;
    if (!response.ok) {
      return { name: "supabase", status: "unreachable", latencyMs, detail: `auth health returned ${response.status}` };
    }
    return { name: "supabase", status: "ok", latencyMs, detail: "auth health reachable" };
  } catch (error) {
    return {
      name: "supabase",
      status: "unreachable",
      latencyMs: Date.now() - started,
      detail: error instanceof Error ? error.message : "connectivity error",
    };
  } finally {
    clearTimeout(timer);
  }
}

export function overallReadiness(checks: ReadinessCheck[]): OverallReadiness {
  if (checks.some((check) => check.status === "unreachable")) {
    return { ready: false, status: "not_ready" };
  }
  if (checks.some((check) => check.status === "not_configured")) {
    return { ready: false, status: "degraded" };
  }
  return { ready: true, status: "ready" };
}
