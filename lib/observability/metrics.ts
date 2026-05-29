/**
 * Phase C — dependency-free metrics registry with Prometheus text exposition.
 *
 * Why no library: the app must build/run on Vercel with zero new deps. This
 * registry powers `GET /api/metrics` (pull) for persistent deployments (the
 * worker, containers, `next start`) and the self-hosted Phase B runtimes. On
 * ephemeral serverless invocations, prefer the push path (OTLP / business events
 * forwarded via recordOperationalEvent) — see PHASE_C report "Operational Truth".
 *
 * All recording functions are total (never throw): telemetry must never break
 * commerce execution.
 */

type Labels = Record<string, string>;

function labelKey(labels?: Labels): string {
  if (!labels) return "";
  return Object.keys(labels)
    .sort()
    .map((k) => `${k}=${labels[k]}`)
    .join(",");
}

function renderLabels(name: string, labels: Labels | undefined, extra?: Labels): string {
  const merged = { ...(labels ?? {}), ...(extra ?? {}) };
  const keys = Object.keys(merged);
  if (keys.length === 0) return name;
  const body = keys
    .map((k) => `${k}="${String(merged[k]).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`)
    .join(",");
  return `${name}{${body}}`;
}

type MetricKind = "counter" | "gauge" | "histogram";

type MetricDef = {
  name: string;
  help: string;
  kind: MetricKind;
  owner: string;
  buckets?: number[]; // histogram only (seconds)
};

type Series = {
  labels: Labels;
  value: number; // counter/gauge value, or histogram count
  sum?: number; // histogram
  bucketCounts?: number[]; // histogram cumulative-eligible (stored raw, rendered cumulative)
};

const DEFAULT_LATENCY_BUCKETS = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

class Metric {
  readonly def: MetricDef;
  private series = new Map<string, Series>();

  constructor(def: MetricDef) {
    this.def = def;
  }

  private get(labels?: Labels): Series {
    const key = labelKey(labels);
    let s = this.series.get(key);
    if (!s) {
      s = { labels: labels ?? {}, value: 0 };
      if (this.def.kind === "histogram") {
        s.sum = 0;
        s.bucketCounts = new Array((this.def.buckets ?? DEFAULT_LATENCY_BUCKETS).length).fill(0);
      }
      this.series.set(key, s);
    }
    return s;
  }

  inc(labels?: Labels, by = 1) {
    this.get(labels).value += by;
  }

  set(value: number, labels?: Labels) {
    this.get(labels).value = value;
  }

  observe(value: number, labels?: Labels) {
    const s = this.get(labels);
    const buckets = this.def.buckets ?? DEFAULT_LATENCY_BUCKETS;
    s.value += 1; // count
    s.sum = (s.sum ?? 0) + value;
    for (let i = 0; i < buckets.length; i += 1) {
      if (value <= buckets[i]) s.bucketCounts![i] += 1;
    }
  }

  render(): string {
    const lines: string[] = [];
    lines.push(`# HELP ${this.def.name} ${this.def.help}`);
    lines.push(`# TYPE ${this.def.name} ${this.def.kind}`);
    if (this.def.kind === "histogram") {
      const buckets = this.def.buckets ?? DEFAULT_LATENCY_BUCKETS;
      for (const s of this.series.values()) {
        let cumulative = 0;
        for (let i = 0; i < buckets.length; i += 1) {
          cumulative += s.bucketCounts![i];
          lines.push(`${renderLabels(`${this.def.name}_bucket`, s.labels, { le: String(buckets[i]) })} ${cumulative}`);
        }
        lines.push(`${renderLabels(`${this.def.name}_bucket`, s.labels, { le: "+Inf" })} ${s.value}`);
        lines.push(`${renderLabels(`${this.def.name}_sum`, s.labels)} ${s.sum ?? 0}`);
        lines.push(`${renderLabels(`${this.def.name}_count`, s.labels)} ${s.value}`);
      }
    } else {
      for (const s of this.series.values()) {
        lines.push(`${renderLabels(this.def.name, s.labels)} ${s.value}`);
      }
    }
    return lines.join("\n");
  }
}

// Registry persists on the module (per Node process / per warm serverless instance).
const globalKey = "__kartex_metrics_registry__";
const registry: Map<string, Metric> =
  (globalThis as any)[globalKey] ?? ((globalThis as any)[globalKey] = new Map<string, Metric>());

function define(def: MetricDef): Metric {
  let m = registry.get(def.name);
  if (!m) {
    m = new Metric(def);
    registry.set(def.name, m);
  }
  return m;
}

// --------------------------------------------------------------------------
// METRICS CATALOG (Phase C.4 + C.9). Owner + help encoded here; thresholds and
// alert rules live in infra/observability/alerts.rules.yml.
// --------------------------------------------------------------------------
export const M = {
  // ---- Technical (RED + runtime) ----
  apiRequests: define({ name: "kartex_api_requests_total", help: "API requests by route/method/status", kind: "counter", owner: "platform" }),
  apiErrors: define({ name: "kartex_api_errors_total", help: "API errors by route/code/status", kind: "counter", owner: "platform" }),
  apiLatency: define({ name: "kartex_api_request_duration_seconds", help: "API handler latency", kind: "histogram", owner: "platform" }),
  queueDepth: define({ name: "kartex_queue_depth", help: "Pending jobs per queue (gauge)", kind: "gauge", owner: "platform" }),
  kafkaLag: define({ name: "kartex_kafka_consumer_lag", help: "Kafka consumer lag per group/topic", kind: "gauge", owner: "platform" }),
  redisHits: define({ name: "kartex_redis_cache_hits_total", help: "Redis cache hits", kind: "counter", owner: "platform" }),
  redisMisses: define({ name: "kartex_redis_cache_misses_total", help: "Redis cache misses", kind: "counter", owner: "platform" }),
  depLatency: define({ name: "kartex_dependency_duration_seconds", help: "Downstream dependency latency (redis/kafka/neo4j/qdrant/flink/supabase/provider)", kind: "histogram", owner: "platform" }),
  depErrors: define({ name: "kartex_dependency_errors_total", help: "Downstream dependency errors", kind: "counter", owner: "platform" }),
  runtimeUp: define({ name: "kartex_runtime_up", help: "Runtime reachability 1=reachable 0=degraded (per runtime)", kind: "gauge", owner: "platform" }),

  // ---- Business (Phase C.9) ----
  ordersCreated: define({ name: "kartex_orders_created_total", help: "Orders created", kind: "counter", owner: "commerce" }),
  ordersCompleted: define({ name: "kartex_orders_completed_total", help: "Orders completed/delivered", kind: "counter", owner: "commerce" }),
  ordersFailed: define({ name: "kartex_orders_failed_total", help: "Orders failed/cancelled", kind: "counter", owner: "commerce" }),
  checkoutAttempts: define({ name: "kartex_checkout_attempts_total", help: "Checkout attempts", kind: "counter", owner: "commerce" }),
  checkoutSuccess: define({ name: "kartex_checkout_success_total", help: "Checkout successes", kind: "counter", owner: "commerce" }),
  paymentsAuthorized: define({ name: "kartex_payments_authorized_total", help: "Payments authorized/captured", kind: "counter", owner: "payments" }),
  paymentsFailed: define({ name: "kartex_payments_failed_total", help: "Payments failed", kind: "counter", owner: "payments" }),
  refundsRequested: define({ name: "kartex_refunds_requested_total", help: "Refunds requested", kind: "counter", owner: "payments" }),
  refundsCompleted: define({ name: "kartex_refunds_completed_total", help: "Refunds completed", kind: "counter", owner: "payments" }),
  searchQueries: define({ name: "kartex_search_queries_total", help: "Search queries", kind: "counter", owner: "discovery" }),
  searchZeroResults: define({ name: "kartex_search_zero_results_total", help: "Search queries returning zero results", kind: "counter", owner: "discovery" }),
  notificationsSent: define({ name: "kartex_notifications_sent_total", help: "Notifications dispatched by channel", kind: "counter", owner: "engagement" }),
  notificationsFailed: define({ name: "kartex_notifications_failed_total", help: "Notification dispatch failures by channel", kind: "counter", owner: "engagement" }),
  inventoryDrift: define({ name: "kartex_inventory_drift", help: "Observed inventory drift (gauge)", kind: "gauge", owner: "commerce" }),
} as const;

export function recordApiRequest(route: string, method: string, status: number, durationMs: number) {
  try {
    const statusClass = `${Math.floor(status / 100)}xx`;
    M.apiRequests.inc({ route, method, status: statusClass });
    M.apiLatency.observe(durationMs / 1000, { route, method });
    if (status >= 500) M.apiErrors.inc({ route, status: statusClass, code: "server_error" });
  } catch {
    /* never throw */
  }
}

export function recordDependency(dependency: string, operation: string, durationMs: number, ok: boolean) {
  try {
    M.depLatency.observe(durationMs / 1000, { dependency, operation });
    if (!ok) M.depErrors.inc({ dependency, operation });
  } catch {
    /* never throw */
  }
}

export function setRuntimeUp(runtime: string, reachable: boolean) {
  try {
    M.runtimeUp.set(reachable ? 1 : 0, { runtime });
  } catch {
    /* never throw */
  }
}

/** Render the full registry in Prometheus text exposition format. */
export function renderPrometheus(): string {
  const blocks: string[] = [];
  for (const metric of registry.values()) {
    blocks.push(metric.render());
  }
  return `${blocks.join("\n\n")}\n`;
}

export function resetMetricsForTests() {
  registry.clear();
}
