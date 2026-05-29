create table tier10_governance_events (
  aggregate_id string,
  event_type string,
  replay_key string,
  payload string,
  occurred_at timestamp(3),
  watermark for occurred_at as occurred_at - interval '5' second
) with (
  'connector' = 'kafka',
  'topic' = 'governance.events',
  'properties.bootstrap.servers' = '${KAFKA_BOOTSTRAP_SERVERS}',
  'format' = 'json',
  'scan.startup.mode' = 'earliest-offset'
);

create table tier10_alignment_events (
  principle_id string,
  subject_id string,
  severity string,
  drift_delta double,
  occurred_at timestamp(3),
  watermark for occurred_at as occurred_at - interval '5' second
) with (
  'connector' = 'kafka',
  'topic' = 'alignment.events',
  'properties.bootstrap.servers' = '${KAFKA_BOOTSTRAP_SERVERS}',
  'format' = 'json',
  'scan.startup.mode' = 'earliest-offset'
);

create table tier10_dashboard_alerts (
  alert_id string,
  alert_type string,
  severity string,
  replay_key string,
  emitted_at timestamp(3)
) with (
  'connector' = 'kafka',
  'topic' = 'simulation.events',
  'properties.bootstrap.servers' = '${KAFKA_BOOTSTRAP_SERVERS}',
  'format' = 'json'
);

insert into tier10_dashboard_alerts
select
  md5(concat(principle_id, subject_id, cast(window_start as string))) as alert_id,
  'alignment_drift' as alert_type,
  max(severity) as severity,
  md5(concat(principle_id, subject_id, cast(sum(drift_delta) as string))) as replay_key,
  window_end as emitted_at
from table(tumble(table tier10_alignment_events, descriptor(occurred_at), interval '1' hour))
where severity in ('watch', 'critical')
group by principle_id, subject_id, window_start, window_end;
