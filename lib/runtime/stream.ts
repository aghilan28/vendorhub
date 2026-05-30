import "server-only";
import { runtimeConfig } from "./config";

/**
 * Flink stream runtime adapter. The app does not run Flink jobs inline; jobs are
 * deployed from infra/flink/jobs and managed by the Flink cluster. This adapter
 * exposes cluster/job health via the Flink REST API for the runtime health
 * endpoint and the registry of jobs the platform expects to be RUNNING.
 */
export const EXPECTED_FLINK_JOBS = [
  { name: "kartex-inventory-availability", source: "infra/flink/jobs/inventory-availability.sql" },
] as const;

async function call(path: string): Promise<any | null> {
  const url = runtimeConfig.stream.restUrl;
  if (!url) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}${path}`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const streamRuntime = {
  isEnabled() {
    return runtimeConfig.stream.enabled && Boolean(runtimeConfig.stream.restUrl);
  },

  async health(): Promise<{
    enabled: boolean;
    reachable: boolean;
    runningJobs?: number;
    expectedJobs: number;
    error?: string;
  }> {
    const expectedJobs = EXPECTED_FLINK_JOBS.length;
    if (!this.isEnabled()) return { enabled: false, reachable: false, expectedJobs };
    const overview = await call(`/overview`);
    if (!overview) return { enabled: true, reachable: false, expectedJobs, error: "unreachable" };
    return {
      enabled: true,
      reachable: true,
      runningJobs: typeof overview["jobs-running"] === "number" ? overview["jobs-running"] : undefined,
      expectedJobs,
    };
  },
};
