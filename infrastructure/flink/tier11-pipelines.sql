create table secis_forecast_events (
  market_id string,
  participant_id string,
  probability double,
  stake double,
  scoring_rule string,
  occurred_at timestamp(3),
  watermark for occurred_at as occurred_at - interval '5' second
) with (
  'connector' = 'kafka',
  'topic' = 'secis.forecast.events',
  'properties.bootstrap.servers' = '${KAFKA_BOOTSTRAP_SERVERS}',
  'format' = 'json',
  'scan.startup.mode' = 'earliest-offset'
);

create table secis_simulation_events (
  world_id string,
  tick_number bigint,
  psi double,
  gini double,
  trust double,
  debt double,
  elite_density double,
  occurred_at timestamp(3),
  watermark for occurred_at as occurred_at - interval '5' second
) with (
  'connector' = 'kafka',
  'topic' = 'secis.simulation.events',
  'properties.bootstrap.servers' = '${KAFKA_BOOTSTRAP_SERVERS}',
  'format' = 'json',
  'scan.startup.mode' = 'earliest-offset'
);

create table secis_reputation_events (
  subject_id string,
  reputation_score double,
  trust_band string,
  occurred_at timestamp(3),
  watermark for occurred_at as occurred_at - interval '5' second
) with (
  'connector' = 'kafka',
  'topic' = 'secis.reputation.events',
  'properties.bootstrap.servers' = '${KAFKA_BOOTSTRAP_SERVERS}',
  'format' = 'json',
  'scan.startup.mode' = 'earliest-offset'
);

create table secis_legitimacy_events (
  scope string,
  stress_score double,
  trigger_type string,
  replay_key string,
  emitted_at timestamp(3)
) with (
  'connector' = 'kafka',
  'topic' = 'secis.legitimacy.events',
  'properties.bootstrap.servers' = '${KAFKA_BOOTSTRAP_SERVERS}',
  'format' = 'json'
);

insert into secis_legitimacy_events
select
  world_id as scope,
  cast(least(1.0, (avg(psi) / 8.0) * 0.32 + (1.0 - avg(trust)) * 0.24 + avg(gini) * 0.16 + least(1.0, avg(debt) / 2.0) * 0.16 + least(1.0, avg(elite_density) / 3.0) * 0.12) as double) as stress_score,
  case
    when least(1.0, (avg(psi) / 8.0) * 0.32 + (1.0 - avg(trust)) * 0.24 + avg(gini) * 0.16 + least(1.0, avg(debt) / 2.0) * 0.16 + least(1.0, avg(elite_density) / 3.0) * 0.12) >= 0.78 then 'redistribution_required'
    when least(1.0, (avg(psi) / 8.0) * 0.32 + (1.0 - avg(trust)) * 0.24 + avg(gini) * 0.16 + least(1.0, avg(debt) / 2.0) * 0.16 + least(1.0, avg(elite_density) / 3.0) * 0.12) >= 0.62 then 'adaptive_policy_review'
    when least(1.0, (avg(psi) / 8.0) * 0.32 + (1.0 - avg(trust)) * 0.24 + avg(gini) * 0.16 + least(1.0, avg(debt) / 2.0) * 0.16 + least(1.0, avg(elite_density) / 3.0) * 0.12) >= 0.45 then 'stress_watch'
    else 'stable'
  end as trigger_type,
  md5(concat(world_id, cast(window_start as string), cast(avg(psi) as string))) as replay_key,
  window_end as emitted_at
from table(tumble(table secis_simulation_events, descriptor(occurred_at), interval '15' minute))
group by world_id, window_start, window_end;
