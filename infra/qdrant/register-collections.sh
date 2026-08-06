#!/usr/bin/env bash
# KARTEX Phase B — create Qdrant collections + payload indexes from collections.json.
# Idempotent: PUT collection is create-or-keep; index creation tolerates "already exists".
#
#   QDRANT_URL=http://localhost:6333 QDRANT_API_KEY=localdevqdrant bash infra/qdrant/register-collections.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DEF="${COLLECTIONS_JSON:-$HERE/collections.json}"
QDRANT_URL="${QDRANT_URL:-http://localhost:6333}"
QDRANT_API_KEY="${QDRANT_API_KEY:-localdevqdrant}"

auth=(-H "api-key: $QDRANT_API_KEY" -H "Content-Type: application/json")

# name<TAB>size<TAB>distance<TAB>on_disk<TAB>indexedFieldsCSV
mapfile -t ROWS < <(node -e '
  const d = require(process.argv[1]);
  for (const c of d.collections) {
    process.stdout.write([c.name, c.vectors.size, c.vectors.distance, c.vectors.on_disk, (c.payloadIndexes||[]).join(",")].join("\t") + "\n");
  }
' "$DEF")

for row in "${ROWS[@]}"; do
  IFS=$'\t' read -r NAME SIZE DIST ONDISK FIELDS <<< "$row"
  echo "Creating collection $NAME (size=$SIZE distance=$DIST)"
  curl -fsS "${auth[@]}" -X PUT "$QDRANT_URL/collections/$NAME" \
    -d "{\"vectors\":{\"size\":$SIZE,\"distance\":\"$DIST\",\"on_disk\":$ONDISK}}" >/dev/null || true
  IFS=',' read -ra FA <<< "$FIELDS"
  for f in "${FA[@]}"; do
    [ -z "$f" ] && continue
    echo "  index payload field: $f"
    curl -fsS "${auth[@]}" -X PUT "$QDRANT_URL/collections/$NAME/index" \
      -d "{\"field_name\":\"$f\",\"field_schema\":\"keyword\"}" >/dev/null || true
  done
done
echo "Done. Verify: curl ${auth[*]} $QDRANT_URL/collections"
