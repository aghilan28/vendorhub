CREATE TABLE IF NOT EXISTS tier15_knowledge_units (
  id text PRIMARY KEY,
  version integer NOT NULL CHECK (version > 0),
  tau numeric NOT NULL,
  lineage jsonb NOT NULL DEFAULT '[]',
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  verification_state text NOT NULL,
  trust_score numeric NOT NULL CHECK (trust_score >= 0 AND trust_score <= 1),
  source_references jsonb NOT NULL DEFAULT '[]',
  security_state text NOT NULL,
  governance_state text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tier15_events (
  id text PRIMARY KEY,
  stream text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  immutable boolean NOT NULL DEFAULT true,
  replayable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (immutable = true),
  CHECK (replayable = true)
);

CREATE TABLE IF NOT EXISTS tier15_traceability (
  research_concept text PRIMARY KEY,
  domain_model text NOT NULL,
  storage_schema text NOT NULL,
  graph_model text NOT NULL,
  vector_model text NOT NULL,
  service text NOT NULL,
  workflow text NOT NULL,
  api text NOT NULL,
  event_stream text NOT NULL,
  security_layer text NOT NULL,
  metrics jsonb NOT NULL,
  dashboard text NOT NULL,
  verification_rule text NOT NULL,
  test_suite text NOT NULL
);
