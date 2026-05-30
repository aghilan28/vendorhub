# KARTEX Phase C — Observability Stack

Makes KARTEX explain itself: **metrics** (Prometheus), **traces** (OTel → Jaeger),
**logs** (structured JSON, already emitted by `lib/observability/core.ts`), and
**alerts** (Prometheus rules → Alertmanager → escalation). Pairs with the Phase B
runtime stack.

## Run

```bash
docker compose -f infra/docker-compose.runtime.yml up -d            # Phase B runtimes
docker compose -f infra/observability/docker-compose.observability.yml up -d

# Point the app at the collector + protect the scrape endpoint
export RUNTIME_OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
export METRICS_AUTH_TOKEN=localdevmetrics
npm run dev
```

| Console | URL | Local credential |
|---|---|---|
| Grafana | http://localhost:3001 | admin / localdevgrafana |
| Prometheus | http://localhost:9090 | — |
| Jaeger | http://localhost:16686 | — |
| Alertmanager | http://localhost:9093 | — |
| App metrics | http://localhost:3000/api/metrics | Bearer `METRICS_AUTH_TOKEN` |
| Runtime health | http://localhost:3000/api/runtime/health | — |

Grafana auto-provisions the Prometheus + Jaeger datasources and the dashboards in
`grafana/dashboards/` (Executive Overview, Commerce Operations, Infrastructure & Runtimes).

## Signal paths (important: serverless vs persistent)
- **Traces & business events: PUSH** (OTLP → collector → Jaeger; events forwarded by
  `recordOperationalEvent`). Works on Vercel serverless.
- **Prometheus PULL of `/api/metrics`** aggregates correctly only on **persistent**
  deployments (the worker, containers, `next start`). On ephemeral serverless,
  per-invocation counters do not accumulate — rely on the push path or an OTLP/
  Pushgateway sidecar. This is called out in the Phase C report.

## Runtime exporters (sidecars)
`prometheus.yml` references exporters that are **not** in the Phase B compose yet:
add `oliver006/redis_exporter` (:9121), `danielqsj/kafka-exporter` (:9308), and enable
Neo4j's `server.metrics.prometheus` (:2004). Qdrant (`/metrics`) and Flink are scraped
directly. These are tracked as Phase C remediation **C-M2**.

## Layout
```
infra/observability/
  docker-compose.observability.yml   collector + prometheus + grafana + jaeger + alertmanager
  otel-collector.yaml                OTLP in -> Jaeger (traces) + Prometheus (metrics)
  prometheus.yml                     scrape app + collector + runtimes
  alerts.rules.yml                   alert rules mapped to the metrics catalog (P1-P4)
  alertmanager.yml                   severity routing + escalation + inhibition
  grafana/provisioning/*             datasources + dashboard provider
  grafana/dashboards/*.json          dashboards
```
