-- KARTEX Phase B — Flink SQL stream job: real-time inventory availability + low-stock CEP.
-- Submit:
--   docker compose -f infra/docker-compose.runtime.yml exec flink-jobmanager \
--     ./bin/sql-client.sh -f /opt/flink/kartex-jobs/inventory-availability.sql
--
-- Source : kartex.inventory.stock.changed   (keyed by productId)
-- Sinks  : kartex.realtime.invalidation (cache bust) + kartex.notifications.dispatch.requested (restock/low-stock)
-- State  : RocksDB, EXACTLY_ONCE checkpoints @10s (see docker-compose FLINK_PROPERTIES).

SET 'pipeline.name' = 'kartex-inventory-availability';

CREATE TABLE stock_changed (
  productId   STRING,
  sellerId    STRING,
  warehouseId STRING,
  qtyOnHand   INT,
  qtyReserved INT,
  occurredAt  TIMESTAMP(3),
  WATERMARK FOR occurredAt AS occurredAt - INTERVAL '5' SECOND
) WITH (
  'connector' = 'kafka',
  'topic' = 'kartex.inventory.stock.changed',
  'properties.bootstrap.servers' = 'kafka:9092',
  'properties.group.id' = 'flink-availability',
  'scan.startup.mode' = 'group-offsets',
  'format' = 'json'
);

CREATE TABLE realtime_invalidation (
  channel STRING,
  reason  STRING,
  productId STRING,
  emittedAt TIMESTAMP(3)
) WITH (
  'connector' = 'kafka',
  'topic' = 'kartex.realtime.invalidation',
  'properties.bootstrap.servers' = 'kafka:9092',
  'format' = 'json'
);

CREATE TABLE low_stock_alert (
  recipientId STRING,
  productId   STRING,
  available   INT,
  emittedAt   TIMESTAMP(3)
) WITH (
  'connector' = 'kafka',
  'topic' = 'kartex.notifications.dispatch.requested',
  'properties.bootstrap.servers' = 'kafka:9092',
  'format' = 'json'
);

-- 1) Every stock change invalidates the product's read cache (sub-second propagation).
INSERT INTO realtime_invalidation
SELECT CONCAT('product:', productId) AS channel,
       'stock_changed' AS reason,
       productId,
       occurredAt
FROM stock_changed;

-- 2) Low-stock detection over a 1-minute tumbling window (min available <= 3 => alert seller).
INSERT INTO low_stock_alert
SELECT sellerId AS recipientId,
       productId,
       MIN(qtyOnHand - qtyReserved) AS available,
       TUMBLE_END(occurredAt, INTERVAL '1' MINUTE) AS emittedAt
FROM stock_changed
GROUP BY productId, sellerId, TUMBLE(occurredAt, INTERVAL '1' MINUTE)
HAVING MIN(qtyOnHand - qtyReserved) <= 3;
