# KARTEX Phase B — production runtime via MANAGED services (recommended default).
#
# This module is intentionally provider-agnostic at the top level: each runtime is
# a swappable submodule so you can choose the managed offering per environment.
# Recommended defaults (lowest ops burden for a Vercel + Supabase deployment):
#
#   Redis  -> Upstash Redis (global, serverless, REST + TLS)
#   Kafka  -> Confluent Cloud or Redpanda Cloud (managed, Schema Registry incl.)
#   Neo4j  -> Neo4j Aura
#   Qdrant -> Qdrant Cloud
#   Flink  -> Confluent Flink / Ververica, or Kafka Streams if Flink is deferred
#
# Providers are commented so `terraform validate` does not require credentials in
# CI. Uncomment + set the matching variables to provision a real environment.

terraform {
  required_version = ">= 1.6.0"
  # required_providers {
  #   confluent = { source = "confluentinc/confluent", version = "~> 2.0" }
  #   # upstash / qdrant / neo4j use REST APIs; manage via the `restapi` or `http` providers,
  #   # or their official providers where available.
  # }
}

variable "environment" {
  type        = string
  description = "staging | production"
}

variable "region" {
  type        = string
  default     = "ap-south-1" # Mumbai — co-located with India commerce traffic
}

# ---- Topic taxonomy is the source of truth -------------------------------
# Topics are provisioned from infra/kafka/topics.json (register-topics.sh) rather
# than duplicated here, so the taxonomy has ONE definition. In production, run
# register-topics.sh against the managed bootstrap with RF=3 as a release step.

locals {
  replication_factor = var.environment == "production" ? 3 : 3
  retention_defaults = {
    financial_ms = 7776000000 # 90d
    standard_ms  = 2592000000 # 30d
    ephemeral_ms = 86400000   # 1d
  }
}

output "deployment_contract" {
  value = {
    environment        = var.environment
    region             = var.region
    replication_factor = local.replication_factor
    runtimes = {
      redis  = "Upstash Redis (TLS, per-env DB, eviction=volatile-lru)"
      kafka  = "Confluent/Redpanda (RF=${local.replication_factor}, min.insync=2, Schema Registry BACKWARD)"
      neo4j  = "Neo4j Aura (daily backup, PITR)"
      qdrant = "Qdrant Cloud (replicated collections, snapshots)"
      flink  = "Confluent Flink / Ververica (RocksDB state, exactly-once checkpoints)"
    }
    note = "Connection secrets are injected via the platform secret store, never committed. See PHASE_B PRODUCTION_DEPLOYMENT_REQUIREMENTS."
  }
}
