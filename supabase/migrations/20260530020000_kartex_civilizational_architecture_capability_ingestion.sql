create extension if not exists "pgcrypto";
create extension if not exists "fuzzystrmatch";

create unique index if not exists kartex_civilizational_capability_search_tokens_replay_idx
  on public.search_tokens(product_id, normalized_token, token_type, language)
  where product_id is not null;

create unique index if not exists kartex_civilizational_capability_images_replay_idx
  on public.catalog_product_images(product_id, image_kind, storage_path);

create unique index if not exists kartex_civilizational_capability_variants_replay_idx
  on public.catalog_product_variants(sku_template);

do $$
declare
  p jsonb;
  alias_item jsonb;
  token_item jsonb;
  image_kind text;
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
    "packaging_focus_areas":["architecture_label","attestation_chain","policy_version","control_plane_scope","evidence_marker"],
    "validation":{"background":"verified_architecture_diagram_or_control_plane_capture","duplicate_hash_required":true,"visual_embedding_required":true}
  }'::jsonb;
  products jsonb := $json$
[
  {
    "slug":"kartex-edge-wasm-tee-attestation-fabric",
    "sku":"KARTEX-EDGE-WASM-TEE-ATTESTATION",
    "name":"KARTEX Edge Wasm TEE Attestation Fabric",
    "description":"Governance-held platform capability for edge-native WebAssembly execution using WasmEdge, KubeEdge offline autonomy, hardware TEE reports, physical TPM roots, vTPM/vAIK chains, and reproducible enclave measurements.",
    "short":"Autonomous edge runtime and multi-root attestation fabric for sovereign commerce nodes.",
    "category":"edge-sovereign-compute",
    "category_name":"Edge Sovereign Compute",
    "subcategory":"wasm-tee-attestation",
    "subcategory_name":"Wasm TEE Attestation",
    "family":"civilizational-edge-runtime-plane",
    "family_name":"Civilizational Edge Runtime Plane",
    "variant_name":"WasmEdge KubeEdge CTPM attestation module",
    "variant_sku":"KARTEX-EDGE-WASM-TEE-ATTESTATION-MODULE",
    "aliases":[["WasmEdge runtime","REGIONAL","en"],["KubeEdge autonomy","REGIONAL","en"],["multi root attestation","VOICE","en"],["CTPM","SHORTHAND","roman"],["vAIK certificate chain","REGIONAL","en"]],
    "tokens":{"search":["WasmEdge","KubeEdge","TEE attestation","AMD SEV-SNP","Intel TDX","physical TPM","vTPM","vAIK","reproducible enclave measurement"],"phonetic":["wasm edge","cube edge","tee attestation"],"transliteration":[],"voice":["edge attestation","Wasm runtime","TPM chain"],"recipe":[],"festival":[],"context":["Tier 1 commerce ontology","Tier 1.5 governance normalization","offline edge autonomy","hostile sovereign territory","near zero cold start","multi root trust"]},
    "operations":{"perishability":"DRY_STABLE","freshness_profile":"attestation freshness depends on TPM quotes, TEE reports, vAIK certificates, and reproducible build measurements","delivery_sensitivity":"must fail closed on stale quote, invalid certificate chain, measurement mismatch, side-channel risk flag, or untrusted Privacy CA","storage_requirements":"secure attestation evidence registry and versioned enclave artifact store","temperature_constraints_c":null,"shelf_life_hours":null,"inventory_policy":"placeholder_only_until_edge_node_registry_is_connected"},
    "image":{"search_terms":["WasmEdge KubeEdge TEE attestation architecture diagram","TPM vTPM vAIK certificate chain diagram","confidential VM attestation flow"],"visual_search_tags":["wasmedge","kubeedge","tee","tpm","vtpm","attestation"]}
  },
  {
    "slug":"kartex-numa-rdma-topology-scheduler",
    "sku":"KARTEX-INFRA-NUMA-RDMA-TOPOLOGY-SCHEDULER",
    "name":"KARTEX NUMA RDMA Topology Scheduler",
    "description":"Governance-held scheduling capability for NUMA and network topology-aware GPU/NIC co-allocation using Volcano, Kubernetes DRA, NVML GPU-to-NUMA discovery, DRANET ResourceSlices, CEL ResourceClaims, NRI injection, and NCCL InfiniBand constraints.",
    "short":"NUMA-local GPU, NIC, and RDMA scheduling layer for high-throughput edge workloads.",
    "category":"edge-sovereign-compute",
    "category_name":"Edge Sovereign Compute",
    "subcategory":"numa-rdma-scheduling",
    "subcategory_name":"NUMA RDMA Scheduling",
    "family":"civilizational-edge-runtime-plane",
    "family_name":"Civilizational Edge Runtime Plane",
    "variant_name":"Volcano DRA DRANET topology module",
    "variant_sku":"KARTEX-INFRA-NUMA-RDMA-SCHEDULER-MODULE",
    "aliases":[["Volcano scheduler","REGIONAL","en"],["Kubernetes DRA","REGIONAL","en"],["DRANET ResourceSlices","REGIONAL","en"],["NUMA local NIC","VOICE","en"],["NCCL InfiniBand path","REGIONAL","en"]],
    "tokens":{"search":["NUMA scheduling","RDMA co-allocation","Volcano scheduler","Kubernetes DRA","NVML topology","DRANET","ResourceSlices","NRI","NCCL_IB_DISABLE","NCCL_SHM_DISABLE"],"phonetic":["numa rdma","volcano scheduler"],"transliteration":[],"voice":["NUMA scheduler","RDMA scheduler","InfiniBand path"],"recipe":[],"festival":[],"context":["Tier 3 operational intelligence","Tier 5 autonomous orchestration","GPU to NUMA mapping","NIC co allocation","pure InfiniBand collective traffic","low latency scientific processing"]},
    "operations":{"perishability":"DRY_STABLE","freshness_profile":"topology freshness depends on live NVML, NIC, DRA ResourceSlice, and node-local hardware reports","delivery_sensitivity":"requires topology replay, CEL selector validation, RDMA device injection audit, and NCCL isolation checks before placement","storage_requirements":"scheduler policy registry and node topology cache","temperature_constraints_c":null,"shelf_life_hours":null,"inventory_policy":"placeholder_only_until_cluster_capacity_registry_is_connected"},
    "image":{"search_terms":["NUMA GPU NIC RDMA topology scheduling diagram","Kubernetes DRA ResourceSlice GPU NIC co allocation","Volcano DRANET scheduler architecture"],"visual_search_tags":["numa","rdma","dra","volcano","dranet","gpu_nic"]}
  },
  {
    "slug":"kartex-combinatorial-resource-market-engine",
    "sku":"KARTEX-MARKET-VCG-XOS-RESOURCE-AUCTION",
    "name":"KARTEX Combinatorial Resource Market Engine",
    "description":"Governance-held computational market capability for interdependent resource allocation using combinatorial reverse auctions, VCG pricing with Clarke pivot rule, and order-oblivious posted prices with 2-approximation for XOS valuations.",
    "short":"Strategy-proof resource auction and posted-price engine for edge capacity bundles.",
    "category":"civilizational-market-microstructure",
    "category_name":"Civilizational Market Microstructure",
    "subcategory":"combinatorial-resource-auctions",
    "subcategory_name":"Combinatorial Resource Auctions",
    "family":"strategy-proof-commerce-allocation-plane",
    "family_name":"Strategy-Proof Commerce Allocation Plane",
    "variant_name":"VCG XOS posted-price allocation module",
    "variant_sku":"KARTEX-MARKET-VCG-XOS-AUCTION-MODULE",
    "aliases":[["VCG auction","REGIONAL","en"],["Clarke pivot rule","REGIONAL","en"],["posted price mechanism","VOICE","en"],["XOS valuation","REGIONAL","en"],["combinatorial reverse auction","REGIONAL","en"]],
    "tokens":{"search":["VCG","Clarke pivot","combinatorial reverse auction","posted price mechanism","XOS valuations","strategy proof allocation","GPU NIC memory bundle"],"phonetic":["v c g auction","clarke pivot"],"transliteration":[],"voice":["VCG auction","posted price","resource auction"],"recipe":[],"festival":[],"context":["Tier 1 commerce ontology","Tier 5 autonomous orchestration","interdependent resources","truthful bidding","2 approximation welfare","order oblivious edge transactions"]},
    "operations":{"perishability":"DRY_STABLE","freshness_profile":"market freshness depends on active resource graph, feasible allocations, bidder reports, and posted-price schedule version","delivery_sensitivity":"requires anti-collusion audit, allocation replay, welfare bound validation, and price provenance before activation","storage_requirements":"market mechanism registry and bid audit ledger","temperature_constraints_c":null,"shelf_life_hours":null,"inventory_policy":"placeholder_only_until_resource_supply_registry_is_connected"},
    "image":{"search_terms":["VCG combinatorial auction resource allocation diagram","Clarke pivot pricing mechanism diagram","XOS posted price allocation dashboard"],"visual_search_tags":["vcg","auction","posted_price","xos","resource_bundle"]}
  },
  {
    "slug":"kartex-policy-to-tests-ontology-compiler",
    "sku":"KARTEX-GOVERNANCE-POLICY-TO-TESTS-OWL-MOF",
    "name":"KARTEX Policy-to-Tests Ontology Compiler",
    "description":"Governance-held policy capability for compiling natural-language covenants into machine-readable MOF and OWL policy graphs with provenance, scope, hazards, requirements, evidence signals, and verification tests.",
    "short":"Constitutional policy graph compiler with provenance and testability metadata.",
    "category":"intergenerational-governance",
    "category_name":"Intergenerational Governance",
    "subcategory":"policy-ontology-compilation",
    "subcategory_name":"Policy Ontology Compilation",
    "family":"civilizational-policy-persistence-plane",
    "family_name":"Civilizational Policy Persistence Plane",
    "variant_name":"MOF OWL policy-to-tests compiler module",
    "variant_sku":"KARTEX-GOVERNANCE-POLICY-TO-TESTS-COMPILER",
    "aliases":[["Policy to Tests DSL","REGIONAL","en"],["MOF ontology","REGIONAL","en"],["OWL policy graph","REGIONAL","en"],["machine readable covenant","VOICE","en"],["rule provenance span","REGIONAL","en"]],
    "tokens":{"search":["Policy-to-Tests DSL","MOF","OWL","policy graph","rule_id","span_id","provenance tracking","evidence signals","usage control policy"],"phonetic":["policy to tests","o w l ontology"],"transliteration":[],"voice":["policy compiler","OWL policy graph","covenant compiler"],"recipe":[],"festival":[],"context":["Tier 1.5 governance normalization","civilizational law persistence","data space connector metadata","linguistic drift prevention","machine executable rules"]},
    "operations":{"perishability":"DRY_STABLE","freshness_profile":"policy freshness depends on active covenant version, source spans, evidence schema, and compiled test bundle","delivery_sensitivity":"must reject unverifiable clauses, missing provenance, ambiguous scope, or stale ontology mappings","storage_requirements":"versioned constitutional policy registry and evidence schema store","temperature_constraints_c":null,"shelf_life_hours":null,"inventory_policy":"placeholder_only_until_governance_policy_registry_is_connected"},
    "image":{"search_terms":["policy to tests DSL ontology compiler diagram","MOF OWL covenant policy graph","machine readable governance rules dashboard"],"visual_search_tags":["policy_dsl","owl","mof","covenant","provenance"]}
  },
  {
    "slug":"kartex-belief-distribution-resilience-engine",
    "sku":"KARTEX-EPISTEMIC-FJ-SIGNED-GRAPH-RESILIENCE",
    "name":"KARTEX Belief Distribution Resilience Engine",
    "description":"Governance-held social-cohesion capability for generalized Friedkin-Johnsen opinion dynamics on signed directed graphs, resolvent and spectral steady-state analysis, and sublinear random-walk approximation of global disagreement.",
    "short":"Signed-graph opinion dynamics engine for polarization and manipulation resilience.",
    "category":"intergenerational-governance",
    "category_name":"Intergenerational Governance",
    "subcategory":"belief-dynamics-resilience",
    "subcategory_name":"Belief Dynamics Resilience",
    "family":"civilizational-policy-persistence-plane",
    "family_name":"Civilizational Policy Persistence Plane",
    "variant_name":"FJ signed-graph disagreement approximation module",
    "variant_sku":"KARTEX-EPISTEMIC-FJ-SIGNED-GRAPH-MODULE",
    "aliases":[["Friedkin Johnsen model","REGIONAL","en"],["FJ opinion dynamics","SHORTHAND","roman"],["signed directed graph","REGIONAL","en"],["sublinear random walk","VOICE","en"],["polarization dampening","REGIONAL","en"]],
    "tokens":{"search":["Friedkin-Johnsen","signed directed graph","belief distribution","stubborn boundary nodes","susceptible interior nodes","resolvent method","spectral method","sublinear random walks"],"phonetic":["friedkin johnsen","f j model"],"transliteration":[],"voice":["FJ model","belief graph","polarization monitor"],"recipe":[],"festival":[],"context":["Tier 4 AI ingestion systems","adversarial cognitive manipulation","social cohesion","global opinion disagreement","targeted informational dampening"]},
    "operations":{"perishability":"DRY_STABLE","freshness_profile":"model freshness depends on current signed graph edges, external media signals, stubbornness parameters, and disagreement estimates","delivery_sensitivity":"requires privacy-preserving aggregation, manipulation evidence, and intervention audit before dampening actions","storage_requirements":"epistemic telemetry registry and signed graph evidence store","temperature_constraints_c":null,"shelf_life_hours":null,"inventory_policy":"placeholder_only_until_epistemic_signal_registry_is_connected"},
    "image":{"search_terms":["Friedkin Johnsen signed graph opinion dynamics diagram","belief distribution polarization dashboard","sublinear random walk disagreement approximation"],"visual_search_tags":["fj_model","belief_graph","signed_graph","polarization","random_walk"]}
  },
  {
    "slug":"kartex-autonomous-science-proof-gate",
    "sku":"KARTEX-SCIENCE-TLAPS-RAG-PROOF-GATE",
    "name":"KARTEX Autonomous Science Proof Gate",
    "description":"Governance-held autonomous science capability for externally anchored recursive knowledge generation, model-collapse prevention, evolutionary knowledge graphs, and TLAPS-backed proof obligations preserving TypeOK, Inv, and Next invariants.",
    "short":"Formal proof gate for autonomous scientific and code updates.",
    "category":"autonomous-knowledge-generation",
    "category_name":"Autonomous Knowledge Generation",
    "subcategory":"formal-proof-science-gates",
    "subcategory_name":"Formal Proof Science Gates",
    "family":"externally-anchored-research-plane",
    "family_name":"Externally Anchored Research Plane",
    "variant_name":"TLAPS RAG invariant proof module",
    "variant_sku":"KARTEX-SCIENCE-TLAPS-RAG-PROOF-MODULE",
    "aliases":[["TLAPS","SHORTHAND","roman"],["TLA+ proof system","REGIONAL","en"],["TypeOK invariant","REGIONAL","en"],["externally anchored optimization","VOICE","en"],["model collapse prevention","REGIONAL","en"]],
    "tokens":{"search":["TLAPS","TLA+","Spec implies always Inv","TypeOK","Next","RAG proof generation","model collapse","externally anchored optimization","evolutionary knowledge graph"],"phonetic":["t l a plus","tee laps"],"transliteration":[],"voice":["TLAPS proof","TLA proof gate","invariant verifier"],"recipe":[],"festival":[],"context":["Tier 4 AI ingestion systems","Tier 5 autonomous orchestration","recursive self improvement","physical experimentation grounding","machine-checkable proofs","autonomous code modification"]},
    "operations":{"perishability":"DRY_STABLE","freshness_profile":"proof freshness depends on current source, verified proof libraries, invariant set, and external experimental evidence","delivery_sensitivity":"must block updates with missing proof obligations, synthetic-only grounding, TypeOK violations, or invariant regressions","storage_requirements":"formal proof artifact store and externally anchored evidence registry","temperature_constraints_c":null,"shelf_life_hours":null,"inventory_policy":"placeholder_only_until_research_agent_registry_is_connected"},
    "image":{"search_terms":["TLAPS proof obligation pipeline diagram","TLA+ invariant verification dashboard","autonomous science proof gate architecture"],"visual_search_tags":["tlaps","tla_plus","proof","invariant","autonomous_science"]}
  },
  {
    "slug":"kartex-bioeconomic-mey-resource-governor",
    "sku":"KARTEX-ECOLOGY-SCHAEFER-GORDON-MEY-GOVERNOR",
    "name":"KARTEX Bioeconomic MEY Resource Governor",
    "description":"Governance-held ecological commerce capability for Schaefer-Gordon stock dynamics, MEY enforcement, open-access collapse prevention, conservation sentiment feedback, and planetary-boundary-aware extraction pricing.",
    "short":"Maximum Economic Yield governor for ecological resource pricing and quotas.",
    "category":"bioeconomic-ecological-coupling",
    "category_name":"Bioeconomic Ecological Coupling",
    "subcategory":"mey-resource-governance",
    "subcategory_name":"MEY Resource Governance",
    "family":"coupled-human-environment-commerce-plane",
    "family_name":"Coupled Human-Environment Commerce Plane",
    "variant_name":"Schaefer Gordon MEY quota pricing module",
    "variant_sku":"KARTEX-ECOLOGY-MEY-RESOURCE-GOVERNOR-MODULE",
    "aliases":[["Maximum Economic Yield","REGIONAL","en"],["MEY governor","SHORTHAND","roman"],["Schaefer Gordon model","REGIONAL","en"],["open access equilibrium","VOICE","en"],["planetary boundaries pricing","REGIONAL","en"]],
    "tokens":{"search":["Maximum Economic Yield","MEY","Schaefer-Gordon","common pool resource","logistic growth","harvest effort","open access equilibrium","planetary boundaries","rarity based conservation"],"phonetic":["m e y","schaefer gordon"],"transliteration":[],"voice":["MEY governor","resource quota","ecological pricing"],"recipe":[],"festival":[],"context":["Tier 3 operational intelligence","bioeconomic feedback","donut economics","resource depletion","conservation sentiment","hysteresis prevention"]},
    "operations":{"perishability":"DRY_STABLE","freshness_profile":"governor freshness depends on current biological stock, effort, price, cost, carrying capacity, and conservation-sentiment signals","delivery_sensitivity":"must increase extraction costs or quotas before OAE drift, low biomass threshold, or irreversible bifurcation risk","storage_requirements":"resource telemetry ledger and ecological pricing policy registry","temperature_constraints_c":null,"shelf_life_hours":null,"inventory_policy":"placeholder_only_until_ecological_resource_registry_is_connected"},
    "image":{"search_terms":["Schaefer Gordon MEY resource curve diagram","Maximum Economic Yield ecological quota dashboard","bioeconomic resource pricing architecture"],"visual_search_tags":["mey","schaefer_gordon","ecology","quota","resource_pricing"]}
  },
  {
    "slug":"kartex-oais-active-preservation-archive",
    "sku":"KARTEX-ARCHIVE-OAIS-321-ACTIVE-PRESERVATION",
    "name":"KARTEX OAIS Active Preservation Archive",
    "description":"Governance-held archival capability for OAIS preservation workflows, Smithsonian 3-2-1 replication, cryptographic fixity audits, 5-to-10-year hardware refresh, non-proprietary format migration, and hybrid analog-digital bootstrap media.",
    "short":"Multi-century active preservation archive with fixity, refresh, and format migration.",
    "category":"long-horizon-resilience",
    "category_name":"Long-Horizon Resilience",
    "subcategory":"active-archival-preservation",
    "subcategory_name":"Active Archival Preservation",
    "family":"civilizational-memory-continuity-plane",
    "family_name":"Civilizational Memory Continuity Plane",
    "variant_name":"OAIS 3-2-1 fixity migration module",
    "variant_sku":"KARTEX-ARCHIVE-OAIS-321-PRESERVATION-MODULE",
    "aliases":[["OAIS archive","REGIONAL","en"],["3-2-1 storage rule","REGIONAL","en"],["cryptographic fixity","REGIONAL","en"],["Project Silica archive","VOICE","en"],["format migration workflow","REGIONAL","en"]],
    "tokens":{"search":["OAIS","3-2-1 storage rule","cryptographic fixity","format migration","hardware refresh","laser etched quartz glass","Project Silica","analog digital photographic film","AI metadata generation"],"phonetic":["o a i s","three two one rule"],"transliteration":[],"voice":["OAIS archive","fixity check","archive refresh"],"recipe":[],"festival":[],"context":["Tier 1.5 governance normalization","multi century preservation","hardware obsolescence","non proprietary formats","human readable bootstrap diagrams","off-site archive"]},
    "operations":{"perishability":"DRY_STABLE","freshness_profile":"archive freshness depends on checksum audits, media condition, hardware readability, and format support horizon","delivery_sensitivity":"requires environmental controls, off-site copy verification, refresh scheduling, and migration audit before archive acceptance","storage_requirements":"environmentally controlled archive plus off-site replicated media vault","temperature_constraints_c":{"min":16,"max":20},"shelf_life_hours":null,"inventory_policy":"placeholder_only_until_archive_asset_registry_is_connected"},
    "image":{"search_terms":["OAIS active preservation workflow diagram","3-2-1 archive fixity migration dashboard","hybrid analog digital film bootstrap archive"],"visual_search_tags":["oais","archive","fixity","format_migration","321_rule"]}
  }
]
$json$::jsonb;
begin
  insert into public.departments (
    slug, canonical_name, multilingual_names, aliases, search_terms, regional_priority,
    perishability_class, image_requirements, packaging_defaults, fulfillment_constraints,
    discovery_tags, sort_order, status, is_mvp_enabled, quality_score, governance_metadata
  )
  values (
    'civilizational-commerce-capabilities',
    'Civilizational Commerce Capabilities',
    '{"en":"Civilizational Commerce Capabilities"}',
    array['KARTEX architecture','sovereign commerce capabilities','civilizational infrastructure'],
    array['KARTEX','sovereign commerce','edge autonomy','intergenerational governance','active preservation'],
    '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}'::jsonb,
    'DRY_STABLE',
    image_requirements,
    '{"default":["versioned architecture artifact","governance policy bundle","control-plane module"]}'::jsonb,
    '{"customer_marketplace_visible":false,"governance_hold":true,"registry_required":true}'::jsonb,
    array['platform-capability','governance-held','architecture-ingestion'],
    950,
    'hidden',
    false,
    97,
    '{"moderation_state":"governance_hold_research_ingestion","duplicate_detection_keys":["kartex","civilizational-commerce-capabilities"],"source_dataset":"kartex_civilizational_architecture_capability_ingestion"}'::jsonb
  )
  on conflict (slug) do update
  set canonical_name = excluded.canonical_name,
      aliases = excluded.aliases,
      search_terms = excluded.search_terms,
      image_requirements = excluded.image_requirements,
      fulfillment_constraints = excluded.fulfillment_constraints,
      status = excluded.status,
      is_mvp_enabled = excluded.is_mvp_enabled,
      quality_score = excluded.quality_score,
      governance_metadata = public.departments.governance_metadata || excluded.governance_metadata
  returning id into dept_uuid;

  insert into public.brands (slug, canonical_name, manufacturer, origin_region, country_code, aliases, is_local_brand, metadata)
  values ('kartex', 'KARTEX', 'KARTEX sovereign commerce architecture', null, 'IN', array['VendorHub KARTEX','KARTEX civilizational commerce'], true, '{"brand_type":"platform_capability","customer_marketplace_visible":false}'::jsonb)
  on conflict (slug) do update
  set canonical_name = excluded.canonical_name,
      manufacturer = excluded.manufacturer,
      aliases = excluded.aliases,
      metadata = public.brands.metadata || excluded.metadata
  returning id into brand_uuid;

  insert into public.packaging_types (slug, name, description, supports_loose_weight, supports_ocr, leak_risk, crush_risk, metadata)
  values ('versioned-control-plane-artifact', 'Versioned Control-Plane Artifact', 'Versioned architecture, policy, proof, or module artifact. Not customer-facing product packaging.', false, true, 0.01, 0.05, '{"source_dataset":"kartex_civilizational_architecture_capability_ingestion","marketplace_visible":false}'::jsonb)
  on conflict (slug) do update
  set description = excluded.description,
      metadata = public.packaging_types.metadata || excluded.metadata
  returning id into packaging_uuid;

  select id into unit_uuid from public.units where slug = 'piece';
  select id into perishability_uuid from public.perishability_profiles where slug = 'dry-grocery-stable';
  select id into delivery_uuid from public.delivery_constraints where slug = 'standard-hyperlocal';

  for p in select * from jsonb_array_elements(products)
  loop
    insert into public.categories (
      department_id, name, slug, description, sort_order, is_active, canonical_name,
      multilingual_names, aliases, search_terms, regional_priority, perishability_class,
      image_requirements, packaging_defaults, fulfillment_constraints, discovery_tags,
      taxonomy_level, ontology_metadata, status, is_mvp_enabled, quality_score, governance_metadata
    )
    values (
      dept_uuid, p->>'category_name', p->>'category',
      'Governance-held KARTEX capability category sourced from civilizational architecture research.',
      950, false, p->>'category_name', jsonb_build_object('en', p->>'category_name'),
      array[p->>'category_name', p->>'category', 'KARTEX'],
      array[p->>'category_name', p->>'name'],
      '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}'::jsonb,
      'DRY_STABLE', image_requirements,
      '{"default":["versioned control-plane artifact"]}'::jsonb,
      '{"customer_marketplace_visible":false,"governance_hold":true}'::jsonb,
      array['kartex','platform-capability','governance-held'],
      'CATEGORY',
      jsonb_build_object('source_dataset','kartex_civilizational_architecture_capability_ingestion','tier','tier_1_commerce_ontology'),
      'hidden', false, 97,
      jsonb_build_object('moderation_state','governance_hold_research_ingestion','duplicate_detection_keys',jsonb_build_array(p->>'category', p->>'category_name'))
    )
    on conflict (slug) do update
    set department_id = excluded.department_id,
        canonical_name = excluded.canonical_name,
        aliases = excluded.aliases,
        search_terms = excluded.search_terms,
        image_requirements = excluded.image_requirements,
        is_active = excluded.is_active,
        status = excluded.status,
        is_mvp_enabled = excluded.is_mvp_enabled,
        quality_score = excluded.quality_score,
        governance_metadata = public.categories.governance_metadata || excluded.governance_metadata
    returning id into cat_uuid;

    insert into public.subcategories (
      department_id, category_id, slug, canonical_name, multilingual_names, aliases,
      search_terms, regional_priority, perishability_class, image_requirements,
      packaging_defaults, fulfillment_constraints, discovery_tags, sort_order,
      is_active, status, is_mvp_enabled, quality_score, governance_metadata
    )
    values (
      dept_uuid, cat_uuid, p->>'subcategory', p->>'subcategory_name',
      jsonb_build_object('en', p->>'subcategory_name'),
      array[p->>'subcategory_name', p->>'subcategory', 'KARTEX'],
      array[p->>'subcategory_name', p->>'name'],
      '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}'::jsonb,
      'DRY_STABLE', image_requirements,
      '{"default":["versioned control-plane artifact"]}'::jsonb,
      '{"customer_marketplace_visible":false,"governance_hold":true}'::jsonb,
      array['kartex','platform-capability','governance-held'],
      950, false, 'hidden', false, 97,
      jsonb_build_object('moderation_state','governance_hold_research_ingestion','duplicate_detection_keys',jsonb_build_array(p->>'subcategory', p->>'subcategory_name'))
    )
    on conflict (slug) do update
    set category_id = excluded.category_id,
        canonical_name = excluded.canonical_name,
        aliases = excluded.aliases,
        search_terms = excluded.search_terms,
        image_requirements = excluded.image_requirements,
        is_active = excluded.is_active,
        status = excluded.status,
        is_mvp_enabled = excluded.is_mvp_enabled,
        quality_score = excluded.quality_score,
        governance_metadata = public.subcategories.governance_metadata || excluded.governance_metadata
    returning id into subcat_uuid;

    insert into public.product_families (
      department_id, category_id, subcategory_id, slug, canonical_name, product_group,
      multilingual_names, aliases, search_terms, regional_priority, perishability_class,
      image_requirements, packaging_defaults, fulfillment_constraints, discovery_tags,
      is_active, status, is_mvp_enabled, quality_score, governance_metadata
    )
    values (
      dept_uuid, cat_uuid, subcat_uuid, p->>'family', p->>'family_name', p->>'family_name',
      jsonb_build_object('en', p->>'family_name'),
      array[p->>'family_name', p->>'family', 'KARTEX'],
      array[p->>'family_name', p->>'name'],
      '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}'::jsonb,
      'DRY_STABLE', image_requirements,
      '{"default":["versioned control-plane artifact"]}'::jsonb,
      '{"customer_marketplace_visible":false,"governance_hold":true}'::jsonb,
      array['kartex','platform-capability','governance-held'],
      false, 'hidden', false, 97,
      jsonb_build_object('moderation_state','governance_hold_research_ingestion','duplicate_detection_keys',jsonb_build_array(p->>'family', p->>'family_name'))
    )
    on conflict (slug) do update
    set category_id = excluded.category_id,
        subcategory_id = excluded.subcategory_id,
        canonical_name = excluded.canonical_name,
        aliases = excluded.aliases,
        search_terms = excluded.search_terms,
        image_requirements = excluded.image_requirements,
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
      dept_uuid, cat_uuid, subcat_uuid, family_uuid, p->>'family_name',
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
      '{"customer_food_item":false,"platform_capability":true,"gst_profile":"not_applicable"}'::jsonb,
      '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}'::jsonb,
      jsonb_build_object(
        'source_dataset','kartex_civilizational_architecture_capability_ingestion',
        'source_research_type','sovereign_civilizational_commerce_architecture_specification',
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
          'hero_image', jsonb_build_object('aspect_ratio','4:5','asset_policy','verified architecture diagram or control-plane capture'),
          'transparent_image', jsonb_build_object('aspect_ratio','1:1','asset_policy','transparent system icon or approved module mark, not fake packaging'),
          'thumbnail_image', jsonb_build_object('aspect_ratio','1:1','asset_policy','mobile optimized approved module visual'),
          'packaging_image', jsonb_build_object('aspect_ratio','4:5','asset_policy','versioned artifact card with readable scope, evidence, or policy marker'),
          'shelf_image', jsonb_build_object('aspect_ratio','16:9','asset_policy','control-plane inventory shelf or architecture dashboard'),
          'ocr_visibility_required_for', jsonb_build_array('PACKAGING','SHELF'),
          'duplicate_detection_hints', jsonb_build_array(lower(p->>'name'), p->>'slug', p->>'sku')
        ),
        'ai_ingestion_readiness', jsonb_build_object(
          'embedding_metadata', jsonb_build_object('model_family','multilingual_hybrid_dense_sparse','vector_index','kartex_governance_capability_catalog_hold'),
          'ocr_aliases', p->'aliases',
          'visual_search_tags', p->'image'->'visual_search_tags',
          'packaging_signatures', jsonb_build_object('version_marker_required', true, 'control_plane_scope_required', true, 'evidence_marker_required', true),
          'ai_match_tokens', (p->'tokens'->'search') || (p->'tokens'->'voice') || (p->'tokens'->'context')
        ),
        'inventory_generation', jsonb_build_object('starter_inventory_seeded', false, 'stock_count', null, 'seller_id', null, 'price', null, 'reason', 'source research provides architecture capabilities but no sellers, stock counts, consumer package sizes, or prices')
      ),
      'hidden',
      false,
      97,
      true,
      jsonb_build_object(
        'duplicate_detection_keys', jsonb_build_array(lower(p->>'name'), p->>'slug', p->>'sku'),
        'moderation_state','governance_hold_research_ingestion',
        'quality_indicators', jsonb_build_object('taxonomy_integrity',true,'variants_separate',true,'image_pipeline_ready',true,'inventory_placeholders_only',true,'customer_marketplace_safe',true,'no_hallucinated_products',true),
        'is_mvp_enabled', false,
        'replay_safe_seed', true,
        'hold_reason','KARTEX architecture capability, not buyer-facing hyperlocal product inventory'
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
      product_uuid, 'PIECE', p->>'variant_name', null, unit_uuid, null, 'module',
      packaging_uuid, null, p->'operations'->>'storage_requirements', false, false, null, null,
      p->>'variant_sku', false,
      jsonb_build_object(
        'source_dataset','kartex_civilizational_architecture_capability_ingestion',
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
      'hidden', false, 97,
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

    if perishability_uuid is not null and delivery_uuid is not null then
      insert into public.product_logistics_profiles (
        product_id, variant_id, perishability_profile_id, delivery_constraint_id, region_codes, notes, metadata
      )
      values (
        product_uuid, variant_uuid, perishability_uuid, delivery_uuid, all_regions,
        'KARTEX governance-held platform capability. Availability, deployment, and pricing are intentionally absent until connected to platform registries.',
        jsonb_build_object('operational_metadata', p->'operations', 'customer_marketplace_visible', false, 'governance_hold', true, 'deployment_requires_review', true)
      )
      on conflict (product_id, variant_id, perishability_profile_id, delivery_constraint_id) do update
      set notes = excluded.notes,
          metadata = public.product_logistics_profiles.metadata || excluded.metadata;
    end if;

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
        'kartex_civilizational_architecture_capability_ingestion',
        jsonb_build_object('soundex_key', soundex(alias_item->>0), 'voice_ready', true, 'ocr_ready', true, 'customer_marketplace_visible', false)
      )
      on conflict (product_id, normalized_alias, alias_type, language) do update
      set confidence = greatest(public.product_aliases.confidence, excluded.confidence),
          metadata = public.product_aliases.metadata || excluded.metadata;
    end loop;

    for token_item in
      select jsonb_build_object('token', value, 'type', 'SEMANTIC', 'language', 'en') from jsonb_array_elements_text(p->'tokens'->'search')
      union all select jsonb_build_object('token', value, 'type', 'PHONETIC', 'language', 'en') from jsonb_array_elements_text(p->'tokens'->'phonetic')
      union all select jsonb_build_object('token', value, 'type', 'TRANSLITERATION', 'language', 'en') from jsonb_array_elements_text(p->'tokens'->'transliteration')
      union all select jsonb_build_object('token', value, 'type', 'PHONETIC', 'language', 'en') from jsonb_array_elements_text(p->'tokens'->'voice')
      union all select jsonb_build_object('token', value, 'type', 'RECIPE', 'language', 'en') from jsonb_array_elements_text(p->'tokens'->'recipe')
      union all select jsonb_build_object('token', value, 'type', 'INTENT', 'language', 'en') from jsonb_array_elements_text(p->'tokens'->'festival')
      union all select jsonb_build_object('token', value, 'type', 'INTENT', 'language', 'en') from jsonb_array_elements_text(p->'tokens'->'context')
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
          'source_dataset','kartex_civilizational_architecture_capability_ingestion',
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
      on conflict (product_id, normalized_token, token_type, language) do update
      set weight = greatest(public.search_tokens.weight, excluded.weight),
          metadata = public.search_tokens.metadata || excluded.metadata;
    end loop;

    foreach image_kind in array array['HERO','TRANSPARENT_PNG','PACKAGING','SHELF','MOBILE_THUMBNAIL']
    loop
      insert into public.catalog_product_images (
        product_id, variant_id, image_kind, storage_path, alt_text, width, height, aspect_ratio,
        mime_type, white_background, mobile_optimized, no_watermark, lighting_quality,
        compression_artifact_score, packaging_visibility, ocr_readability, dominant_colors, metadata
      )
      values (
        product_uuid, variant_uuid, image_kind::public.product_image_kind,
        'catalog-ingestion/pending/kartex-civilizational-architecture/' || (p->>'slug') || '/' || lower(image_kind) || '.webp',
        (p->>'name') || ' ' || lower(replace(image_kind, '_', ' ')) || ' governance-held ingestion slot',
        case when image_kind = 'SHELF' then 1920 else 1600 end,
        case when image_kind = 'SHELF' then 1080 else 1600 end,
        case when image_kind = 'SHELF' then '16:9' when image_kind = 'MOBILE_THUMBNAIL' then '1:1' else '4:5' end,
        'image/webp', true, true, true, 'pending_validation', 0,
        case when image_kind in ('PACKAGING','SHELF') then 0.9 else 0.7 end,
        case when image_kind in ('PACKAGING','SHELF') then 0.85 else 0.45 end,
        array[]::text[],
        jsonb_build_object(
          'image_requirements', image_requirements,
          'image_search_terms', p->'image'->'search_terms',
          'visual_search_tags', p->'image'->'visual_search_tags',
          'duplicate_detection_hints', jsonb_build_array(p->>'slug', p->>'sku', lower(image_kind)),
          'status','pending_asset_ingestion',
          'asset_policy','verified architecture diagram, versioned policy/proof artifact, or control-plane capture only',
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
      product_uuid, 97, 'production_grade', 98, 88, 98, 97, 95, 0, 8, 90,
      'hidden',
      jsonb_build_array(
        jsonb_build_object('code','governance_hold','severity','info','detail','KARTEX architecture capability is intentionally hidden from customer marketplace discovery.'),
        jsonb_build_object('code','inventory_placeholder','severity','info','detail','No stock, seller, package size, or price was generated because the source research did not provide marketplace inventory facts.'),
        jsonb_build_object('code','multilingual_limit','severity','warning','detail','Tamil and other South Indian aliases were not invented because the source research provided English technical terms only.')
      ),
      now()
    )
    on conflict do nothing;
  end loop;
end $$;
