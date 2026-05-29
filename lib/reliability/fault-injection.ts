/**
 * Phase D — fault injection (application-level chaos).
 *
 * Turns chaos from a SIMULATION (scripts/stabilization-s5-chaos.mjs models
 * survivability) into a LIVE experiment: when enabled, it injects latency,
 * errors, or timeouts into real dependency calls (via instrumentDependency) so
 * we can verify the system DEGRADES rather than collapses — in staging or in a
 * controlled test. OFF unless CHAOS_ENABLED=true; never active in production
 * unless an operator explicitly opts in. Tests configure it directly.
 */
export type FaultMode = "error" | "latency" | "timeout";

export type FaultRule = {
  /** dependency target, e.g. "redis", "kafka", "razorpay", or "*" for all */
  target: string;
  /** 0..1 probability of injecting on a matching call */
  probability: number;
  mode: FaultMode;
  latencyMs?: number; // for latency/timeout modes
};

export class InjectedFaultError extends Error {
  readonly target: string;
  constructor(target: string, mode: FaultMode) {
    super(`Injected ${mode} fault for "${target}"`);
    this.name = "InjectedFaultError";
    this.target = target;
  }
}

type Config = { enabled: boolean; rules: FaultRule[] };

function fromEnv(): Config {
  const enabled = (process.env.CHAOS_ENABLED ?? "").toLowerCase() === "true";
  if (!enabled) return { enabled: false, rules: [] };
  const targets = (process.env.CHAOS_TARGETS ?? "*").split(",").map((t) => t.trim()).filter(Boolean);
  const probability = Number.parseFloat(process.env.CHAOS_PROBABILITY ?? "0.1");
  const mode = (process.env.CHAOS_MODE as FaultMode) ?? "error";
  const latencyMs = Number.parseInt(process.env.CHAOS_LATENCY_MS ?? "2000", 10);
  return {
    enabled: true,
    rules: targets.map((target) => ({ target, probability: Number.isFinite(probability) ? probability : 0.1, mode, latencyMs })),
  };
}

let config: Config = fromEnv();

export const faultInjector = {
  isEnabled() {
    return config.enabled;
  },

  /** Override config (tests / controlled experiments). */
  configure(next: Partial<Config>) {
    config = { enabled: next.enabled ?? config.enabled, rules: next.rules ?? config.rules };
  },

  reset() {
    config = fromEnv();
  },

  rulesFor(target: string): FaultRule[] {
    if (!config.enabled) return [];
    return config.rules.filter((r) => r.target === target || r.target === "*");
  },

  /**
   * Possibly inject a fault before a dependency call. Returns the matched mode
   * if a fault was applied (latency already awaited), or null. Throws
   * InjectedFaultError for "error"/"timeout" modes.
   */
  async maybeInject(target: string): Promise<FaultMode | null> {
    if (!config.enabled) return null;
    for (const rule of this.rulesFor(target)) {
      if (Math.random() >= rule.probability) continue;
      if (rule.mode === "latency") {
        await new Promise((resolve) => setTimeout(resolve, rule.latencyMs ?? 2000));
        return "latency";
      }
      if (rule.mode === "timeout") {
        // Delay long enough to trip the caller's timeout, then error.
        await new Promise((resolve) => setTimeout(resolve, rule.latencyMs ?? 2000));
        throw new InjectedFaultError(target, "timeout");
      }
      throw new InjectedFaultError(target, "error");
    }
    return null;
  },
};
