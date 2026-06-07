create extension if not exists "pgcrypto";
create extension if not exists "fuzzystrmatch" with schema extensions;

create unique index if not exists catalog_product_variants_sku_template_unique_idx
  on public.catalog_product_variants(sku_template);

create unique index if not exists tier5_infra_search_tokens_replay_idx
  on public.search_tokens(product_id, normalized_token, token_type, language)
  where product_id is not null;

create unique index if not exists tier5_infra_catalog_images_replay_idx
  on public.catalog_product_images(product_id, image_kind, storage_path);

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
    "required":["HERO","TRANSPARENT_PNG","SHELF","PACKAGING","MOBILE_THUMBNAIL"],
    "preferred_aspect_ratios":["1:1","4:5","16:9"],
    "minimum_width":1600,
    "minimum_height":1200,
    "webp_required":true,
    "watermark_allowed":false,
    "reject_marketplace_screenshot":true,
    "reject_fake_ai_packaging":true,
    "real_image_only":true,
    "ocr_required_for":["SHELF","PACKAGING"],
    "packaging_focus_areas":["model_number","port_label","capacity_marker","serial_area","manufacturer_badge"],
    "validation":{"background":"clean_lab_or_datacenter_shelf","duplicate_hash_required":true,"visual_embedding_required":true}
  }'::jsonb;
  products jsonb := $json$
[
  {
    "slug":"amd-epyc-9554-processor",
    "sku":"T5-INFRA-CPU-AMD-EPYC-9554",
    "name":"AMD EPYC 9554 Processor",
    "description":"Processor explicitly specified for KARTEX metropolitan edge compute nodes. Seeded as a governance-held infrastructure catalog entity, not as a buyer marketplace SKU.",
    "short":"AMD EPYC 9554 processor for edge compute node capacity planning.",
    "category":"edge-compute-components",
    "category_name":"Edge Compute Components",
    "subcategory":"server-processors",
    "subcategory_name":"Server Processors",
    "family":"compute-node-bom",
    "family_name":"Compute Node Bill of Materials",
    "product_type":"INFRASTRUCTURE_COMPONENT",
    "brand":"amd",
    "manufacturer":"AMD",
    "variant_type":"PIECE",
    "unit":"piece",
    "variant_name":"Single processor unit",
    "sku_variant":"T5-INFRA-CPU-AMD-EPYC-9554-1PC",
    "aliases":[["AMD EPYC 9554","REGIONAL","roman"],["EPYC 9554","SHORTHAND","roman"],["edge compute CPU","VOICE","roman"],["server processor","REGIONAL","roman"]],
    "tokens":{"search":["AMD EPYC 9554","edge compute processor","server CPU","metropolitan cluster CPU"],"phonetic":["epyc nine five five four"],"transliteration":[],"voice":["EPYC 9554","edge CPU"],"recipe":[],"festival":[],"context":["30 edge compute nodes","metropolitan cluster","capacity planning","edge node pool"]},
    "operations":{"perishability":"DRY_STABLE","freshness_profile":"non-perishable infrastructure component","delivery_sensitivity":"anti-static handling, shock protection, serial verification","storage_requirements":"ambient dry secure parts cage","temperature_constraints_c":{"min":5,"max":35},"shelf_life_hours":null,"inventory_policy":"placeholder_only_until_procurement_or_asset_registry_is_connected"},
    "image":{"search_terms":["AMD EPYC 9554 processor product photo","AMD EPYC 9554 server CPU packaging","EPYC 9554 clean product image"],"visual_search_tags":["server_cpu","amd_epyc","processor","anti_static_packaging"]},
    "governance_hold_reason":"architecture_capacity_component_not_customer_marketplace_item"
  },
  {
    "slug":"3-2tb-nvme-pcie-drive",
    "sku":"T5-INFRA-STORAGE-3-2TB-NVME-PCIE",
    "name":"3.2TB NVMe PCIe Drive",
    "description":"3.2TB NVMe PCIe storage drive explicitly specified as two units per metropolitan edge compute node.",
    "short":"3.2TB NVMe PCIe drive for edge write-ahead logs and local state.",
    "category":"edge-compute-components",
    "category_name":"Edge Compute Components",
    "subcategory":"nvme-storage",
    "subcategory_name":"NVMe Storage",
    "family":"compute-node-bom",
    "family_name":"Compute Node Bill of Materials",
    "product_type":"INFRASTRUCTURE_COMPONENT",
    "brand":"unbranded-infrastructure",
    "manufacturer":"Manufacturer unspecified in research",
    "variant_type":"PIECE",
    "unit":"piece",
    "variant_name":"Single 3.2TB NVMe PCIe drive",
    "sku_variant":"T5-INFRA-STORAGE-3-2TB-NVME-PCIE-1PC",
    "aliases":[["3.2TB NVMe","REGIONAL","roman"],["NVMe PCIe drive","REGIONAL","roman"],["3.2TB SSD","SHORTHAND","roman"],["edge WAL drive","VOICE","roman"]],
    "tokens":{"search":["3.2TB NVMe PCIe drive","NVMe storage","edge node storage","local NVMe WAL ring buffer"],"phonetic":["three point two terabyte nvme"],"transliteration":[],"voice":["3.2TB NVMe","NVMe drive"],"recipe":[],"festival":[],"context":["2x 3.2TB NVMe PCIe per edge compute node","SQLite WAL","offline first edge commerce","local write log"]},
    "operations":{"perishability":"DRY_STABLE","freshness_profile":"non-perishable infrastructure component","delivery_sensitivity":"shock protection, ESD protection, capacity label verification","storage_requirements":"ambient dry secure parts cage","temperature_constraints_c":{"min":5,"max":35},"shelf_life_hours":null,"inventory_policy":"placeholder_only_until_procurement_or_asset_registry_is_connected"},
    "image":{"search_terms":["3.2TB NVMe PCIe drive product image","enterprise NVMe drive label visible","NVMe PCIe SSD clean shelf image"],"visual_search_tags":["nvme_drive","pcie_storage","capacity_label","enterprise_ssd"]},
    "governance_hold_reason":"architecture_capacity_component_not_customer_marketplace_item"
  },
  {
    "slug":"dell-poweredge-xe-ai-inference-node",
    "sku":"T5-INFRA-AI-DELL-POWEREDGE-XE",
    "name":"Dell PowerEdge XE AI Inference Node",
    "description":"Dell PowerEdge XE AI inference node explicitly specified for the KARTEX metropolitan AI deep learning inference cluster.",
    "short":"Dell PowerEdge XE inference node for Tier 5 predictive routing capacity.",
    "category":"ai-inference-infrastructure",
    "category_name":"AI Inference Infrastructure",
    "subcategory":"gpu-inference-nodes",
    "subcategory_name":"GPU Inference Nodes",
    "family":"ai-inference-node-bom",
    "family_name":"AI Inference Node Bill of Materials",
    "product_type":"INFRASTRUCTURE_NODE",
    "brand":"dell",
    "manufacturer":"Dell",
    "variant_type":"PIECE",
    "unit":"piece",
    "variant_name":"8x NVIDIA L40S GPU node configuration",
    "sku_variant":"T5-INFRA-AI-DELL-POWEREDGE-XE-8XL40S",
    "aliases":[["Dell PowerEdge XE","REGIONAL","roman"],["PowerEdge XE","SHORTHAND","roman"],["AI inference node","VOICE","roman"],["GPU inference node","REGIONAL","roman"]],
    "tokens":{"search":["Dell PowerEdge XE","AI inference node","GPU inference node","deep learning inference node","Triton inference node"],"phonetic":["power edge x e"],"transliteration":[],"voice":["PowerEdge XE","AI node","GPU node"],"recipe":[],"festival":[],"context":["8 AI deep learning inference nodes","8x NVIDIA L40S GPU","STAD-GCN inference","Triton timeout","metropolitan cluster"]},
    "operations":{"perishability":"DRY_STABLE","freshness_profile":"non-perishable infrastructure node","delivery_sensitivity":"rack handling, shock protection, serial verification, GPU seating verification","storage_requirements":"secure staging area before rack installation","temperature_constraints_c":{"min":5,"max":35},"shelf_life_hours":null,"inventory_policy":"placeholder_only_until_procurement_or_asset_registry_is_connected"},
    "image":{"search_terms":["Dell PowerEdge XE server product photo","Dell PowerEdge XE rack server front rear","GPU inference server clean image"],"visual_search_tags":["rack_server","gpu_node","dell_poweredge","datacenter_hardware"]},
    "governance_hold_reason":"architecture_capacity_component_not_customer_marketplace_item"
  },
  {
    "slug":"nvidia-l40s-gpu",
    "sku":"T5-INFRA-GPU-NVIDIA-L40S",
    "name":"NVIDIA L40S GPU",
    "description":"NVIDIA L40S GPU explicitly specified as the accelerator used in KARTEX AI deep learning inference nodes.",
    "short":"NVIDIA L40S GPU for Tier 5 inference capacity.",
    "category":"ai-inference-infrastructure",
    "category_name":"AI Inference Infrastructure",
    "subcategory":"gpu-accelerators",
    "subcategory_name":"GPU Accelerators",
    "family":"ai-inference-node-bom",
    "family_name":"AI Inference Node Bill of Materials",
    "product_type":"INFRASTRUCTURE_COMPONENT",
    "brand":"nvidia",
    "manufacturer":"NVIDIA",
    "variant_type":"PIECE",
    "unit":"piece",
    "variant_name":"Single L40S GPU",
    "sku_variant":"T5-INFRA-GPU-NVIDIA-L40S-1PC",
    "aliases":[["NVIDIA L40S","REGIONAL","roman"],["L40S GPU","SHORTHAND","roman"],["inference GPU","VOICE","roman"],["deep learning GPU","REGIONAL","roman"]],
    "tokens":{"search":["NVIDIA L40S GPU","L40S inference GPU","deep learning accelerator","GPU for Triton inference"],"phonetic":["l forty s gpu"],"transliteration":[],"voice":["L40S GPU","NVIDIA L40S"],"recipe":[],"festival":[],"context":["8x NVIDIA L40S GPU per AI inference node","DRA scheduling","GPUDirect RDMA","STAD-GCN vector retrieval"]},
    "operations":{"perishability":"DRY_STABLE","freshness_profile":"non-perishable infrastructure component","delivery_sensitivity":"ESD protection, shock protection, model label verification","storage_requirements":"ambient dry secure parts cage","temperature_constraints_c":{"min":5,"max":35},"shelf_life_hours":null,"inventory_policy":"placeholder_only_until_procurement_or_asset_registry_is_connected"},
    "image":{"search_terms":["NVIDIA L40S GPU product image","NVIDIA L40S accelerator packaging","L40S GPU clean product photo"],"visual_search_tags":["gpu","nvidia_l40s","accelerator","pcie_card"]},
    "governance_hold_reason":"architecture_capacity_component_not_customer_marketplace_item"
  },
  {
    "slug":"mellanox-connectx-7-200gbe-nic",
    "sku":"T5-INFRA-NIC-MELLANOX-CONNECTX-7-200GBE",
    "name":"Mellanox ConnectX-7 200GbE NIC",
    "description":"Mellanox ConnectX-7 200GbE network adapter explicitly specified for low-latency AI inference node networking.",
    "short":"ConnectX-7 200GbE NIC for GPUDirect RDMA inference paths.",
    "category":"ai-inference-infrastructure",
    "category_name":"AI Inference Infrastructure",
    "subcategory":"network-adapters",
    "subcategory_name":"Network Adapters",
    "family":"ai-inference-node-bom",
    "family_name":"AI Inference Node Bill of Materials",
    "product_type":"INFRASTRUCTURE_COMPONENT",
    "brand":"mellanox",
    "manufacturer":"Mellanox",
    "variant_type":"PIECE",
    "unit":"piece",
    "variant_name":"Single 200GbE ConnectX-7 adapter",
    "sku_variant":"T5-INFRA-NIC-MELLANOX-CONNECTX-7-200GBE-1PC",
    "aliases":[["Mellanox ConnectX-7","REGIONAL","roman"],["ConnectX-7 200GbE","SHORTHAND","roman"],["200GbE NIC","VOICE","roman"],["GPUDirect RDMA NIC","REGIONAL","roman"]],
    "tokens":{"search":["Mellanox ConnectX-7 200GbE NIC","ConnectX-7 network adapter","GPUDirect RDMA NIC","200GbE adapter"],"phonetic":["connect x seven"],"transliteration":[],"voice":["ConnectX-7 NIC","200 gig NIC"],"recipe":[],"festival":[],"context":["Mellanox ConnectX-7 200GbE NICs","GPUDirect RDMA","NUMA co-scheduling","low latency inference"]},
    "operations":{"perishability":"DRY_STABLE","freshness_profile":"non-perishable infrastructure component","delivery_sensitivity":"ESD protection, port inspection, model label verification","storage_requirements":"ambient dry secure parts cage","temperature_constraints_c":{"min":5,"max":35},"shelf_life_hours":null,"inventory_policy":"placeholder_only_until_procurement_or_asset_registry_is_connected"},
    "image":{"search_terms":["Mellanox ConnectX-7 200GbE NIC product image","ConnectX-7 network adapter clean photo","200GbE NIC port label visible"],"visual_search_tags":["network_adapter","connectx7","200gbe","rdma_nic"]},
    "governance_hold_reason":"architecture_capacity_component_not_customer_marketplace_item"
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
    'autonomous-commerce-infrastructure',
    'Autonomous Commerce Infrastructure',
    '{"en":"Autonomous Commerce Infrastructure"}',
    array['tier 5 infrastructure','dark store infrastructure','ai inference infrastructure','edge compute hardware'],
    array['Tier 5 infrastructure','edge compute nodes','AI inference nodes','GPU infrastructure','NVMe storage'],
    '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}',
    'DRY_STABLE',
    image_requirements,
    '{"default":["manufacturer sealed carton","anti-static packaging","rack-staging crate"]}',
    '{"customer_marketplace_visible":false,"asset_registry_required":true,"human_procurement_review_required":true}',
    array['tier-5','infrastructure','capacity-planning','asset-registry'],
    900,
    'hidden',
    false,
    92,
    '{"moderation_state":"governance_hold","duplicate_detection_keys":["autonomous-commerce-infrastructure","tier-5-infrastructure"],"research_supported":true}'
  )
  on conflict (slug) do update
  set canonical_name = excluded.canonical_name,
      aliases = excluded.aliases,
      search_terms = excluded.search_terms,
      image_requirements = excluded.image_requirements,
      fulfillment_constraints = excluded.fulfillment_constraints,
      status = excluded.status,
      is_mvp_enabled = excluded.is_mvp_enabled,
      governance_metadata = public.departments.governance_metadata || excluded.governance_metadata
  returning id into dept_uuid;

  insert into public.packaging_types (slug, name, description, supports_loose_weight, supports_ocr, leak_risk, crush_risk, metadata)
  values
    ('manufacturer-sealed-infra-carton', 'Manufacturer Sealed Infrastructure Carton', 'Sealed manufacturer carton for hardware components. Not customer-facing commerce packaging.', false, true, 0.02, 0.35, '{"source_dataset":"tier5_architecture_capacity_catalog_ingestion","marketplace_visible":false}'),
    ('anti-static-component-pack', 'Anti-Static Component Pack', 'Anti-static component packaging for processors, GPUs, NICs, and storage devices.', false, true, 0.01, 0.45, '{"source_dataset":"tier5_architecture_capacity_catalog_ingestion","marketplace_visible":false}')
  on conflict (slug) do update
  set description = excluded.description,
      supports_ocr = excluded.supports_ocr,
      metadata = public.packaging_types.metadata || excluded.metadata;

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
      'Governance-held infrastructure capacity category sourced from Tier 5 architecture research.',
      900, false, p->>'category_name',
      jsonb_build_object('en', p->>'category_name'),
      array[p->>'category_name', p->>'category'],
      array[p->>'category_name', p->>'product_type'],
      '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}',
      'DRY_STABLE',
      image_requirements,
      '{"default":["manufacturer sealed carton","anti-static packaging"]}',
      '{"customer_marketplace_visible":false,"asset_registry_required":true}',
      array['tier-5','infrastructure','capacity-planning'],
      'CATEGORY',
      jsonb_build_object('source_dataset','tier5_architecture_capacity_catalog_ingestion','governance_hold',true),
      'hidden',
      false,
      92,
      jsonb_build_object('moderation_state','governance_hold','duplicate_detection_keys',jsonb_build_array(p->>'category', p->>'category_name'))
    )
    on conflict (slug) do update
    set department_id = excluded.department_id,
        canonical_name = excluded.canonical_name,
        aliases = excluded.aliases,
        search_terms = excluded.search_terms,
        is_active = excluded.is_active,
        status = excluded.status,
        is_mvp_enabled = excluded.is_mvp_enabled,
        governance_metadata = public.categories.governance_metadata || excluded.governance_metadata
    returning id into cat_uuid;

    insert into public.subcategories (
      department_id, category_id, slug, canonical_name, multilingual_names, aliases, search_terms,
      regional_priority, perishability_class, image_requirements, packaging_defaults,
      fulfillment_constraints, discovery_tags, sort_order, is_active, status, is_mvp_enabled,
      quality_score, governance_metadata
    )
    values (
      dept_uuid, cat_uuid, p->>'subcategory', p->>'subcategory_name',
      jsonb_build_object('en', p->>'subcategory_name'),
      array[p->>'subcategory_name', p->>'subcategory'],
      array[p->>'subcategory_name', p->>'product_type'],
      '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}',
      'DRY_STABLE',
      image_requirements,
      '{"default":["manufacturer sealed carton","anti-static packaging"]}',
      '{"customer_marketplace_visible":false,"asset_registry_required":true}',
      array['tier-5','infrastructure','governance-held'],
      900,
      false,
      'hidden',
      false,
      92,
      jsonb_build_object('moderation_state','governance_hold','duplicate_detection_keys',jsonb_build_array(p->>'subcategory', p->>'subcategory_name'))
    )
    on conflict (slug) do update
    set category_id = excluded.category_id,
        canonical_name = excluded.canonical_name,
        aliases = excluded.aliases,
        search_terms = excluded.search_terms,
        status = excluded.status,
        is_mvp_enabled = excluded.is_mvp_enabled,
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
      array[p->>'family_name', p->>'family'],
      array[p->>'family_name', p->>'product_type'],
      '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}',
      'DRY_STABLE',
      image_requirements,
      '{"default":["manufacturer sealed carton","anti-static packaging"]}',
      '{"customer_marketplace_visible":false,"asset_registry_required":true}',
      array['tier-5','capacity-planning','asset-registry'],
      false,
      'hidden',
      false,
      92,
      jsonb_build_object('moderation_state','governance_hold','duplicate_detection_keys',jsonb_build_array(p->>'family', p->>'family_name'))
    )
    on conflict (slug) do update
    set category_id = excluded.category_id,
        subcategory_id = excluded.subcategory_id,
        canonical_name = excluded.canonical_name,
        status = excluded.status,
        is_mvp_enabled = excluded.is_mvp_enabled,
        governance_metadata = public.product_families.governance_metadata || excluded.governance_metadata
    returning id into family_uuid;

    insert into public.brands (slug, canonical_name, manufacturer, origin_region, country_code, aliases, is_local_brand, metadata)
    values (
      p->>'brand',
      initcap(replace(p->>'brand','-',' ')),
      p->>'manufacturer',
      null,
      'IN',
      array[p->>'brand', p->>'manufacturer'],
      false,
      jsonb_build_object('source_dataset','tier5_architecture_capacity_catalog_ingestion','research_supported_brand_name',true,'customer_marketplace_visible',false)
    )
    on conflict (slug) do update
    set canonical_name = excluded.canonical_name,
        manufacturer = excluded.manufacturer,
        aliases = excluded.aliases,
        metadata = public.brands.metadata || excluded.metadata
    returning id into brand_uuid;

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
      p->>'product_type',
      brand_uuid,
      p->>'manufacturer',
      null,
      null,
      p->>'sku',
      'PRIVATE',
      'GOVERNANCE_HOLD',
      p->>'name',
      array(select value->>0 from jsonb_array_elements(p->'aliases') as alias(value)),
      array(select jsonb_array_elements_text(p->'tokens'->'context')),
      jsonb_build_object('regulated_procurement', true, 'customer_food_item', false, 'gst_profile', 'not_seeded'),
      '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}',
      jsonb_build_object(
        'source_dataset','tier5_architecture_capacity_catalog_ingestion',
        'source_research_type','architectural_capacity_specification',
        'canonical_search_identity', p->>'slug',
        'taxonomy_tier','tier_1_commerce_ontology',
        'normalization_tier','tier_1_5_governance_normalization',
        'discovery_tier','tier_2_multilingual_search',
        'operations_tier','tier_3_operational_intelligence',
        'ai_tier','tier_4_ai_ingestion_systems',
        'orchestration_tier','tier_5_autonomous_orchestration',
        'marketplace_visibility','governance_held_not_customer_facing',
        'search_metadata', p->'tokens',
        'operational_metadata', p->'operations',
        'image_ingestion', jsonb_build_object(
          'requirements', image_requirements,
          'image_search_terms', p->'image'->'search_terms',
          'visual_search_tags', p->'image'->'visual_search_tags',
          'packaging_visibility_required', true,
          'ocr_visibility_required_for', jsonb_build_array('SHELF','PACKAGING'),
          'duplicate_detection_hints', jsonb_build_array(lower(p->>'name'), p->>'slug', p->>'sku')
        ),
        'ai_ingestion_readiness', jsonb_build_object(
          'embedding_metadata', jsonb_build_object('model_family','multilingual_hybrid_dense_sparse','vector_index','infrastructure_catalog_hold'),
          'ocr_aliases', p->'aliases',
          'visual_search_tags', p->'image'->'visual_search_tags',
          'packaging_signatures', jsonb_build_object('manufacturer_label_required', true, 'model_number_required', true),
          'ai_match_tokens', (p->'tokens'->'search') || (p->'tokens'->'voice') || (p->'tokens'->'context')
        ),
        'inventory_generation', jsonb_build_object('starter_inventory_seeded', false, 'stock_count', null, 'seller_id', null, 'price', null, 'reason', 'architecture_research_provides_capacity_requirements_but_no_sellers_prices_or_stock_counts')
      ),
      'hidden',
      false,
      94,
      true,
      jsonb_build_object(
        'duplicate_detection_keys', jsonb_build_array(lower(p->>'name'), p->>'slug', p->>'sku'),
        'moderation_state','governance_hold_architecture_research_seed',
        'quality_indicators', jsonb_build_object('taxonomy_integrity',true,'variants_separate',true,'image_pipeline_ready',true,'inventory_placeholders_only',true,'consumer_marketplace_safe',true),
        'is_mvp_enabled', false,
        'replay_safe_seed', true,
        'hold_reason', p->>'governance_hold_reason'
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

    select id into unit_uuid from public.units where slug = p->>'unit';
    select id into packaging_uuid from public.packaging_types
    where slug = case when p->>'subcategory' in ('server-processors','gpu-accelerators','network-adapters','nvme-storage') then 'anti-static-component-pack' else 'manufacturer-sealed-infra-carton' end;

    insert into public.catalog_product_variants (
      product_id, variant_type, variant_name, quantity, unit_id, normalized_metric_value,
      normalized_metric_unit, packaging_type_id, shelf_life_hours, storage_requirement,
      fragile_flag, cold_chain_required, max_delivery_radius_km, freshness_window_minutes,
      sku_template, is_active, metadata, status, is_mvp_enabled, quality_score, governance_metadata
    )
    values (
      product_uuid,
      (p->>'variant_type')::public.variant_type,
      p->>'variant_name',
      null,
      unit_uuid,
      null,
      p->>'unit',
      packaging_uuid,
      null,
      p->'operations'->>'storage_requirements',
      true,
      false,
      null,
      null,
      p->>'sku_variant',
      false,
      jsonb_build_object(
        'source_dataset','tier5_architecture_capacity_catalog_ingestion',
        'sku_ready_identifier', p->>'sku_variant',
        'inventory_placeholder', jsonb_build_object('stock_count', null, 'seller_id', null, 'reason', 'asset registry or procurement workflow must provide real inventory'),
        'pricing_placeholder', jsonb_build_object('price', null, 'reason', 'research_does_not_provide_price'),
        'packaging_type', case when p->>'subcategory' in ('server-processors','gpu-accelerators','network-adapters','nvme-storage') then 'anti-static-component-pack' else 'manufacturer-sealed-infra-carton' end,
        'storage_requirements', p->'operations'->>'storage_requirements',
        'perishability', p->'operations'->>'perishability',
        'freshness_profile', p->'operations'->>'freshness_profile',
        'delivery_sensitivity', p->'operations'->>'delivery_sensitivity',
        'temperature_constraints', p->'operations'->'temperature_constraints_c',
        'asset_registry_required', true,
        'customer_marketplace_visible', false
      ),
      'hidden',
      false,
      94,
      jsonb_build_object('duplicate_detection_keys', jsonb_build_array(p->>'sku_variant', p->>'slug', lower(p->>'variant_name')), 'moderation_state','governance_hold_architecture_research_seed')
    )
    on conflict (sku_template) do update
    set variant_name = excluded.variant_name,
        packaging_type_id = excluded.packaging_type_id,
        storage_requirement = excluded.storage_requirement,
        is_active = excluded.is_active,
        metadata = public.catalog_product_variants.metadata || excluded.metadata,
        status = excluded.status,
        is_mvp_enabled = excluded.is_mvp_enabled,
        governance_metadata = public.catalog_product_variants.governance_metadata || excluded.governance_metadata
    returning id into variant_uuid;

    if perishability_uuid is not null and delivery_uuid is not null then
      insert into public.product_logistics_profiles (
        product_id, variant_id, perishability_profile_id, delivery_constraint_id, region_codes, notes, metadata
      )
      values (
        product_uuid, variant_uuid, perishability_uuid, delivery_uuid, all_regions,
        'Tier 5 infrastructure capacity catalog profile. Not customer-facing; procurement and asset registry integrations supply inventory.',
        jsonb_build_object(
          'temperature_constraints_c', p->'operations'->'temperature_constraints_c',
          'delivery_sensitivity', p->'operations'->>'delivery_sensitivity',
          'storage_requirements', p->'operations'->>'storage_requirements',
          'inventory_policy', p->'operations'->>'inventory_policy',
          'customer_marketplace_visible', false
        )
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
        'tier5_architecture_capacity_catalog_ingestion',
        jsonb_build_object('soundex_key', extensions.soundex(alias_item->>0), 'voice_ready', true, 'ocr_ready', true, 'customer_marketplace_visible', false)
      )
      on conflict (product_id, normalized_alias, alias_type, language) do update
      set confidence = greatest(public.product_aliases.confidence, excluded.confidence),
          metadata = public.product_aliases.metadata || excluded.metadata;
    end loop;

    for token_item in
      select jsonb_build_object('token', value, 'type', 'SEMANTIC', 'language', 'roman') from jsonb_array_elements_text(p->'tokens'->'search')
      union all
      select jsonb_build_object('token', value, 'type', 'PHONETIC', 'language', 'roman') from jsonb_array_elements_text(p->'tokens'->'phonetic')
      union all
      select jsonb_build_object('token', value, 'type', 'TRANSLITERATION', 'language', 'roman') from jsonb_array_elements_text(p->'tokens'->'transliteration')
      union all
      select jsonb_build_object('token', value, 'type', 'PHONETIC', 'language', 'roman') from jsonb_array_elements_text(p->'tokens'->'voice')
      union all
      select jsonb_build_object('token', value, 'type', 'RECIPE', 'language', 'roman') from jsonb_array_elements_text(p->'tokens'->'recipe')
      union all
      select jsonb_build_object('token', value, 'type', 'INTENT', 'language', 'roman') from jsonb_array_elements_text(p->'tokens'->'festival')
      union all
      select jsonb_build_object('token', value, 'type', 'INTENT', 'language', 'roman') from jsonb_array_elements_text(p->'tokens'->'context')
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
        case token_item->>'type' when 'SEMANTIC' then 1.05 else 0.85 end,
        jsonb_build_object('source_dataset','tier5_architecture_capacity_catalog_ingestion','qdrant_hybrid_ready',true,'customer_marketplace_visible',false)
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
        'catalog-ingestion/pending/tier5-infrastructure-capacity/' || (p->>'slug') || '/' || lower(v_image_kind) || '.webp',
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
      product_uuid, 94, 'A-',
      96, 86, 96, 94, 92, 0, 10, 82, 'hidden',
      jsonb_build_array(
        jsonb_build_object('code','governance_hold','severity','info','detail','Infrastructure capacity item is intentionally hidden from customer marketplace discovery.'),
        jsonb_build_object('code','inventory_not_seeded','severity','info','detail','No stock, seller, or pricing seeded because the research does not provide them.'),
        jsonb_build_object('code','multilingual_limited_by_source','severity','info','detail','No Tamil or other non-English aliases were invented because the source only names infrastructure in English/roman form.')
      ),
      '2026-05-30 00:00:00+05:30'::timestamptz
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
