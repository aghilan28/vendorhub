#!/usr/bin/env bash
# KARTEX Phase B — create every topic (+ DLQ + replay) from the master taxonomy.
# Idempotent: re-running only creates missing topics.
#
#   bash infra/kafka/register-topics.sh                       # local (RF=1)
#   BOOTSTRAP=broker:9092 RF=3 bash infra/kafka/register-topics.sh   # staging/prod
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
TOPICS_JSON="${TOPICS_JSON:-$HERE/topics.json}"
BOOTSTRAP="${BOOTSTRAP:-localhost:9094}"
RF="${RF:-1}"
COMPOSE_SVC="${COMPOSE_SVC:-kafka}"
# How to invoke kafka-topics: via docker compose by default, or set KAFKA_TOPICS_BIN.
RUN_TOPICS=(${KAFKA_TOPICS_BIN:-})
if [ ${#RUN_TOPICS[@]} -eq 0 ]; then
  RUN_TOPICS=(docker compose -f "$HERE/../docker-compose.runtime.yml" exec -T "$COMPOSE_SVC" kafka-topics.sh)
  BOOTSTRAP="kafka:9092"
fi

# Emit "name<TAB>partitions<TAB>cleanupPolicy<TAB>retentionMs" for every topic incl. dlq/replay.
mapfile -t ROWS < <(node -e '
  const t = require(process.argv[1]);
  const out = [];
  for (const top of t.topics) {
    out.push([top.name, top.partitions, top.cleanupPolicy.split(",")[0], top.retentionMs].join("\t"));
    out.push([top.dlq, Math.max(2, Math.ceil(top.partitions/4)), "delete", 1209600000].join("\t"));   // DLQ 14d
    out.push([top.replay, top.partitions, "delete", 604800000].join("\t"));                            // replay 7d
  }
  process.stdout.write(out.join("\n"));
' "$TOPICS_JSON")

echo "Registering ${#ROWS[@]} topics against ${BOOTSTRAP} (RF=${RF})"
for row in "${ROWS[@]}"; do
  IFS=$'\t' read -r NAME PARTS CLEANUP RETENTION <<< "$row"
  echo "  -> $NAME (parts=$PARTS cleanup=$CLEANUP retention=${RETENTION}ms)"
  "${RUN_TOPICS[@]}" \
    --bootstrap-server "$BOOTSTRAP" \
    --create --if-not-exists \
    --topic "$NAME" \
    --partitions "$PARTS" \
    --replication-factor "$RF" \
    --config "cleanup.policy=$CLEANUP" \
    --config "retention.ms=$RETENTION" \
    --config "min.insync.replicas=$([ "$RF" -ge 3 ] && echo 2 || echo 1)" >/dev/null
done
echo "Done. Verify: ${RUN_TOPICS[*]} --bootstrap-server $BOOTSTRAP --list"
