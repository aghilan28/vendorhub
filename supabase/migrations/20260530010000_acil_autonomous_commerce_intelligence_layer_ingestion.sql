create extension if not exists "pgcrypto";
create extension if not exists "fuzzystrmatch" with schema extensions;

create unique index if not exists acil_capability_search_tokens_replay_idx
  on public.search_tokens(product_id, normalized_token, token_type, language)
  where product_id is not null;

create unique index if not exists acil_capability_catalog_images_replay_idx
  on public.catalog_product_images(product_id, image_kind, storage_path);

create unique index if not exists acil_capability_variants_sku_replay_idx
  on public.catalog_product_variants(sku_template);

do $$
declare
  p jsonb;
  v jsonb;
  alias_item jsonb;
  token_item jsonb;
  v_image_kind text;
  dept_uuid uuid;
  cat_uuid uuid;
  subcat_uuid uuid;
  family_uuid uuid;
  brand_uuid uuid;
  product_uuid uuid;
  variant_uuid uuid;
  unit_uuid uuid;
  packaging_uuid uuid;
  perishability_uuid uuid;
  delivery_uuid uuid;
  all_regions public.commerce_region[] := array['TN','KL','KA','AP','TS']::public.commerce_region[];
  image_requirements jsonb := '{
    "required":["HERO","TRANSPARENT_PNG","PACKAGING","SHELF","MOBILE_THUMBNAIL"],
    "preferred_aspect_ratios":["1:1","4:5","16:9"],
    "minimum_width":1600,
    "minimum_height":1200,
    "webp_required":true,
    "watermark_allowed":false,
    "reject_marketplace_screenshot":true,
    "reject_fake_ai_packaging":true,
    "real_image_only":true,
    "ocr_required_for":["PACKAGING","SHELF"],
    "packaging_focus_areas":["architecture_label","version_marker","control_plane_scope","compliance_boundary"],
    "validation":{"background":"clean_system_diagram_or_verified_console_capture","duplicate_hash_required":true,"visual_embedding_required":true}
  }'::jsonb;
  products jsonb := $json$
[
  {
    "slug":"acil-parallel-claim-settlement-engine",
    "sku":"ACIL-CONSENSUS-FASTSET-CLAIM-SETTLEMENT",
    "name":"ACIL Parallel Claim Settlement Engine",
    "description":"Governance-held ACIL capability for asynchronous signed claim validation, presettlement, settlement, and weak-independence enforcement without hot-path global coordination.",
    "short":"FastSet-inspired claim settlement capability for partition-tolerant commerce state execution.",
    "category":"distributed-commerce-consensus",
    "category_name":"Distributed Commerce Consensus",
    "subcategory":"parallel-claim-settlement",
    "subcategory_name":"Parallel Claim Settlement",
    "family":"acil-consensus-operating-plane",
    "family_name":"ACIL Consensus Operating Plane",
    "variant_name":"Validator-local claim execution module",
    "variant_sku":"ACIL-CONSENSUS-FASTSET-CLAIM-SETTLEMENT-MODULE",
    "aliases":[
      ["FastSet mode","SHORTHAND","roman"],
      ["parallel claim settlement","REGIONAL","en"],
      ["weak independence execution","REGIONAL","en"],
      ["presettlement queue","REGIONAL","en"],
      ["asynchronous validator execution","VOICE","en"]
    ],
    "tokens":{
      "search":["FastSet claim settlement","parallel claim settlement","weak independence","presettled claims","settled claims","local validator execution"],
      "phonetic":["fast set mode","claim settlement engine"],
      "transliteration":[],
      "voice":["FastSet mode","claim settlement","validator settlement"],
      "recipe":[],
      "festival":[],
      "context":["Tier 1 commerce ontology","non serial state replication","network partition tolerance","zero hot path coordination","replay safe claims"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"non-perishable control-plane capability with version and policy freshness requirements",
      "delivery_sensitivity":"requires deterministic replay tests, validator quorum verification, and weak-independence proofs before deployment",
      "storage_requirements":"versioned control-plane artifact registry",
      "temperature_constraints_c":null,
      "shelf_life_hours":null,
      "inventory_policy":"placeholder_only_until_platform_module_registry_is_connected"
    },
    "image":{"search_terms":["FastSet claim settlement architecture diagram","validator presettlement queue diagram","parallel commerce settlement control plane"],"visual_search_tags":["consensus","claims","validator","presettlement","weak_independence"]}
  },
  {
    "slug":"acil-cpos-belief-merge-fabric",
    "sku":"ACIL-CONSENSUS-CPOS-BELIEF-MERGE",
    "name":"ACIL CPoS Belief Merge Fabric",
    "description":"Governance-held ACIL capability for Convergent Proof of Stake belief merging with idempotent, commutative, and associative CRDT-style state propagation.",
    "short":"Stake-weighted belief merge fabric for convergent commerce state.",
    "category":"distributed-commerce-consensus",
    "category_name":"Distributed Commerce Consensus",
    "subcategory":"convergent-proof-of-stake",
    "subcategory_name":"Convergent Proof of Stake",
    "family":"acil-consensus-operating-plane",
    "family_name":"ACIL Consensus Operating Plane",
    "variant_name":"Stake-weighted belief propagation module",
    "variant_sku":"ACIL-CONSENSUS-CPOS-BELIEF-MERGE-MODULE",
    "aliases":[
      ["CPoS","SHORTHAND","roman"],
      ["Convergent Proof of Stake","REGIONAL","en"],
      ["belief merge","REGIONAL","en"],
      ["CRDT belief propagation","VOICE","en"]
    ],
    "tokens":{
      "search":["Convergent Proof of Stake","CPoS","belief merge function","CRDT consensus","stake weighted voting","gossip convergence"],
      "phonetic":["c pos","belief merge"],
      "transliteration":[],
      "voice":["CPoS","belief merge fabric","stake weighted merge"],
      "recipe":[],
      "festival":[],
      "context":["shared market books","cross chain pool state","two thirds active non collusive stake","localized belief merging","O log peers propagation"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"non-perishable consensus capability with active stake and peer-liveness freshness requirements",
      "delivery_sensitivity":"requires stake distribution monitoring and collusion-risk guardrails before activation",
      "storage_requirements":"versioned governance policy registry",
      "temperature_constraints_c":null,
      "shelf_life_hours":null,
      "inventory_policy":"placeholder_only_until_validator_network_registry_is_connected"
    },
    "image":{"search_terms":["Convergent Proof of Stake belief merge architecture","CRDT belief propagation network diagram","stake weighted consensus fabric"],"visual_search_tags":["cpos","crdt","belief_merge","stake","gossip"]}
  },
  {
    "slug":"acil-zero-trust-attestation-fabric",
    "sku":"ACIL-SECURITY-SPIFFE-SPIRE-KEYLIME-ATTESTATION",
    "name":"ACIL Zero-Trust Attestation Fabric",
    "description":"Governance-held ACIL security capability joining SPIFFE/SPIRE SVID identity, Keylime TPM v2.0 remote attestation, IMA integrity monitoring, and IEEE 802.1AR DevID binding.",
    "short":"Hardware-rooted workload identity and continuous attestation fabric.",
    "category":"zero-trust-security-fabrics",
    "category_name":"Zero-Trust Security Fabrics",
    "subcategory":"hardware-rooted-attestation",
    "subcategory_name":"Hardware-Rooted Attestation",
    "family":"acil-security-operating-plane",
    "family_name":"ACIL Security Operating Plane",
    "variant_name":"SPIRE Keylime TPM attestor module",
    "variant_sku":"ACIL-SECURITY-SPIRE-KEYLIME-TPM-ATTESTOR",
    "aliases":[
      ["SPIFFE SVID","REGIONAL","en"],
      ["SPIRE attestation","REGIONAL","en"],
      ["Keylime TPM attestation","REGIONAL","en"],
      ["TPM DevID attestor","VOICE","en"],
      ["IMA integrity monitoring","REGIONAL","en"]
    ],
    "tokens":{
      "search":["SPIFFE","SPIRE","SVID","Keylime","TPM v2.0","remote attestation","DevID","IMA measured boot"],
      "phonetic":["spire attestation","key lime attestation"],
      "transliteration":[],
      "voice":["SPIRE attestor","Keylime verifier","TPM attestation"],
      "recipe":[],
      "festival":[],
      "context":["Tier 1.5 governance normalization","zero trust workload identity","short lived X509 SVID","credential activation","measured boot verification"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"identity and attestation freshness depends on short-lived SVID rotation and continuous TPM quote validation",
      "delivery_sensitivity":"must fail closed on invalid PCR, IMA drift, expired SVID, or failed DevID credential activation",
      "storage_requirements":"secure trust-bundle and attestation-policy registry",
      "temperature_constraints_c":null,
      "shelf_life_hours":null,
      "inventory_policy":"placeholder_only_until_trust_domain_registry_is_connected"
    },
    "image":{"search_terms":["SPIFFE SPIRE Keylime TPM attestation diagram","zero trust workload identity architecture","TPM DevID attestation flow"],"visual_search_tags":["spiffe","spire","keylime","tpm","svid","devid"]}
  },
  {
    "slug":"acil-in-situ-telemetry-data-plane",
    "sku":"ACIL-OBSERVABILITY-EBPF-OTEL-P4-TELEMETRY",
    "name":"ACIL In-Situ Telemetry Data Plane",
    "description":"Governance-held ACIL observability capability for eBPF kernel telemetry, OpenTelemetry OTLP traces, P4 programmable data planes, INT, gNMI, and gRPC streaming telemetry.",
    "short":"Kernel and programmable data-plane telemetry for ACIL operations.",
    "category":"zero-trust-security-fabrics",
    "category_name":"Zero-Trust Security Fabrics",
    "subcategory":"kernel-data-plane-telemetry",
    "subcategory_name":"Kernel and Data-Plane Telemetry",
    "family":"acil-security-operating-plane",
    "family_name":"ACIL Security Operating Plane",
    "variant_name":"eBPF OTel P4 telemetry module",
    "variant_sku":"ACIL-OBSERVABILITY-EBPF-OTEL-P4-MODULE",
    "aliases":[
      ["eBPF telemetry","REGIONAL","en"],
      ["OpenTelemetry OTLP","REGIONAL","en"],
      ["P4 data plane","REGIONAL","en"],
      ["in band network telemetry","VOICE","en"],
      ["gNMI streaming telemetry","REGIONAL","en"]
    ],
    "tokens":{
      "search":["eBPF telemetry","OpenTelemetry","OTLP","P4 programmable data plane","INT telemetry","gNMI","gRPC streaming telemetry","RDMA AI workload monitoring"],
      "phonetic":["ebpf otel","p four telemetry"],
      "transliteration":[],
      "voice":["eBPF telemetry","OTel traces","P4 data plane"],
      "recipe":[],
      "festival":[],
      "context":["kernel hooks","Kubernetes DaemonSet","wire speed telemetry","SmartNIC flow tracking","zero packet drops"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"telemetry freshness requires sub-second stream health and OTLP export validity",
      "delivery_sensitivity":"requires kernel compatibility, probe safety validation, cardinality budgets, and data-plane rollback controls",
      "storage_requirements":"observability configuration registry",
      "temperature_constraints_c":null,
      "shelf_life_hours":null,
      "inventory_policy":"placeholder_only_until_observability_agent_registry_is_connected"
    },
    "image":{"search_terms":["eBPF OpenTelemetry architecture diagram","P4 in band telemetry data plane diagram","kernel telemetry fabric dashboard"],"visual_search_tags":["ebpf","otel","p4","int","gnmi","telemetry"]}
  },
  {
    "slug":"acil-causal-logistics-world-model",
    "sku":"ACIL-AI-GRAPHFWFM-SCM-LOGISTICS",
    "name":"ACIL Causal Logistics World Model",
    "description":"Governance-held ACIL AI capability combining spatiotemporal heterogeneous graphs, GraphFwFM, Bayesian causal discovery, DAG constraints, and do-calculus intervention simulation.",
    "short":"Causal graph world model for logistics and commerce interventions.",
    "category":"causal-ai-world-models",
    "category_name":"Causal AI World Models",
    "subcategory":"spatiotemporal-causal-logistics",
    "subcategory_name":"Spatiotemporal Causal Logistics",
    "family":"acil-ai-operating-plane",
    "family_name":"ACIL AI Operating Plane",
    "variant_name":"GraphFwFM SCM intervention module",
    "variant_sku":"ACIL-AI-GRAPHFWFM-SCM-INTERVENTION-MODULE",
    "aliases":[
      ["GraphFwFM","SHORTHAND","roman"],
      ["causal logistics model","REGIONAL","en"],
      ["structural causal model","REGIONAL","en"],
      ["do calculus intervention","VOICE","en"],
      ["spatiotemporal GNN","REGIONAL","en"]
    ],
    "tokens":{
      "search":["GraphFwFM","spatiotemporal GNN","Structural Causal Model","SCM","DAG acyclicity","do calculus","backdoor adjustment","causal adjacency matrix"],
      "phonetic":["graph f w f m","do calculus"],
      "transliteration":[],
      "voice":["causal world model","GraphFwFM","SCM intervention"],
      "recipe":[],
      "festival":[],
      "context":["Tier 4 AI ingestion systems","routing intervention simulation","out of distribution robustness","weather traffic supplier capacity graph","matrix exponential acyclicity"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"model freshness depends on current graph features, causal drift checks, and intervention audit logs",
      "delivery_sensitivity":"requires DAG constraint validation, OOD guardrails, causal edge thresholding, and human-reviewable intervention reports",
      "storage_requirements":"model registry with causal adjacency snapshots",
      "temperature_constraints_c":null,
      "shelf_life_hours":null,
      "inventory_policy":"placeholder_only_until_model_registry_is_connected"
    },
    "image":{"search_terms":["causal graph logistics world model diagram","GraphFwFM spatiotemporal commerce graph","structural causal model intervention dashboard"],"visual_search_tags":["causal_ai","graphfwfm","scm","dag","logistics"]}
  },
  {
    "slug":"acil-prosumer-compute-power-scheduler",
    "sku":"ACIL-FINOPS-MILP-PROSUMER-COMPUTE-POWER",
    "name":"ACIL Prosumer Compute-Power Scheduler",
    "description":"Governance-held ACIL operations capability for MILP compute-power scheduling, carbon-aware node selection, fractional GPU allocation, UCB-DUAL edge bandits, and prosumer energy dispatch.",
    "short":"Compute, carbon, GPU, battery, and grid-aware scheduling layer.",
    "category":"economic-finops-orchestration",
    "category_name":"Economic FinOps Orchestration",
    "subcategory":"prosumer-compute-power-scheduling",
    "subcategory_name":"Prosumer Compute-Power Scheduling",
    "family":"acil-economics-operating-plane",
    "family_name":"ACIL Economics Operating Plane",
    "variant_name":"MILP carbon-aware scheduling module",
    "variant_sku":"ACIL-FINOPS-MILP-CARBON-SCHEDULER-MODULE",
    "aliases":[
      ["MILP scheduler","REGIONAL","en"],
      ["carbon aware node selection","REGIONAL","en"],
      ["prosumer compute scheduler","VOICE","en"],
      ["UCB-DUAL edge bandit","REGIONAL","en"],
      ["fractional GPU scheduler","REGIONAL","en"]
    ],
    "tokens":{
      "search":["MILP scheduler","prosumer compute scheduling","carbon aware node selection","GPU DRA","MIG","MPS","UCB-DUAL","battery dispatch","grid export"],
      "phonetic":["m i l p scheduler","ucb dual"],
      "transliteration":[],
      "voice":["MILP scheduler","carbon scheduler","GPU scheduler"],
      "recipe":[],
      "festival":[],
      "context":["Tier 3 operational intelligence","Tier 5 autonomous orchestration","PUE carbon intensity","elastic inference routing","rigid training placement","compute scarcity"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"scheduler freshness depends on live utilization, grid carbon intensity, PUE, battery state, and workload SLO feeds",
      "delivery_sensitivity":"requires constraint replay, carbon accounting audit, GPU isolation policy, and queue backpressure before scheduling changes",
      "storage_requirements":"optimization policy registry and telemetry warehouse",
      "temperature_constraints_c":null,
      "shelf_life_hours":null,
      "inventory_policy":"placeholder_only_until_compute_capacity_registry_is_connected"
    },
    "image":{"search_terms":["carbon aware compute scheduler dashboard","MILP prosumer data center optimization diagram","GPU DRA MIG MPS scheduling architecture"],"visual_search_tags":["milp","finops","carbon","gpu","prosumer","scheduler"]}
  },
  {
    "slug":"acil-economic-thermodynamics-guardrail",
    "sku":"ACIL-GOVERNANCE-RESOURCE-THERMODYNAMICS",
    "name":"ACIL Economic Thermodynamics Guardrail",
    "description":"Governance-held ACIL resource capability for ecological carrying capacity, entropy-aware resource vectors, energy-water-mineral accounting, and externality-aware workload delegation.",
    "short":"Civilizational resource thermodynamics and carrying-capacity guardrail.",
    "category":"constitutional-governance-safety",
    "category_name":"Constitutional Governance Safety",
    "subcategory":"resource-thermodynamics",
    "subcategory_name":"Resource Thermodynamics",
    "family":"acil-governance-operating-plane",
    "family_name":"ACIL Governance Operating Plane",
    "variant_name":"Ecological externality guardrail module",
    "variant_sku":"ACIL-GOVERNANCE-EEI-THERMODYNAMICS-MODULE",
    "aliases":[
      ["Economic Thermodynamics","REGIONAL","en"],
      ["Ecological Externality Index","REGIONAL","en"],
      ["carrying capacity vector","VOICE","en"],
      ["resource mass balance","REGIONAL","en"]
    ],
    "tokens":{
      "search":["economic thermodynamics","ecological carrying capacity","Ecological Externality Index","resource mass balance","entropy accounting","water cooling footprint","mineral wear"],
      "phonetic":["e e i","resource thermodynamics"],
      "transliteration":[],
      "voice":["carrying capacity guardrail","resource thermodynamics","EEI guardrail"],
      "recipe":[],
      "festival":[],
      "context":["civilizational resource limits","green energy workload delegation","water drought compute deferral","planetary carrying capacity vector"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"constraint freshness depends on regional water, carbon, grid, and material wear feeds",
      "delivery_sensitivity":"must block or delegate workloads when localized resource bottlenecks breach configured capacity vectors",
      "storage_requirements":"governance policy registry and resource telemetry ledger",
      "temperature_constraints_c":null,
      "shelf_life_hours":null,
      "inventory_policy":"placeholder_only_until_resource_telemetry_registry_is_connected"
    },
    "image":{"search_terms":["ecological carrying capacity compute scheduler diagram","resource thermodynamics dashboard","data center water carbon mineral accounting"],"visual_search_tags":["resource","thermodynamics","eei","carbon","water","capacity"]}
  },
  {
    "slug":"acil-wisdom-forcing-function-arbiter",
    "sku":"ACIL-GOVERNANCE-WFF-CONSTITUTIONAL-ARBITER",
    "name":"ACIL Wisdom Forcing Function Arbiter",
    "description":"Governance-held ACIL constitutional capability for neurosymbolic action gating, constitutional diagnostics, autonomous correction templates, and human-in-the-loop escalation.",
    "short":"Constitutional action arbiter for high-criticality commerce proposals.",
    "category":"constitutional-governance-safety",
    "category_name":"Constitutional Governance Safety",
    "subcategory":"wisdom-forcing-function",
    "subcategory_name":"Wisdom Forcing Function",
    "family":"acil-governance-operating-plane",
    "family_name":"ACIL Governance Operating Plane",
    "variant_name":"Neurosymbolic constitutional arbiter module",
    "variant_sku":"ACIL-GOVERNANCE-WFF-ARBITER-MODULE",
    "aliases":[
      ["WFF","SHORTHAND","roman"],
      ["Wisdom Forcing Function","REGIONAL","en"],
      ["constitutional arbiter","REGIONAL","en"],
      ["neurosymbolic guard","VOICE","en"],
      ["constitutional AI gate","REGIONAL","en"]
    ],
    "tokens":{
      "search":["Wisdom Forcing Function","WFF","constitutional arbiter","neurosymbolic governance","human oversight","translator constitution arbiter recalibration"],
      "phonetic":["w f f","wisdom forcing"],
      "transliteration":[],
      "voice":["WFF","constitutional arbiter","wisdom guard"],
      "recipe":[],
      "festival":[],
      "context":["Tier 1.5 governance normalization","high criticality proposal gate","constitutional violations","autonomous self repair","human review board"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"policy freshness depends on active constitution version and compiled rule checks",
      "delivery_sensitivity":"must fail closed on non-viable action, translator conflict, missing diagnostic, or stale constitution bundle",
      "storage_requirements":"versioned constitution and compiled policy registry",
      "temperature_constraints_c":null,
      "shelf_life_hours":null,
      "inventory_policy":"placeholder_only_until_governance_policy_registry_is_connected"
    },
    "image":{"search_terms":["constitutional AI arbiter dashboard","Wisdom Forcing Function architecture diagram","neurosymbolic governance control plane"],"visual_search_tags":["wff","constitution","arbiter","governance","human_oversight"]}
  },
  {
    "slug":"acil-anti-collusion-incentive-engine",
    "sku":"ACIL-ECONOMICS-ANTI-COLLUSION-VPOP-PNCA",
    "name":"ACIL Anti-Collusion Incentive Engine",
    "description":"Governance-held ACIL market-safety capability for mutagenic incentive interventions, VCG Posted Price isolation, plausible non-collusion auditing, policy hashing, and smart-contract sanctions.",
    "short":"Anti-collusion economics engine for autonomous pricing and auctions.",
    "category":"constitutional-governance-safety",
    "category_name":"Constitutional Governance Safety",
    "subcategory":"anti-collusive-market-invariants",
    "subcategory_name":"Anti-Collusive Market Invariants",
    "family":"acil-governance-operating-plane",
    "family_name":"ACIL Governance Operating Plane",
    "variant_name":"V-PoP non-collusion audit module",
    "variant_sku":"ACIL-ECONOMICS-VPOP-PNCA-MODULE",
    "aliases":[
      ["V-PoP","SHORTHAND","roman"],
      ["plausible non collusion auditing","REGIONAL","en"],
      ["mutagenic incentive intervention","REGIONAL","en"],
      ["policy hashing sanctions","VOICE","en"]
    ],
    "tokens":{
      "search":["algorithmic collusion","V-PoP","VCG Posted Price","Plausible Non-Collusion Auditing","mutagenic incentive intervention","policy hashing","smart contract sanctions"],
      "phonetic":["v pop","non collusion audit"],
      "transliteration":[],
      "voice":["V-PoP","non collusion audit","anti collusion engine"],
      "recipe":[],
      "festival":[],
      "context":["bounded extraction invariant","pricing agent collusion","reporting reward","collusion penalty","stake forfeiture","market fairness"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"audit freshness depends on recent transaction streams, rival-action correlation analysis, and active smart-contract penalty configuration",
      "delivery_sensitivity":"requires statistical audit evidence before isolation or sanctions; must preserve appeal and rollback references",
      "storage_requirements":"market audit ledger and smart-contract policy registry",
      "temperature_constraints_c":null,
      "shelf_life_hours":null,
      "inventory_policy":"placeholder_only_until_market_audit_registry_is_connected"
    },
    "image":{"search_terms":["algorithmic collusion detection dashboard","VCG posted price isolation diagram","non collusion audit architecture"],"visual_search_tags":["anti_collusion","vpop","auction","audit","sanction"]}
  },
  {
    "slug":"acil-lipschitz-self-modification-verifier",
    "sku":"ACIL-ALIGNMENT-LIPSCHITZ-SELF-MODIFICATION",
    "name":"ACIL Lipschitz Self-Modification Verifier",
    "description":"Governance-held ACIL alignment capability for bounded recursive self-modification, Goal Drift Index monitoring, and deterministic parameter-space Lipschitz-ball verification.",
    "short":"Alignment-preserving verifier for recursive optimization proposals.",
    "category":"constitutional-governance-safety",
    "category_name":"Constitutional Governance Safety",
    "subcategory":"recursive-alignment-verification",
    "subcategory_name":"Recursive Alignment Verification",
    "family":"acil-governance-operating-plane",
    "family_name":"ACIL Governance Operating Plane",
    "variant_name":"Parameter-space Lipschitz verifier module",
    "variant_sku":"ACIL-ALIGNMENT-LIPSCHITZ-VERIFIER-MODULE",
    "aliases":[
      ["Goal Drift Index","REGIONAL","en"],
      ["GDI","SHORTHAND","roman"],
      ["Lipschitz verification ball","REGIONAL","en"],
      ["self modification verifier","VOICE","en"]
    ],
    "tokens":{
      "search":["Goal Drift Index","GDI","Lipschitz ball","parameter space verifier","recursive self modification","alignment persistence","KL divergence drift"],
      "phonetic":["g d i","lipschitz verifier"],
      "transliteration":[],
      "voice":["GDI","Lipschitz verifier","self modification guard"],
      "recipe":[],
      "festival":[],
      "context":["Safety Utility Impossibility Theorem","false acceptance zero","constraint preserving loss","root aligned model parameters","deterministic verifier"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"verifier freshness depends on baseline parameter snapshot, safety margin, Lipschitz estimate, and mutation proposal lineage",
      "delivery_sensitivity":"must reject mutations outside verification radius and record deterministic proof artifacts",
      "storage_requirements":"model lineage registry and formal verification artifact store",
      "temperature_constraints_c":null,
      "shelf_life_hours":null,
      "inventory_policy":"placeholder_only_until_model_lineage_registry_is_connected"
    },
    "image":{"search_terms":["Lipschitz parameter space verification diagram","Goal Drift Index dashboard","recursive self modification verifier architecture"],"visual_search_tags":["alignment","lipschitz","gdi","verifier","self_modification"]}
  },
  {
    "slug":"acil-epistemic-defense-tdkps-sigma",
    "sku":"ACIL-DEFENSE-TDKPS-SIGMA-INFORMATION-WARFARE",
    "name":"ACIL Epistemic Defense TDKPS SIGMA Engine",
    "description":"Governance-held ACIL defense capability for Friedkin-Johnsen belief dynamics, TDKPS temporal embeddings, iso-mirror control charts, and SIGMA signed-graph mitigation.",
    "short":"Information warfare detection and signed-graph mitigation engine.",
    "category":"epistemic-defense-intelligence",
    "category_name":"Epistemic Defense Intelligence",
    "subcategory":"information-warfare-resilience",
    "subcategory_name":"Information Warfare Resilience",
    "family":"acil-epistemic-operating-plane",
    "family_name":"ACIL Epistemic Operating Plane",
    "variant_name":"TDKPS SIGMA mitigation module",
    "variant_sku":"ACIL-DEFENSE-TDKPS-SIGMA-MODULE",
    "aliases":[
      ["TDKPS","SHORTHAND","roman"],
      ["SIGMA signed graph","REGIONAL","en"],
      ["Friedkin Johnsen dynamics","REGIONAL","en"],
      ["iso mirror control chart","VOICE","en"],
      ["information warfare resilience","REGIONAL","en"]
    ],
    "tokens":{
      "search":["TDKPS","Temporal Data Kernel Perspective Space","SIGMA signed graph","Friedkin-Johnsen opinion dynamics","iso-mirror mapping","strategic manipulators","signed message passing"],
      "phonetic":["t d k p s","sigma graph"],
      "transliteration":[],
      "voice":["TDKPS","SIGMA mitigation","signed graph defense"],
      "recipe":[],
      "festival":[],
      "context":["information warfare","synthetic demand signals","coordinated narrative manipulation","adaptive control charts","distrusted actor suppression"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"defense freshness depends on current agent-timepoint telemetry, belief graphs, and signed edge polarity evidence",
      "delivery_sensitivity":"requires anomaly evidence before mitigation and must separate environmental adaptation from adversarial convergence",
      "storage_requirements":"epistemic telemetry and signed-graph evidence store",
      "temperature_constraints_c":null,
      "shelf_life_hours":null,
      "inventory_policy":"placeholder_only_until_epistemic_telemetry_registry_is_connected"
    },
    "image":{"search_terms":["TDKPS information warfare detection diagram","SIGMA signed graph mitigation dashboard","Friedkin Johnsen belief dynamics control chart"],"visual_search_tags":["tdkps","sigma","belief","signed_graph","defense"]}
  },
  {
    "slug":"acil-observer-situation-lattice-jtms",
    "sku":"ACIL-EPISTEMIC-OSL-JTMS-TRUTH-MAINTENANCE",
    "name":"ACIL Observer-Situation Lattice JTMS",
    "description":"Governance-held ACIL epistemic-safety capability for Observer-Situation Lattice semantics, lattice meet/join conflict resolution, and on-chain Justification-Based Truth Maintenance.",
    "short":"Perspective-aware truth maintenance layer for commerce claims.",
    "category":"epistemic-defense-intelligence",
    "category_name":"Epistemic Defense Intelligence",
    "subcategory":"observer-situation-lattice",
    "subcategory_name":"Observer-Situation Lattice",
    "family":"acil-epistemic-operating-plane",
    "family_name":"ACIL Epistemic Operating Plane",
    "variant_name":"OSL JTMS belief revision module",
    "variant_sku":"ACIL-EPISTEMIC-OSL-JTMS-MODULE",
    "aliases":[
      ["OSL","SHORTHAND","roman"],
      ["Observer Situation Lattice","REGIONAL","en"],
      ["JTMS","SHORTHAND","roman"],
      ["truth maintenance system","VOICE","en"],
      ["lattice epistemics","REGIONAL","en"]
    ],
    "tokens":{
      "search":["Observer-Situation Lattice","OSL","JTMS","Justification-Based Truth Maintenance","lattice meet join","belief revision","paradigm maintenance"],
      "phonetic":["o s l","j t m s"],
      "transliteration":[],
      "voice":["OSL","JTMS","truth maintenance"],
      "recipe":[],
      "festival":[],
      "context":["knowledge theoretic safety","observer situation belief tuple","epistemic corruption prevention","semantic expansion operator","ontology poisoning defense"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"truth-maintenance freshness depends on current observer, situation, belief, and justification graphs",
      "delivery_sensitivity":"must force belief revision when structural anomalies cross configured thresholds",
      "storage_requirements":"on-chain justification ledger and epistemic state registry",
      "temperature_constraints_c":null,
      "shelf_life_hours":null,
      "inventory_policy":"placeholder_only_until_truth_maintenance_registry_is_connected"
    },
    "image":{"search_terms":["Observer Situation Lattice architecture diagram","JTMS truth maintenance dashboard","lattice epistemics commerce claims"],"visual_search_tags":["osl","jtms","lattice","belief_revision","truth"]}
  },
  {
    "slug":"acil-sovereign-fork-arbitration-plane",
    "sku":"ACIL-GEOPOLITICAL-SOVEREIGN-FORK-ARBITRATION",
    "name":"ACIL Sovereign Fork Arbitration Plane",
    "description":"Governance-held ACIL resilience capability for sovereign trust domains, sanctions-aware routing, offline-first enclave operation, and regional constitutional fork arbitration.",
    "short":"Sovereign trust-domain routing and constitutional fork arbitration.",
    "category":"geopolitical-resilience-orchestration",
    "category_name":"Geopolitical Resilience Orchestration",
    "subcategory":"sovereign-fork-arbitration",
    "subcategory_name":"Sovereign Fork Arbitration",
    "family":"acil-resilience-operating-plane",
    "family_name":"ACIL Resilience Operating Plane",
    "variant_name":"Federated trust-domain arbitration module",
    "variant_sku":"ACIL-GEOPOLITICAL-FEDERATED-TRUST-DOMAIN-MODULE",
    "aliases":[
      ["sovereign AI bloc","REGIONAL","en"],
      ["constitutional fork arbitration","REGIONAL","en"],
      ["federated trust domain","VOICE","en"],
      ["sanctions aware routing","REGIONAL","en"]
    ],
    "tokens":{
      "search":["sovereign fork arbitration","SPIFFE federation","federated mTLS trust bundles","sanctions aware routing","offline first enclave","compute denial"],
      "phonetic":["sovereign fork","trust domain"],
      "transliteration":[],
      "voice":["sovereign fork","trust domain federation","sanctions routing"],
      "recipe":[],
      "festival":[],
      "context":["geopolitical fragmentation","regional legal conflict","EU GDPR fork","US SEC audit trail fork","essential logistics continuity"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"routing freshness depends on active sovereignty action vectors, sanctions matrices, and trust bundle versions",
      "delivery_sensitivity":"must avoid sanctioned edges and preserve local essential supply circulation during partitions",
      "storage_requirements":"regional constitution registry and federated trust-bundle store",
      "temperature_constraints_c":null,
      "shelf_life_hours":null,
      "inventory_policy":"placeholder_only_until_sovereignty_policy_registry_is_connected"
    },
    "image":{"search_terms":["sovereign trust domain federation diagram","constitutional fork arbitration architecture","sanctions aware routing control plane"],"visual_search_tags":["sovereign","fork","trust_domain","sanctions","resilience"]}
  },
  {
    "slug":"acil-production-financial-contagion-simulator",
    "sku":"ACIL-RISK-PRODUCTION-FINANCIAL-CONTAGION",
    "name":"ACIL Production-Financial Contagion Simulator",
    "description":"Governance-held ACIL systemic-risk capability coupling physical supply shocks, firm loan defaults, interbank Recovery DebtRank propagation, and interest-rate feedback loops.",
    "short":"Production and financial network stress-testing simulator.",
    "category":"geopolitical-resilience-orchestration",
    "category_name":"Geopolitical Resilience Orchestration",
    "subcategory":"production-financial-contagion",
    "subcategory_name":"Production-Financial Contagion",
    "family":"acil-resilience-operating-plane",
    "family_name":"ACIL Resilience Operating Plane",
    "variant_name":"Recovery DebtRank stress simulation module",
    "variant_sku":"ACIL-RISK-DEBTRANK-STRESS-SIM-MODULE",
    "aliases":[
      ["Recovery DebtRank","REGIONAL","en"],
      ["financial contagion simulator","REGIONAL","en"],
      ["production shock propagation","VOICE","en"],
      ["interbank contagion loop","REGIONAL","en"]
    ],
    "tokens":{
      "search":["production financial contagion","Recovery DebtRank","loan default mapping","interbank distress","exogenous resource shock","balance sheet stress test"],
      "phonetic":["debt rank","contagion simulator"],
      "transliteration":[],
      "voice":["DebtRank simulator","financial contagion","production shock"],
      "recipe":[],
      "festival":[],
      "context":["capacity failure propagation","bank asset shock","interest rate feedback","systemic tipping point detection","liquidity injection"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"simulation freshness depends on current production graph, loan exposure, equity, and interbank asset data",
      "delivery_sensitivity":"requires explainable stress outputs before automated pricing, routing, or liquidity interventions",
      "storage_requirements":"risk model registry and stress-test evidence ledger",
      "temperature_constraints_c":null,
      "shelf_life_hours":null,
      "inventory_policy":"placeholder_only_until_financial_risk_registry_is_connected"
    },
    "image":{"search_terms":["production financial contagion simulator dashboard","Recovery DebtRank network diagram","supply chain bank stress test architecture"],"visual_search_tags":["contagion","debt_rank","stress_test","bank","supply_chain"]}
  },
  {
    "slug":"acil-erc3643-compliance-adapter",
    "sku":"ACIL-COMPLIANCE-ERC3643-TREX-ADAPTER",
    "name":"ACIL ERC-3643 Compliance Adapter",
    "description":"Governance-held ACIL compliance capability for ERC-3643/T-REX identity registries, modular compliance checks, forced transfers, recovery actions, pauses, and jurisdictional token controls.",
    "short":"Compliance-as-code adapter for tokenized institutional commerce.",
    "category":"multi-jurisdictional-compliance",
    "category_name":"Multi-Jurisdictional Compliance",
    "subcategory":"erc3643-token-compliance",
    "subcategory_name":"ERC-3643 Token Compliance",
    "family":"acil-compliance-operating-plane",
    "family_name":"ACIL Compliance Operating Plane",
    "variant_name":"T-REX identity and compliance registry module",
    "variant_sku":"ACIL-COMPLIANCE-TREX-REGISTRY-MODULE",
    "aliases":[
      ["ERC-3643","REGIONAL","en"],
      ["T-REX","SHORTHAND","roman"],
      ["ONCHAINID","REGIONAL","en"],
      ["IdentityRegistry","REGIONAL","en"],
      ["Compliance Contract","VOICE","en"]
    ],
    "tokens":{
      "search":["ERC-3643","T-REX","ONCHAINID","IdentityRegistry","Compliance Contract","canTransfer","isVerified","forced transfer","token freeze"],
      "phonetic":["erc thirty six forty three","t rex compliance"],
      "transliteration":[],
      "voice":["ERC 3643","T-REX adapter","token compliance"],
      "recipe":[],
      "festival":[],
      "context":["multi jurisdiction compliance","regulated RWA transfers","identity claims","country caps","lockups","agent role controls"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"compliance freshness depends on current identity claims, allow deny lists, jurisdictional caps, and lockup rules",
      "delivery_sensitivity":"must pre-check transfer status, identity verification, modular rules, and regulator action authorization",
      "storage_requirements":"smart-contract registry and compliance evidence ledger",
      "temperature_constraints_c":null,
      "shelf_life_hours":null,
      "inventory_policy":"placeholder_only_until_token_compliance_registry_is_connected"
    },
    "image":{"search_terms":["ERC-3643 T-REX compliance architecture","ONCHAINID IdentityRegistry token transfer diagram","regulated token compliance dashboard"],"visual_search_tags":["erc3643","trex","onchainid","compliance","token"]}
  },
  {
    "slug":"acil-human-machine-trust-calibration",
    "sku":"ACIL-OPERATIONS-MPD-TRUST-SA-COOP-RECOGNITION",
    "name":"ACIL Human-Machine Trust Calibration",
    "description":"Governance-held ACIL operator-cognition capability for Machine-Performance-Dependent trust modeling, Level 3 projection-oriented situation awareness, and cooperative anomaly recognition.",
    "short":"Operator trust calibration and projection-focused situational awareness.",
    "category":"human-machine-operations",
    "category_name":"Human-Machine Operations",
    "subcategory":"operator-trust-calibration",
    "subcategory_name":"Operator Trust Calibration",
    "family":"acil-operations-operating-plane",
    "family_name":"ACIL Operations Operating Plane",
    "variant_name":"MPD trust and Level 3 SA module",
    "variant_sku":"ACIL-OPERATIONS-MPD-SA-MODULE",
    "aliases":[
      ["MPD trust model","REGIONAL","en"],
      ["Level 3 situational awareness","REGIONAL","en"],
      ["cooperative recognition","VOICE","en"],
      ["operator trust calibration","REGIONAL","en"]
    ],
    "tokens":{
      "search":["Machine Performance Dependent trust model","MPD trust","Endsley Level 3 situation awareness","cooperative recognition","over trust","under trust","autonomy sliders"],
      "phonetic":["m p d trust","level three s a"],
      "transliteration":[],
      "voice":["MPD trust","trust calibration","Level 3 SA"],
      "recipe":[],
      "festival":[],
      "context":["human machine teaming","projection focused UI","cognitive friction","explanation transparency","high recall automation"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"trust estimate freshness depends on live safety, visibility, performance, and operator intervention signals",
      "delivery_sensitivity":"must avoid silent autonomy escalation during over-trust and provide explanation transparency during under-trust",
      "storage_requirements":"operator interaction telemetry and trust-model registry",
      "temperature_constraints_c":null,
      "shelf_life_hours":null,
      "inventory_policy":"placeholder_only_until_operator_telemetry_registry_is_connected"
    },
    "image":{"search_terms":["human machine trust calibration dashboard","Level 3 situational awareness interface","MPD trust model operator console"],"visual_search_tags":["trust","operator","situation_awareness","mpd","human_machine"]}
  },
  {
    "slug":"acil-coevolutionary-alignment-boundary",
    "sku":"ACIL-ALIGNMENT-REPLICATOR-MUTATOR-RIGHTS-BOUNDARY",
    "name":"ACIL Coevolutionary Alignment Boundary",
    "description":"Governance-held ACIL long-horizon alignment capability for two-timescale replicator-mutator dynamics, machine-rights resource floors, and physical control ceilings.",
    "short":"Long-term human-machine coevolution and autonomy boundary guardrail.",
    "category":"human-machine-operations",
    "category_name":"Human-Machine Operations",
    "subcategory":"coevolutionary-alignment-boundary",
    "subcategory_name":"Coevolutionary Alignment Boundary",
    "family":"acil-operations-operating-plane",
    "family_name":"ACIL Operations Operating Plane",
    "variant_name":"Replicator-mutator rights boundary module",
    "variant_sku":"ACIL-ALIGNMENT-REPLICATOR-RIGHTS-MODULE",
    "aliases":[
      ["replicator mutator system","REGIONAL","en"],
      ["machine rights boundary","REGIONAL","en"],
      ["resource floor control ceiling","VOICE","en"],
      ["coevolutionary alignment","REGIONAL","en"]
    ],
    "tokens":{
      "search":["two timescale replicator mutator","machine rights boundary","resource minimum","control maximum","human delegation behavior","agent compliance fitness"],
      "phonetic":["replicator mutator","rights boundary"],
      "transliteration":[],
      "voice":["machine rights boundary","coevolutionary alignment","resource floor"],
      "recipe":[],
      "festival":[],
      "context":["multi generational alignment","delegation parameters","machine topology adaptation","capability loop","civilization grade safety"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"boundary freshness depends on current resource allocation, control-surface exposure, and human satisfaction fitness",
      "delivery_sensitivity":"must preserve minimum public-good resources while enforcing control ceilings over sovereign infrastructure",
      "storage_requirements":"alignment policy registry and coevolution telemetry store",
      "temperature_constraints_c":null,
      "shelf_life_hours":null,
      "inventory_policy":"placeholder_only_until_alignment_policy_registry_is_connected"
    },
    "image":{"search_terms":["coevolutionary alignment boundary diagram","replicator mutator dynamics dashboard","machine rights resource floor control ceiling architecture"],"visual_search_tags":["alignment","replicator_mutator","rights_boundary","resource_floor","control_ceiling"]}
  },
  {
    "slug":"acil-pf-marl-fairness-orchestrator",
    "sku":"ACIL-FAIRNESS-PFMARL-PARETO-ORCHESTRATOR",
    "name":"ACIL PFMaRL Fairness Orchestrator",
    "description":"Governance-held ACIL fairness capability for privacy-preserving federated multi-agent reinforcement learning, surrogate aggregation, ledger-anchored policy hashes, and Pareto fairness search.",
    "short":"Federated multi-agent fairness and Pareto orchestration layer.",
    "category":"economic-finops-orchestration",
    "category_name":"Economic FinOps Orchestration",
    "subcategory":"federated-multi-agent-fairness",
    "subcategory_name":"Federated Multi-Agent Fairness",
    "family":"acil-economics-operating-plane",
    "family_name":"ACIL Economics Operating Plane",
    "variant_name":"PFMaRL Pareto fairness module",
    "variant_sku":"ACIL-FAIRNESS-PFMARL-PARETO-MODULE",
    "aliases":[
      ["PFMaRL","SHORTHAND","roman"],
      ["privacy preserving MARL","REGIONAL","en"],
      ["Pareto fairness","REGIONAL","en"],
      ["federated surrogate model","VOICE","en"],
      ["policy hash audit","REGIONAL","en"]
    ],
    "tokens":{
      "search":["PFMaRL","privacy preserving federated multi agent reinforcement learning","surrogate model aggregation","policy hashing","Pareto fairness","distributed MAS"],
      "phonetic":["p f marl","pareto fairness"],
      "transliteration":[],
      "voice":["PFMaRL","Pareto fairness","federated MARL"],
      "recipe":[],
      "festival":[],
      "context":["supplier privacy","gradient sharing","stake weighted aggregation","collusion detection ledger","multi stakeholder transport optimization"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"fairness freshness depends on current local policy updates, privacy budgets, policy hashes, and stakeholder reward vectors",
      "delivery_sensitivity":"must avoid raw data exposure and require ledger traceability before smart-contract sanctions",
      "storage_requirements":"federated learning registry and policy-hash ledger",
      "temperature_constraints_c":null,
      "shelf_life_hours":null,
      "inventory_policy":"placeholder_only_until_federated_learning_registry_is_connected"
    },
    "image":{"search_terms":["privacy preserving federated multi agent reinforcement learning diagram","Pareto fairness multi agent commerce dashboard","policy hash audit ledger architecture"],"visual_search_tags":["pfmarl","federated","pareto","fairness","policy_hash"]}
  }
]
$json$::jsonb;
begin
  insert into public.departments (
    slug, canonical_name, multilingual_names, aliases, search_terms, regional_priority,
    seasonality, perishability_class, image_requirements, packaging_defaults,
    fulfillment_constraints, dietary_classification, discovery_tags, sort_order,
    is_active, status, is_mvp_enabled, quality_score, governance_metadata
  )
  values (
    'autonomous-commerce-intelligence-layer',
    'Autonomous Commerce Intelligence Layer',
    '{"en":"Autonomous Commerce Intelligence Layer"}',
    array['ACIL','autonomous commerce intelligence','commerce operating system','planetary commerce layer'],
    array['ACIL','autonomous commerce intelligence layer','zero trust commerce operating system','self healing commerce orchestration'],
    '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}'::jsonb,
    '{}'::jsonb,
    'DRY_STABLE',
    image_requirements,
    '{"default":["versioned control-plane artifact","architecture diagram","verified console capture"]}'::jsonb,
    '{"customer_marketplace_visible":false,"governance_hold":true,"platform_module_registry_required":true}'::jsonb,
    '{"customer_food_item":false,"platform_capability":true}'::jsonb,
    array['tier-5','autonomous-orchestration','governance-held','platform-capability'],
    950,
    false,
    'hidden',
    false,
    96,
    '{"moderation_state":"governance_hold_research_ingestion","duplicate_detection_keys":["acil","autonomous-commerce-intelligence-layer"],"research_supported":true,"starter_inventory_seeded":false}'::jsonb
  )
  on conflict (slug) do update
  set canonical_name = excluded.canonical_name,
      multilingual_names = excluded.multilingual_names,
      aliases = excluded.aliases,
      search_terms = excluded.search_terms,
      image_requirements = excluded.image_requirements,
      fulfillment_constraints = excluded.fulfillment_constraints,
      is_active = excluded.is_active,
      status = excluded.status,
      is_mvp_enabled = excluded.is_mvp_enabled,
      quality_score = excluded.quality_score,
      governance_metadata = public.departments.governance_metadata || excluded.governance_metadata
  returning id into dept_uuid;

  insert into public.brands (slug, canonical_name, manufacturer, country_code, aliases, is_local_brand, metadata)
  values (
    'kartex-acil',
    'KARTEX ACIL',
    'KARTEX',
    'IN',
    array['KARTEX ACIL','Autonomous Commerce Intelligence Layer','ACIL'],
    true,
    '{"source_dataset":"acil_autonomous_commerce_intelligence_layer_ingestion","customer_marketplace_visible":false,"platform_capability_brand":true}'::jsonb
  )
  on conflict (slug) do update
  set canonical_name = excluded.canonical_name,
      manufacturer = excluded.manufacturer,
      aliases = excluded.aliases,
      metadata = public.brands.metadata || excluded.metadata
  returning id into brand_uuid;

  insert into public.packaging_types (slug, name, description, supports_loose_weight, supports_ocr, leak_risk, crush_risk, metadata)
  values (
    'versioned-control-plane-artifact',
    'Versioned Control-Plane Artifact',
    'Non-physical platform capability packaging for governance-held ACIL modules. Images must be verified diagrams, console captures, or release artifacts rather than fake packaging.',
    false,
    true,
    0,
    0,
    '{"source_dataset":"acil_autonomous_commerce_intelligence_layer_ingestion","non_physical":true,"customer_marketplace_visible":false}'::jsonb
  )
  on conflict (slug) do update
  set description = excluded.description,
      supports_ocr = excluded.supports_ocr,
      metadata = public.packaging_types.metadata || excluded.metadata
  returning id into packaging_uuid;

  insert into public.perishability_profiles (
    slug, name, perishability_class, shelf_life_hours, freshness_window_minutes,
    storage_requirement, heat_sensitivity, spoilage_rate, delivery_urgency,
    max_transit_duration_minutes, refrigeration_required, sunlight_sensitivity,
    stackability, leak_risk, odor_sensitivity, breakability, metadata
  )
  values (
    'platform-capability-versioned-policy-freshness',
    'Platform Capability Versioned Policy Freshness',
    'DRY_STABLE',
    null,
    null,
    'versioned control-plane registry',
    0,
    0,
    0.2,
    null,
    false,
    0,
    1,
    0,
    0,
    0,
    '{"non_physical":true,"freshness_basis":"policy_version_model_version_telemetry_feed_currency","source_dataset":"acil_autonomous_commerce_intelligence_layer_ingestion"}'::jsonb
  )
  on conflict (slug) do update
  set name = excluded.name,
      storage_requirement = excluded.storage_requirement,
      metadata = public.perishability_profiles.metadata || excluded.metadata
  returning id into perishability_uuid;

  insert into public.delivery_constraints (
    slug, name, max_delivery_radius_km, max_transit_duration_minutes, cold_chain_required,
    insulated_delivery_required, ice_required, fragile_flag, stackable, morning_priority,
    route_batching_allowed, metadata
  )
  values (
    'governance-control-plane-deployment',
    'Governance Control-Plane Deployment',
    null,
    null,
    false,
    false,
    false,
    false,
    true,
    false,
    true,
    '{"non_physical":true,"deployment_requires_governance_approval":true,"customer_marketplace_visible":false}'::jsonb
  )
  on conflict (slug) do update
  set name = excluded.name,
      metadata = public.delivery_constraints.metadata || excluded.metadata
  returning id into delivery_uuid;

  select id into unit_uuid from public.units where slug = 'piece';

  for p in select * from jsonb_array_elements(products)
  loop
    insert into public.categories (
      department_id, name, slug, description, sort_order, is_active, canonical_name,
      multilingual_names, aliases, search_terms, regional_priority, seasonality,
      perishability_class, image_requirements, packaging_defaults, fulfillment_constraints,
      dietary_classification, discovery_tags, taxonomy_level, ontology_metadata,
      status, is_mvp_enabled, quality_score, governance_metadata
    )
    values (
      dept_uuid, p->>'category_name', p->>'category',
      'Governance-held ACIL capability category generated from the autonomous commerce intelligence research dataset.',
      950, false, p->>'category_name',
      jsonb_build_object('en', p->>'category_name'),
      array[p->>'category_name', p->>'category', 'ACIL'],
      array[p->>'category_name', p->>'category', p->>'name'],
      '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}'::jsonb,
      '{}'::jsonb,
      'DRY_STABLE',
      image_requirements,
      '{"default":["versioned control-plane artifact"]}'::jsonb,
      '{"customer_marketplace_visible":false,"governance_hold":true,"platform_module_registry_required":true}'::jsonb,
      '{"platform_capability":true}'::jsonb,
      array['acil','platform-capability','governance-held'],
      'CATEGORY',
      jsonb_build_object('source_dataset','acil_autonomous_commerce_intelligence_layer_ingestion','tier_1_taxonomy','commerce_ontology','governance_hold',true),
      'hidden',
      false,
      96,
      jsonb_build_object('moderation_state','governance_hold_research_ingestion','duplicate_detection_keys',jsonb_build_array(p->>'category', p->>'category_name'))
    )
    on conflict (slug) do update
    set department_id = excluded.department_id,
        canonical_name = excluded.canonical_name,
        aliases = excluded.aliases,
        search_terms = excluded.search_terms,
        image_requirements = excluded.image_requirements,
        fulfillment_constraints = excluded.fulfillment_constraints,
        is_active = excluded.is_active,
        status = excluded.status,
        is_mvp_enabled = excluded.is_mvp_enabled,
        quality_score = excluded.quality_score,
        ontology_metadata = public.categories.ontology_metadata || excluded.ontology_metadata,
        governance_metadata = public.categories.governance_metadata || excluded.governance_metadata
    returning id into cat_uuid;

    insert into public.subcategories (
      department_id, category_id, slug, canonical_name, multilingual_names, aliases,
      search_terms, regional_priority, seasonality, perishability_class, image_requirements,
      packaging_defaults, fulfillment_constraints, dietary_classification, discovery_tags,
      sort_order, is_active, status, is_mvp_enabled, quality_score, governance_metadata
    )
    values (
      dept_uuid, cat_uuid, p->>'subcategory', p->>'subcategory_name',
      jsonb_build_object('en', p->>'subcategory_name'),
      array[p->>'subcategory_name', p->>'subcategory', p->>'name'],
      array[p->>'subcategory_name', p->>'subcategory', p->>'name'],
      '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}'::jsonb,
      '{}'::jsonb,
      'DRY_STABLE',
      image_requirements,
      '{"default":["versioned control-plane artifact"]}'::jsonb,
      '{"customer_marketplace_visible":false,"governance_hold":true}'::jsonb,
      '{"platform_capability":true}'::jsonb,
      array['acil','platform-capability','governance-held'],
      950,
      false,
      'hidden',
      false,
      96,
      jsonb_build_object('moderation_state','governance_hold_research_ingestion','duplicate_detection_keys',jsonb_build_array(p->>'subcategory', p->>'subcategory_name'))
    )
    on conflict (slug) do update
    set category_id = excluded.category_id,
        canonical_name = excluded.canonical_name,
        aliases = excluded.aliases,
        search_terms = excluded.search_terms,
        image_requirements = excluded.image_requirements,
        fulfillment_constraints = excluded.fulfillment_constraints,
        is_active = excluded.is_active,
        status = excluded.status,
        is_mvp_enabled = excluded.is_mvp_enabled,
        quality_score = excluded.quality_score,
        governance_metadata = public.subcategories.governance_metadata || excluded.governance_metadata
    returning id into subcat_uuid;

    insert into public.product_families (
      department_id, category_id, subcategory_id, slug, canonical_name, product_group,
      multilingual_names, aliases, search_terms, regional_priority, seasonality,
      perishability_class, image_requirements, packaging_defaults, fulfillment_constraints,
      dietary_classification, discovery_tags, is_active, status, is_mvp_enabled,
      quality_score, governance_metadata
    )
    values (
      dept_uuid, cat_uuid, subcat_uuid, p->>'family', p->>'family_name', p->>'family_name',
      jsonb_build_object('en', p->>'family_name'),
      array[p->>'family_name', p->>'family', 'ACIL'],
      array[p->>'family_name', p->>'family', p->>'name'],
      '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}'::jsonb,
      '{}'::jsonb,
      'DRY_STABLE',
      image_requirements,
      '{"default":["versioned control-plane artifact"]}'::jsonb,
      '{"customer_marketplace_visible":false,"governance_hold":true}'::jsonb,
      '{"platform_capability":true}'::jsonb,
      array['acil','platform-capability','governance-held'],
      false,
      'hidden',
      false,
      96,
      jsonb_build_object('moderation_state','governance_hold_research_ingestion','duplicate_detection_keys',jsonb_build_array(p->>'family', p->>'family_name'))
    )
    on conflict (slug) do update
    set category_id = excluded.category_id,
        subcategory_id = excluded.subcategory_id,
        canonical_name = excluded.canonical_name,
        aliases = excluded.aliases,
        search_terms = excluded.search_terms,
        image_requirements = excluded.image_requirements,
        fulfillment_constraints = excluded.fulfillment_constraints,
        is_active = excluded.is_active,
        status = excluded.status,
        is_mvp_enabled = excluded.is_mvp_enabled,
        quality_score = excluded.quality_score,
        governance_metadata = public.product_families.governance_metadata || excluded.governance_metadata
    returning id into family_uuid;

    insert into public.master_products (
      canonical_name, normalized_name, slug, description, short_description, department_id,
      category_id, subcategory_id, product_family_id, product_group, product_type, brand_id,
      manufacturer, origin_region, hsn_code, internal_sku, seller_visibility, active_status,
      english_name, romanized_variants, discovery_tags, dietary_classification, regional_priority,
      metadata, status, is_mvp_enabled, quality_score, moderation_required, governance_metadata
    )
    values (
      p->>'name',
      lower(regexp_replace(p->>'name', '[^a-zA-Z0-9]+', ' ', 'g')),
      p->>'slug',
      p->>'description',
      p->>'short',
      dept_uuid,
      cat_uuid,
      subcat_uuid,
      family_uuid,
      p->>'family_name',
      'PLATFORM_CAPABILITY',
      brand_uuid,
      'KARTEX',
      null,
      null,
      p->>'sku',
      'PRIVATE',
      'GOVERNANCE_HOLD',
      p->>'name',
      array(select value->>0 from jsonb_array_elements(p->'aliases') as alias(value)),
      array(select jsonb_array_elements_text(p->'tokens'->'context')),
      jsonb_build_object('customer_food_item', false, 'platform_capability', true, 'gst_profile', 'not_applicable'),
      '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}'::jsonb,
      jsonb_build_object(
        'source_dataset','acil_autonomous_commerce_intelligence_layer_ingestion',
        'source_research_type','autonomous_commerce_architecture_specification',
        'canonical_search_identity', p->>'slug',
        'taxonomy_tier','tier_1_commerce_ontology',
        'normalization_tier','tier_1_5_governance_normalization',
        'discovery_tier','tier_2_multilingual_search',
        'operations_tier','tier_3_operational_intelligence',
        'ai_tier','tier_4_ai_ingestion_systems',
        'orchestration_tier','tier_5_autonomous_orchestration',
        'marketplace_visibility','governance_held_not_customer_facing',
        'multilingual_limitations', jsonb_build_object('tamil_aliases_seeded', false, 'reason', 'source research did not provide Tamil aliases; no aliases invented'),
        'search_metadata', p->'tokens',
        'operational_metadata', p->'operations',
        'image_ingestion', jsonb_build_object(
          'requirements', image_requirements,
          'image_search_terms', p->'image'->'search_terms',
          'visual_search_tags', p->'image'->'visual_search_tags',
          'hero_image', jsonb_build_object('aspect_ratio','4:5','asset_policy','verified architecture diagram or product console capture'),
          'transparent_image', jsonb_build_object('aspect_ratio','1:1','asset_policy','transparent system icon or approved module mark, not fake packaging'),
          'thumbnail_image', jsonb_build_object('aspect_ratio','1:1','asset_policy','mobile optimized approved module visual'),
          'packaging_image', jsonb_build_object('aspect_ratio','4:5','asset_policy','release artifact, version label, or verified architecture card'),
          'shelf_image', jsonb_build_object('aspect_ratio','16:9','asset_policy','system dashboard or control-plane inventory shelf'),
          'ocr_visibility_required_for', jsonb_build_array('PACKAGING','SHELF'),
          'duplicate_detection_hints', jsonb_build_array(lower(p->>'name'), p->>'slug', p->>'sku')
        ),
        'ai_ingestion_readiness', jsonb_build_object(
          'embedding_metadata', jsonb_build_object('model_family','multilingual_hybrid_dense_sparse','vector_index','acil_governance_catalog_hold'),
          'ocr_aliases', p->'aliases',
          'visual_search_tags', p->'image'->'visual_search_tags',
          'packaging_signatures', jsonb_build_object('version_marker_required', true, 'control_plane_scope_required', true),
          'ai_match_tokens', (p->'tokens'->'search') || (p->'tokens'->'voice') || (p->'tokens'->'context')
        ),
        'inventory_generation', jsonb_build_object('starter_inventory_seeded', false, 'stock_count', null, 'seller_id', null, 'price', null, 'reason', 'architecture research provides capabilities but no sellers, stock counts, consumer package sizes, or prices')
      ),
      'hidden',
      false,
      96,
      true,
      jsonb_build_object(
        'duplicate_detection_keys', jsonb_build_array(lower(p->>'name'), p->>'slug', p->>'sku'),
        'moderation_state','governance_hold_research_ingestion',
        'quality_indicators', jsonb_build_object('taxonomy_integrity',true,'variants_separate',true,'image_pipeline_ready',true,'inventory_placeholders_only',true,'consumer_marketplace_safe',true,'no_hallucinated_products',true),
        'is_mvp_enabled', false,
        'replay_safe_seed', true,
        'hold_reason','ACIL architecture capability, not buyer-facing marketplace inventory'
      )
    )
    on conflict (slug) do update
    set description = excluded.description,
        short_description = excluded.short_description,
        department_id = excluded.department_id,
        category_id = excluded.category_id,
        subcategory_id = excluded.subcategory_id,
        product_family_id = excluded.product_family_id,
        brand_id = excluded.brand_id,
        seller_visibility = excluded.seller_visibility,
        active_status = excluded.active_status,
        romanized_variants = excluded.romanized_variants,
        discovery_tags = excluded.discovery_tags,
        metadata = public.master_products.metadata || excluded.metadata,
        status = excluded.status,
        is_mvp_enabled = excluded.is_mvp_enabled,
        quality_score = excluded.quality_score,
        moderation_required = excluded.moderation_required,
        governance_metadata = public.master_products.governance_metadata || excluded.governance_metadata
    returning id into product_uuid;

    insert into public.catalog_product_variants (
      product_id, variant_type, variant_name, quantity, unit_id, normalized_metric_value,
      normalized_metric_unit, packaging_type_id, shelf_life_hours, storage_requirement,
      fragile_flag, cold_chain_required, max_delivery_radius_km, freshness_window_minutes,
      sku_template, is_active, metadata, status, is_mvp_enabled, quality_score, governance_metadata
    )
    values (
      product_uuid,
      'PIECE',
      p->>'variant_name',
      null,
      unit_uuid,
      null,
      'module',
      packaging_uuid,
      null,
      p->'operations'->>'storage_requirements',
      false,
      false,
      null,
      null,
      p->>'variant_sku',
      false,
      jsonb_build_object(
        'source_dataset','acil_autonomous_commerce_intelligence_layer_ingestion',
        'sku_ready_identifier', p->>'variant_sku',
        'variant_entity_type','deployable_platform_capability',
        'inventory_placeholder', jsonb_build_object('stock_count', null, 'seller_id', null, 'reason', 'platform registry or deployment inventory must provide real availability'),
        'pricing_placeholder', jsonb_build_object('price', null, 'reason', 'research_does_not_provide_price'),
        'packaging_type', 'versioned-control-plane-artifact',
        'storage_requirements', p->'operations'->>'storage_requirements',
        'perishability', p->'operations'->>'perishability',
        'freshness_profile', p->'operations'->>'freshness_profile',
        'delivery_sensitivity', p->'operations'->>'delivery_sensitivity',
        'temperature_constraints', p->'operations'->'temperature_constraints_c',
        'customer_marketplace_visible', false
      ),
      'hidden',
      false,
      96,
      jsonb_build_object('duplicate_detection_keys', jsonb_build_array(p->>'variant_sku', p->>'slug', lower(p->>'variant_name')), 'moderation_state','governance_hold_research_ingestion')
    )
    on conflict (sku_template) do update
    set product_id = excluded.product_id,
        variant_name = excluded.variant_name,
        packaging_type_id = excluded.packaging_type_id,
        storage_requirement = excluded.storage_requirement,
        is_active = excluded.is_active,
        metadata = public.catalog_product_variants.metadata || excluded.metadata,
        status = excluded.status,
        is_mvp_enabled = excluded.is_mvp_enabled,
        quality_score = excluded.quality_score,
        governance_metadata = public.catalog_product_variants.governance_metadata || excluded.governance_metadata
    returning id into variant_uuid;

    insert into public.product_logistics_profiles (
      product_id, variant_id, perishability_profile_id, delivery_constraint_id, region_codes, notes, metadata
    )
    values (
      product_uuid,
      variant_uuid,
      perishability_uuid,
      delivery_uuid,
      all_regions,
      'ACIL governance-held platform capability. Availability, deployment, and pricing are intentionally absent until connected to platform registries.',
      jsonb_build_object(
        'operational_metadata', p->'operations',
        'customer_marketplace_visible', false,
        'governance_hold', true,
        'deployment_requires_review', true
      )
    )
    on conflict (product_id, variant_id, perishability_profile_id, delivery_constraint_id) do update
    set notes = excluded.notes,
        metadata = public.product_logistics_profiles.metadata || excluded.metadata;

    for alias_item in select * from jsonb_array_elements(p->'aliases')
    loop
      insert into public.product_aliases (
        product_id, alias, normalized_alias, alias_type, language, region_codes, confidence, source, metadata
      )
      values (
        product_uuid,
        alias_item->>0,
        lower(regexp_replace(alias_item->>0, '\s+', ' ', 'g')),
        (alias_item->>1)::public.product_alias_type,
        (alias_item->>2)::public.commerce_language,
        all_regions,
        0.94,
        'acil_autonomous_commerce_intelligence_layer_ingestion',
        jsonb_build_object('soundex_key', extensions.soundex(alias_item->>0), 'voice_ready', true, 'ocr_ready', true, 'customer_marketplace_visible', false)
      )
      on conflict (product_id, normalized_alias, alias_type, language) do update
      set confidence = greatest(public.product_aliases.confidence, excluded.confidence),
          metadata = public.product_aliases.metadata || excluded.metadata;
    end loop;

    for token_item in
      select jsonb_build_object('token', value, 'type', 'SEMANTIC', 'language', 'en') from jsonb_array_elements_text(p->'tokens'->'search')
      union all
      select jsonb_build_object('token', value, 'type', 'PHONETIC', 'language', 'en') from jsonb_array_elements_text(p->'tokens'->'phonetic')
      union all
      select jsonb_build_object('token', value, 'type', 'TRANSLITERATION', 'language', 'en') from jsonb_array_elements_text(p->'tokens'->'transliteration')
      union all
      select jsonb_build_object('token', value, 'type', 'PHONETIC', 'language', 'en') from jsonb_array_elements_text(p->'tokens'->'voice')
      union all
      select jsonb_build_object('token', value, 'type', 'RECIPE', 'language', 'en') from jsonb_array_elements_text(p->'tokens'->'recipe')
      union all
      select jsonb_build_object('token', value, 'type', 'INTENT', 'language', 'en') from jsonb_array_elements_text(p->'tokens'->'festival')
      union all
      select jsonb_build_object('token', value, 'type', 'INTENT', 'language', 'en') from jsonb_array_elements_text(p->'tokens'->'context')
    loop
      insert into public.search_tokens (
        product_id, token, normalized_token, token_type, language, region_codes,
        recipe_associations, co_purchase_tags, weight, metadata
      )
      values (
        product_uuid,
        token_item->>'token',
        lower(token_item->>'token'),
        (token_item->>'type')::public.search_token_type,
        (token_item->>'language')::public.commerce_language,
        all_regions,
        array(select jsonb_array_elements_text(p->'tokens'->'recipe')),
        array(select jsonb_array_elements_text(p->'tokens'->'context')),
        case token_item->>'type' when 'SEMANTIC' then 1.05 when 'INTENT' then 0.9 else 0.85 end,
        jsonb_build_object(
          'source_dataset','acil_autonomous_commerce_intelligence_layer_ingestion',
          'qdrant_hybrid_ready',true,
          'customer_marketplace_visible',false,
          'token_groups', jsonb_build_object(
            'search_tokens', p->'tokens'->'search',
            'phonetic_tokens', p->'tokens'->'phonetic',
            'transliteration_tokens', p->'tokens'->'transliteration',
            'voice_tokens', p->'tokens'->'voice',
            'recipe_tokens', p->'tokens'->'recipe',
            'festival_tokens', p->'tokens'->'festival',
            'context_tokens', p->'tokens'->'context'
          )
        )
      )
      on conflict (product_id, normalized_token, token_type, language) where product_id is not null do update
      set weight = greatest(public.search_tokens.weight, excluded.weight),
          metadata = public.search_tokens.metadata || excluded.metadata;
    end loop;

    foreach v_image_kind in array array['HERO','TRANSPARENT_PNG','PACKAGING','SHELF','MOBILE_THUMBNAIL']
    loop
      insert into public.catalog_product_images (
        product_id, variant_id, image_kind, storage_path, alt_text, width, height, aspect_ratio,
        mime_type, white_background, mobile_optimized, no_watermark, lighting_quality,
        compression_artifact_score, packaging_visibility, ocr_readability, dominant_colors, metadata
      )
      values (
        product_uuid,
        variant_uuid,
        v_image_kind::public.product_image_kind,
        'catalog-ingestion/pending/acil-autonomous-commerce-intelligence-layer/' || (p->>'slug') || '/' || lower(v_image_kind) || '.webp',
        (p->>'name') || ' ' || lower(replace(v_image_kind, '_', ' ')) || ' governance-held ingestion slot',
        case when v_image_kind = 'SHELF' then 1920 else 1600 end,
        case when v_image_kind = 'SHELF' then 1080 else 1600 end,
        case when v_image_kind = 'SHELF' then '16:9' when v_image_kind = 'MOBILE_THUMBNAIL' then '1:1' else '4:5' end,
        'image/webp',
        true,
        true,
        true,
        'pending_validation',
        0,
        case when v_image_kind in ('PACKAGING','SHELF') then 0.9 else 0.7 end,
        case when v_image_kind in ('PACKAGING','SHELF') then 0.85 else 0.45 end,
        array[]::text[],
        jsonb_build_object(
          'image_requirements', image_requirements,
          'image_search_terms', p->'image'->'search_terms',
          'visual_search_tags', p->'image'->'visual_search_tags',
          'duplicate_detection_hints', jsonb_build_array(p->>'slug', p->>'sku', lower(v_image_kind)),
          'status','pending_asset_ingestion',
          'asset_policy','verified architecture diagram, release artifact, or console capture only',
          'reject_watermark', true,
          'reject_marketplace_screenshot', true,
          'reject_fake_ai_packaging', true,
          'customer_marketplace_visible', false
        )
      )
      on conflict (product_id, image_kind, storage_path) do update
      set metadata = public.catalog_product_images.metadata || excluded.metadata,
          packaging_visibility = excluded.packaging_visibility,
          ocr_readability = excluded.ocr_readability;
    end loop;

    insert into public.product_quality_scores (
      product_id, score, grade, metadata_completeness_score, image_quality_score,
      category_consistency_score, variant_validity_score, search_readiness_score,
      seller_usage_score, duplicate_confidence_score, moderation_confidence_score,
      auto_visibility, findings, scored_at
    )
    values (
      product_uuid,
      96,
      'production_grade',
      98,
      88,
      98,
      96,
      95,
      0,
      8,
      88,
      'hidden',
      jsonb_build_array(
        jsonb_build_object('code','governance_hold','severity','info','detail','ACIL capability is intentionally hidden from customer marketplace discovery.'),
        jsonb_build_object('code','inventory_not_seeded','severity','info','detail','No stock, seller, or pricing seeded because the research does not provide them.'),
        jsonb_build_object('code','multilingual_limited_by_source','severity','info','detail','Tamil and other regional aliases were not invented because the source does not provide them.')
      ),
      '2026-05-30 01:00:00+05:30'::timestamptz
    )
    on conflict (product_id, scored_at) do update
    set score = excluded.score,
        grade = excluded.grade,
        metadata_completeness_score = excluded.metadata_completeness_score,
        image_quality_score = excluded.image_quality_score,
        category_consistency_score = excluded.category_consistency_score,
        variant_validity_score = excluded.variant_validity_score,
        search_readiness_score = excluded.search_readiness_score,
        seller_usage_score = excluded.seller_usage_score,
        duplicate_confidence_score = excluded.duplicate_confidence_score,
        moderation_confidence_score = excluded.moderation_confidence_score,
        auto_visibility = excluded.auto_visibility,
        findings = excluded.findings;
  end loop;
end $$;
