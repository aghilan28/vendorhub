CREATE TABLE tier15_events (
  id STRING,
  stream STRING,
  event_type STRING,
  payload STRING,
  event_time TIMESTAMP(3),
  WATERMARK FOR event_time AS event_time - INTERVAL '5' SECOND
) WITH (
  'connector' = 'kafka',
  'topic' = 'tier15.knowledge-units.events.v1',
  'format' = 'json'
);

CREATE VIEW tier15_knowledge_health AS
SELECT
  stream,
  COUNT(*) AS event_count,
  SUM(CASE WHEN event_type = 'ThreatDetected' THEN 1 ELSE 0 END) AS threat_count,
  SUM(CASE WHEN event_type = 'KnowledgeDrifted' THEN 1 ELSE 0 END) AS drift_count
FROM tier15_events
GROUP BY stream;
