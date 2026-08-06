# KARTEX Phase B — Distributed Runtime

Deployable runtime foundation for Tiers 4–15: **Redis** (cache/locks/rate-limit/idempotency),
**Kafka + Schema Registry** (event fabric), **Neo4j** (relationship runtime), **Qdrant** (vector
runtime), **Flink** (stream runtime). The application connects via degrade-safe adapters in
[`lib/runtime/`](../lib/runtime); every runtime is **OFF by default** and falls back to the
existing Postgres/in-process implementations, so no critical workflow depends solely on a new runtime.

## Bring the whole stack up (local / staging-equivalent)

```bash
docker compose -f infra/docker-compose.runtime.yml up -d
docker compose -f infra/docker-compose.runtime.yml ps

# Event fabric: create every topic + DLQ + replay from the master taxonomy
bash infra/kafka/register-topics.sh

# Vector runtime: create collections + payload indexes
QDRANT_URL=http://localhost:6333 QDRANT_API_KEY=localdevqdrant bash infra/qdrant/register-collections.sh

# Graph runtime: apply constraints + indexes
cat infra/neo4j/init/01-constraints.cypher \
  | docker compose -f infra/docker-compose.runtime.yml exec -T neo4j cypher-shell -u neo4j -p localdevneo4j

# Stream runtime: submit the inventory-availability job
docker compose -f infra/docker-compose.runtime.yml exec flink-jobmanager \
  ./bin/sql-client.sh -f /opt/flink/kartex-jobs/inventory-availability.sql
```

## Consoles
| Runtime | URL | Local credential (NEVER reuse) |
|---|---|---|
| Kafka UI | http://localhost:8085 | — |
| Schema Registry | http://localhost:8081 | — |
| Neo4j Browser | http://localhost:7474 | neo4j / localdevneo4j |
| Qdrant dashboard | http://localhost:6333/dashboard | api-key: localdevqdrant |
| Flink dashboard | http://localhost:8082 | — |
| Redis | localhost:6379 | requirepass localdevredis |

## Enable the adapters from the app
Set `RUNTIME_*_ENABLED=true` plus connection env (see `.env.example` "Phase B" block) and the
adapters connect to the running services. Health: `GET /api/runtime/health`.

## Production
Local containers are for dev/CI. Production uses **managed services** — see
[`infra/terraform/runtime`](./terraform/runtime) and `PRODUCTION_DEPLOYMENT_REQUIREMENTS` in
[`docs/audit/PHASE_B_RUNTIME_INFRASTRUCTURE.md`](../docs/audit/PHASE_B_RUNTIME_INFRASTRUCTURE.md).

## Layout
```
infra/
  docker-compose.runtime.yml      all five runtimes (KRaft Kafka, no ZooKeeper)
  redis/redis.conf                persistence + eviction + hardened commands
  kafka/topics.json               master topic taxonomy (owner/schema/retention/DLQ/replay)
  kafka/register-topics.sh        idempotent topic+DLQ+replay creation
  kafka/schemas/*.avsc            representative value schemas (orders, payments)
  neo4j/init/01-constraints.cypher graph constraints + indexes + relationship contract
  qdrant/collections.json         collection + payload-index definitions
  qdrant/register-collections.sh  idempotent collection creation
  flink/jobs/*.sql                stream jobs (availability + low-stock CEP)
  k8s/                            namespace + network policy (production hardening)
  terraform/runtime/              managed-service module skeleton
```
