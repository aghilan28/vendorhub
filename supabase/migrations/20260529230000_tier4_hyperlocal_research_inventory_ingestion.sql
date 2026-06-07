create extension if not exists "pgcrypto";
create extension if not exists "fuzzystrmatch" with schema extensions;

create unique index if not exists tier4_hyperlocal_search_tokens_replay_idx
  on public.search_tokens(product_id, normalized_token, token_type, language)
  where product_id is not null;

create unique index if not exists tier4_hyperlocal_catalog_images_replay_idx
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
  region_code public.commerce_region;
  all_regions public.commerce_region[] := array['TN','KL','KA','AP','TS']::public.commerce_region[];
  image_requirements jsonb := '{
    "required":["HERO","TRANSPARENT_PNG","SHELF","PACKAGING","MOBILE_THUMBNAIL"],
    "preferred_aspect_ratios":["1:1","4:5","16:9"],
    "minimum_width":1200,
    "minimum_height":1200,
    "webp_required":true,
    "watermark_allowed":false,
    "reject_marketplace_screenshot":true,
    "reject_fake_ai_packaging":true,
    "real_image_only":true,
    "ocr_required_for":["SHELF","PACKAGING"],
    "packaging_focus_areas":["front_label","unit_marker","expiry_or_batch_area","seal_integrity"],
    "validation":{"background":"matte_white_or_clean_retail_shelf","duplicate_hash_required":true,"visual_embedding_required":true}
  }'::jsonb;
  products jsonb := $json$
[
  {
    "slug":"freshly-ground-idli-dosa-batter",
    "sku":"T4-TN-BATTER-FRESH-IDLI-DOSA",
    "name":"Freshly Ground Idli & Dosa Batter",
    "description":"Freshly ground fermented rice and lentil batter for idli and dosa, modeled as an ultra time-sensitive morning fresh commerce item.",
    "short":"Freshly ground idli and dosa batter for morning tiffin demand.",
    "department":"tiffin-batter-products",
    "department_name":"Tiffin & Batter Products",
    "category":"ready-to-cook-batters",
    "category_name":"Ready-to-Cook Batters",
    "subcategory":"wet-batters",
    "subcategory_name":"Wet Batters",
    "family":"freshly-ground-fermented-batter",
    "family_name":"Freshly Ground Fermented Batter",
    "product_type":"LOCAL",
    "brand":"local-unbranded",
    "manufacturer":"Local batter grinders and dark-store commissaries",
    "region":"TN",
    "perishability":"hyperlocal-fresh-batter-24h-chilled",
    "delivery":"batter-morning-cold-chain-critical",
    "variants":[
      {
        "name":"Seller-defined chilled wet batter unit",
        "type":"PACKET",
        "unit":"kilogram",
        "metric_unit":"g",
        "packaging":"seller-sealed-chilled-pouch",
        "shelf_life":24,
        "storage":"refrigerated",
        "cold":true,
        "sku":"T4-TN-BATTER-FRESH-IDLI-DOSA-CHILLED-UNIT"
      }
    ],
    "aliases":[
      ["idli batter","REGIONAL","roman"],
      ["dosa batter","REGIONAL","roman"],
      ["idli dosa batter","REGIONAL","roman"],
      ["idli dosa maavu","VOICE","roman"],
      ["dosa maavu","VOICE","roman"],
      ["idly batter","MISSPELLING","roman"],
      ["fresh batter","SHORTHAND","roman"]
    ],
    "tokens":{
      "search":["freshly ground idli batter","freshly ground dosa batter","idli dosa batter","wet batter","fermented batter","morning breakfast batter"],
      "phonetic":["idli dosa maavu","dosa maavu","idly batter"],
      "transliteration":["idli dosa maavu","dosa maavu"],
      "voice":["idli batter","dosa batter","fresh batter"],
      "recipe":["idli steaming","dosa cooking","uttapam griddling","paniyaram making"],
      "festival":[],
      "context":["morning breakfast basket","06:00-09:00 peak demand","apartment breakfast delivery","same-day tiffin prep"]
    },
    "operations":{
      "perishability":"SHORT_SHELF",
      "freshness_profile":"fermented wet batter; rapid quality loss when warm",
      "delivery_sensitivity":"cold-chain break, packet swelling, souring, leakage",
      "storage_requirements":"refrigerated",
      "temperature_constraints_c":{"min":2,"max":6,"critical_max":10},
      "shelf_life_hours":24,
      "freshness_window_minutes":180,
      "peak_purchase_window":"06:00-09:00",
      "inventory_policy":"placeholder_only_until_seller_batch_is_registered"
    },
    "image":{
      "search_terms":["fresh idli dosa batter pouch white background","fresh wet batter retail pouch shelf","idli dosa batter chilled pack"],
      "visual_search_tags":["wet_batter","chilled_pouch","breakfast","idli","dosa","fermented"]
    },
    "tax":{"hsn_code":"2106","gst_profile":"5_percent_gst"}
  },
  {
    "slug":"coriander-leaves",
    "sku":"T4-TN-HERB-CORIANDER-LEAVES",
    "name":"Coriander Leaves",
    "description":"Fresh coriander leaves for hyperlocal cooking baskets, modeled as a high-hydration herb with rapid wilting under heat.",
    "short":"Fresh coriander leaves for garnish, chutney, rasam, and sambar.",
    "department":"fruits-vegetables",
    "department_name":"Fruits & Vegetables",
    "category":"fresh-herbs",
    "category_name":"Fresh Herbs",
    "subcategory":"loose-fresh-herbs",
    "subcategory_name":"Loose Fresh Herbs",
    "family":"fresh-coriander-herbs",
    "family_name":"Fresh Coriander Herbs",
    "product_type":"BUNDLE",
    "brand":"local-unbranded",
    "manufacturer":"Regional mandi and dark-store sourcing partners",
    "region":"TN",
    "perishability":"same-day-fresh-herb-cold-breathable",
    "delivery":"leafy-herb-bike-delivery-critical",
    "variants":[
      {
        "name":"Loose herb bundle",
        "type":"BUNDLE",
        "unit":"piece",
        "metric_unit":"bundle",
        "packaging":"leafy-kattu-bundle",
        "shelf_life":48,
        "storage":"refrigerated_or_breathable_cool",
        "cold":false,
        "sku":"T4-TN-HERB-CORIANDER-LEAVES-BUNDLE"
      }
    ],
    "aliases":[
      ["coriander","REGIONAL","roman"],
      ["coriander leaves","REGIONAL","roman"],
      ["kothamalli","VOICE","roman"],
      ["malli","SLANG","roman"],
      ["dhania","REGIONAL","hi"],
      ["kothimeera","REGIONAL","te"],
      ["kottambari","REGIONAL","kn"],
      ["kothamaly","MISSPELLING","roman"],
      ["kothmalli","MISSPELLING","roman"]
    ],
    "tokens":{
      "search":["coriander leaves","fresh coriander","kothamalli","malli","dhania","sambar coriander","rasam coriander"],
      "phonetic":["kothamalli","kothamaly","kothmalli"],
      "transliteration":["kothamalli","malli","kothimeera","kottambari"],
      "voice":["coriander leaves","malli","kothamalli","dhania"],
      "recipe":["rasam garnish","sambar garnish","coriander chutney","tomato coriander rasam"],
      "festival":[],
      "context":["leafy herb","same-day freshness","morning vegetable basket","high hydration herb"]
    },
    "operations":{
      "perishability":"SAME_DAY_FRESH",
      "freshness_profile":"high hydration fresh herb; rapid wilting and aroma loss",
      "delivery_sensitivity":"wilting, yellowing, aroma loss, crushing",
      "storage_requirements":"breathable cool storage",
      "temperature_constraints_c":{"min":4,"max":6},
      "shelf_life_hours":48,
      "freshness_window_minutes":90,
      "co_storage_exclusions":["banana","mango","country-tomato"],
      "inventory_policy":"placeholder_only_until_store_bundle_stock_is_registered"
    },
    "image":{
      "search_terms":["fresh coriander leaves bunch white background","kothamalli bunch retail shelf","coriander herb bundle"],
      "visual_search_tags":["coriander","leafy_herb","green_bunch","thin_stems","fresh_garnish"]
    },
    "tax":{"hsn_code":"chapter_7_9_fresh_herbs","gst_profile":"exempt"}
  },
  {
    "slug":"nilgiri-tea",
    "sku":"T4-TN-BEV-NILGIRI-TEA",
    "name":"Nilgiri Tea",
    "description":"Nilgiri tea modeled for regional beverage discovery and interstate dispatch scenarios without seeding unsupported package sizes.",
    "short":"Canonical Nilgiri tea record for tea-time and regional beverage discovery.",
    "department":"beverages",
    "department_name":"Beverages",
    "category":"tea-coffee",
    "category_name":"Tea and Coffee",
    "subcategory":"regional-tea",
    "subcategory_name":"Regional Tea",
    "family":"nilgiri-tea-staples",
    "family_name":"Nilgiri Tea Staples",
    "product_type":"LOCAL",
    "brand":"loose-staples",
    "manufacturer":"Regional tea wholesalers",
    "region":"TN",
    "perishability":"dry-tea-stable-humidity-sensitive",
    "delivery":"dry-staple-humidity-safe",
    "variants":[
      {
        "name":"Seller-defined dry tea unit",
        "type":"WEIGHT",
        "unit":"gram",
        "metric_unit":"g",
        "packaging":"seller-sealed-dry-pouch",
        "shelf_life":8760,
        "storage":"ambient_dry",
        "cold":false,
        "sku":"T4-TN-BEV-NILGIRI-TEA-DRY-UNIT"
      }
    ],
    "aliases":[
      ["nilgiri tea","REGIONAL","roman"],
      ["nilgiris tea","REGIONAL","roman"],
      ["nilgiri chai","VOICE","roman"],
      ["tea dust","REGIONAL","roman"],
      ["tea powder","REGIONAL","roman"],
      ["chai patti","VOICE","hi"]
    ],
    "tokens":{
      "search":["nilgiri tea","nilgiris tea","tea dust","tea powder","regional tea","tea kadai tea"],
      "phonetic":["nilgiri chai","nilgiris tea"],
      "transliteration":["chai patti","tea thool"],
      "voice":["nilgiri tea","nilgiri chai","tea powder"],
      "recipe":["tea brewing","milk tea","chai"],
      "festival":[],
      "context":["tea-time basket","inter-state dispatch","humidity-sensitive dry staple","evening tea"]
    },
    "operations":{
      "perishability":"DRY_STABLE",
      "freshness_profile":"dry tea aroma and humidity sensitivity",
      "delivery_sensitivity":"moisture ingress, aroma loss, odor absorption",
      "storage_requirements":"ambient dry sealed storage",
      "temperature_constraints_c":{"min":0,"max":35},
      "shelf_life_hours":8760,
      "freshness_window_minutes":null,
      "inventory_policy":"placeholder_only_until_seller_pack_or_loose_bin_is_registered"
    },
    "image":{
      "search_terms":["nilgiri tea dry leaves pouch white background","regional tea powder shelf pack","loose tea dust clean retail image"],
      "visual_search_tags":["tea","dry_staple","nilgiri","tea_dust","sealed_pouch"]
    },
    "tax":{"hsn_code":"regional_tea","gst_profile":"not_seeded"}
  }
]
$json$::jsonb;
begin
  insert into public.packaging_types (slug, name, description, supports_loose_weight, supports_ocr, leak_risk, crush_risk, metadata)
  values
    ('seller-sealed-chilled-pouch', 'Seller Sealed Chilled Pouch', 'Seller-defined sealed chilled pouch for fresh wet batter. Quantity and price are supplied by seller inventory, not by the canonical seed.', false, true, 0.45, 0.25, '{"source_dataset":"tier4_hyperlocal_research_inventory_ingestion","canonical_only":true}'),
    ('seller-sealed-dry-pouch', 'Seller Sealed Dry Pouch', 'Seller-defined sealed dry pouch for tea or dry staples. Quantity and price are supplied by seller inventory, not by the canonical seed.', false, true, 0.02, 0.15, '{"source_dataset":"tier4_hyperlocal_research_inventory_ingestion","canonical_only":true}')
  on conflict (slug) do update
  set description = excluded.description,
      supports_ocr = excluded.supports_ocr,
      metadata = public.packaging_types.metadata || excluded.metadata;

  insert into public.perishability_profiles (
    slug, name, perishability_class, shelf_life_hours, freshness_window_minutes, storage_requirement,
    heat_sensitivity, spoilage_rate, delivery_urgency, max_transit_duration_minutes,
    refrigeration_required, sunlight_sensitivity, stackability, leak_risk, odor_sensitivity, breakability, metadata
  )
  values
    ('hyperlocal-fresh-batter-24h-chilled', 'Hyperlocal Fresh Batter 24h Chilled', 'SHORT_SHELF', 24, 180, 'refrigerated', 0.9, 0.82, 0.95, 60, true, 0.4, 0.45, 0.45, 0.25, 0.25, '{"temperature_constraints_c":{"min":2,"max":6,"critical_max":10},"morning_peak_window":"06:00-09:00"}'),
    ('same-day-fresh-herb-cold-breathable', 'Same Day Fresh Herb Cold Breathable', 'SAME_DAY_FRESH', 48, 90, 'refrigerated_or_breathable_cool', 0.86, 0.78, 0.9, 60, false, 0.55, 0.25, 0.05, 0.35, 0.7, '{"temperature_constraints_c":{"min":4,"max":6},"high_hydration":true}'),
    ('dry-tea-stable-humidity-sensitive', 'Dry Tea Stable Humidity Sensitive', 'DRY_STABLE', 8760, null, 'ambient_dry', 0.2, 0.05, 0.2, 180, false, 0.25, 0.8, 0.02, 0.65, 0.15, '{"humidity_sensitivity":"high","odor_absorption_risk":true}')
  on conflict (slug) do update
  set shelf_life_hours = excluded.shelf_life_hours,
      freshness_window_minutes = excluded.freshness_window_minutes,
      storage_requirement = excluded.storage_requirement,
      metadata = public.perishability_profiles.metadata || excluded.metadata;

  insert into public.delivery_constraints (
    slug, name, max_delivery_radius_km, max_transit_duration_minutes, cold_chain_required,
    insulated_delivery_required, ice_required, fragile_flag, stackable, morning_priority, route_batching_allowed, metadata
  )
  values
    ('batter-morning-cold-chain-critical', 'Batter Morning Cold Chain Critical', 5, 60, true, true, false, false, true, true, true, '{"peak_window":"06:00-09:00","backpressure_sensitive":true}'),
    ('leafy-herb-bike-delivery-critical', 'Leafy Herb Bike Delivery Critical', 4, 60, false, true, false, true, false, true, false, '{"avoid_ethylene_emitters":true,"humidity_sensitive":true}'),
    ('dry-staple-humidity-safe', 'Dry Staple Humidity Safe', 8, 180, false, false, false, false, true, false, true, '{"keep_dry":true,"odor_isolation":true}')
  on conflict (slug) do update
  set max_delivery_radius_km = excluded.max_delivery_radius_km,
      max_transit_duration_minutes = excluded.max_transit_duration_minutes,
      metadata = public.delivery_constraints.metadata || excluded.metadata;

  foreach p in array array(select jsonb_array_elements(products))
  loop
    region_code := (p->>'region')::public.commerce_region;

    select id into dept_uuid from public.departments where slug = p->>'department';

    if dept_uuid is null then
      insert into public.departments (
        slug, canonical_name, multilingual_names, aliases, search_terms, regional_priority, seasonality,
        perishability_class, image_requirements, packaging_defaults, fulfillment_constraints, discovery_tags,
        sort_order, is_active, status, is_mvp_enabled, quality_score, governance_metadata
      )
      values (
        p->>'department', p->>'department_name', jsonb_build_object('en', p->>'department_name'),
        array[p->>'department_name'], array[p->>'department_name'],
        '{"TN":100,"KL":100,"KA":100,"AP":100,"TS":100}'::jsonb, '{}'::jsonb,
        case p->'operations'->>'perishability'
          when 'SAME_DAY_FRESH' then 'SAME_DAY_FRESH'::public.perishability_class
          when 'DRY_STABLE' then 'DRY_STABLE'::public.perishability_class
          else 'SHORT_SHELF'::public.perishability_class
        end,
        image_requirements, '{}'::jsonb, '{"canonicalSeedOnly":true}'::jsonb,
        array['hyperlocal','south-india'], 230, true, 'active', true, 96,
        '{"source_dataset":"tier4_hyperlocal_research_inventory_ingestion","moderation_state":"approved_curated_research_seed"}'::jsonb
      )
      on conflict (slug) do update
      set canonical_name = excluded.canonical_name,
          governance_metadata = public.departments.governance_metadata || excluded.governance_metadata
      returning id into dept_uuid;
    end if;

    insert into public.categories (
      name, slug, description, sort_order, is_active, department_id, canonical_name, aliases, search_terms,
      regional_priority, perishability_class, image_requirements, packaging_defaults, fulfillment_constraints,
      discovery_tags, taxonomy_level, ontology_metadata, status, is_mvp_enabled, quality_score, governance_metadata
    )
    values (
      p->>'category_name', p->>'category', 'Canonical category required by Tier 4 hyperlocal research inventory ingestion.',
      230, true, dept_uuid, p->>'category_name', array[p->>'category_name'], array[p->>'category_name', p->>'category'],
      '{"TN":100,"KL":100,"KA":100,"AP":100,"TS":100}'::jsonb,
      case p->'operations'->>'perishability'
        when 'SAME_DAY_FRESH' then 'SAME_DAY_FRESH'::public.perishability_class
        when 'DRY_STABLE' then 'DRY_STABLE'::public.perishability_class
        else 'SHORT_SHELF'::public.perishability_class
      end,
      image_requirements, jsonb_build_object('canonical_packaging_required', true),
      '{"canonicalSeedOnly":true,"sellerInventoryRequiredForStock":true}'::jsonb,
      array['hyperlocal','south-india','tier-4-ingestion'], 'CATEGORY',
      jsonb_build_object('source_dataset','tier4_hyperlocal_research_inventory_ingestion','taxonomy_tier','tier_1'),
      'active', true, 96,
      jsonb_build_object('duplicate_detection_keys', jsonb_build_array(p->>'category', p->>'department'), 'moderation_state','approved_curated_research_seed')
    )
    on conflict (slug) do update
    set department_id = excluded.department_id,
        canonical_name = excluded.canonical_name,
        image_requirements = public.categories.image_requirements || excluded.image_requirements,
        ontology_metadata = public.categories.ontology_metadata || excluded.ontology_metadata,
        governance_metadata = public.categories.governance_metadata || excluded.governance_metadata
    returning id into cat_uuid;

    insert into public.subcategories (
      department_id, category_id, slug, canonical_name, aliases, search_terms, regional_priority,
      perishability_class, image_requirements, packaging_defaults, fulfillment_constraints, discovery_tags,
      sort_order, is_active, status, is_mvp_enabled, quality_score, governance_metadata
    )
    values (
      dept_uuid, cat_uuid, p->>'subcategory', p->>'subcategory_name',
      array[p->>'subcategory_name'], array[p->>'subcategory_name', p->>'subcategory'],
      '{"TN":100,"KL":100,"KA":100,"AP":100,"TS":100}'::jsonb,
      case p->'operations'->>'perishability'
        when 'SAME_DAY_FRESH' then 'SAME_DAY_FRESH'::public.perishability_class
        when 'DRY_STABLE' then 'DRY_STABLE'::public.perishability_class
        else 'SHORT_SHELF'::public.perishability_class
      end,
      image_requirements, jsonb_build_object('canonical_packaging_required', true),
      '{"canonicalSeedOnly":true,"sellerInventoryRequiredForStock":true}'::jsonb,
      array['hyperlocal','south-india','tier-4-ingestion'], 230, true, 'active', true, 96,
      jsonb_build_object('duplicate_detection_keys', jsonb_build_array(p->>'subcategory', p->>'category'), 'moderation_state','approved_curated_research_seed')
    )
    on conflict (slug) do update
    set category_id = excluded.category_id,
        canonical_name = excluded.canonical_name,
        governance_metadata = public.subcategories.governance_metadata || excluded.governance_metadata
    returning id into subcat_uuid;

    insert into public.product_families (
      department_id, category_id, subcategory_id, slug, canonical_name, product_group, aliases, search_terms,
      regional_priority, perishability_class, image_requirements, packaging_defaults, fulfillment_constraints,
      discovery_tags, is_active, status, is_mvp_enabled, quality_score, governance_metadata
    )
    values (
      dept_uuid, cat_uuid, subcat_uuid, p->>'family', p->>'family_name', p->>'subcategory_name',
      array[p->>'family_name'], array[p->>'family_name', p->>'name'],
      '{"TN":100,"KL":100,"KA":100,"AP":100,"TS":100}'::jsonb,
      case p->'operations'->>'perishability'
        when 'SAME_DAY_FRESH' then 'SAME_DAY_FRESH'::public.perishability_class
        when 'DRY_STABLE' then 'DRY_STABLE'::public.perishability_class
        else 'SHORT_SHELF'::public.perishability_class
      end,
      image_requirements, jsonb_build_object('canonical_packaging_required', true),
      '{"canonicalSeedOnly":true,"sellerInventoryRequiredForStock":true}'::jsonb,
      array['hyperlocal','south-india','tier-4-ingestion'], true, 'active', true, 97,
      jsonb_build_object('duplicate_detection_keys', jsonb_build_array(p->>'family', p->>'subcategory'), 'moderation_state','approved_curated_research_seed')
    )
    on conflict (slug) do update
    set subcategory_id = excluded.subcategory_id,
        canonical_name = excluded.canonical_name,
        governance_metadata = public.product_families.governance_metadata || excluded.governance_metadata
    returning id into family_uuid;

    select id into brand_uuid from public.brands where slug = p->>'brand';
    select id into perishability_uuid from public.perishability_profiles where slug = p->>'perishability';
    select id into delivery_uuid from public.delivery_constraints where slug = p->>'delivery';

    insert into public.master_products (
      canonical_name, normalized_name, slug, description, short_description, department_id, category_id,
      subcategory_id, product_family_id, product_group, product_type, brand_id, manufacturer, origin_region,
      hsn_code, internal_sku, seller_visibility, active_status, english_name, romanized_variants, discovery_tags,
      dietary_classification, regional_priority, metadata, status, is_mvp_enabled, quality_score,
      moderation_required, governance_metadata
    )
    values (
      p->>'name', lower(regexp_replace(p->>'name', '[^a-zA-Z0-9]+', ' ', 'g')), p->>'slug',
      p->>'description', p->>'short', dept_uuid, cat_uuid, subcat_uuid, family_uuid, p->>'family_name',
      p->>'product_type', brand_uuid, p->>'manufacturer', region_code, p->'tax'->>'hsn_code',
      p->>'sku', 'PUBLIC', 'ACTIVE', p->>'name',
      array(select value->>0 from jsonb_array_elements(p->'aliases') as alias(value)),
      array(select jsonb_array_elements_text(p->'tokens'->'context')),
      jsonb_build_object('vegetarian', true, 'gst_profile', p->'tax'->>'gst_profile'),
      jsonb_build_object(p->>'region', 100, 'TN', 90, 'KL', 85, 'KA', 85, 'AP', 85, 'TS', 85),
      jsonb_build_object(
        'source_dataset','tier4_hyperlocal_research_inventory_ingestion',
        'canonical_search_identity', p->>'slug',
        'taxonomy_tier','tier_1_commerce_ontology',
        'normalization_tier','tier_1_5_governance_normalization',
        'discovery_tier','tier_2_multilingual_search',
        'operations_tier','tier_3_operational_intelligence',
        'ai_tier','tier_4_ai_ingestion_systems',
        'orchestration_tier','tier_5_autonomous_orchestration',
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
          'embedding_metadata', jsonb_build_object('model_family','multilingual_hybrid_dense_sparse','vector_index','qdrant_blue_green_ready'),
          'ocr_aliases', p->'aliases',
          'visual_search_tags', p->'image'->'visual_search_tags',
          'packaging_signatures', jsonb_build_object('canonical_packaging_slots_required', true),
          'ai_match_tokens', (p->'tokens'->'search') || (p->'tokens'->'voice') || (p->'tokens'->'context')
        ),
        'inventory_generation', jsonb_build_object('starter_inventory_seeded', false, 'stock_count', null, 'seller_id', null, 'price', null, 'reason', 'research_does_not_provide_stock_counts_sellers_or_prices')
      ),
      'active', true, 97, false,
      jsonb_build_object(
        'duplicate_detection_keys', jsonb_build_array(lower(p->>'name'), p->>'slug', p->>'sku'),
        'moderation_state','approved_curated_research_seed',
        'quality_indicators', jsonb_build_object('taxonomy_integrity',true,'variants_separate',true,'multilingual_aliases',true,'image_pipeline_ready',true,'inventory_placeholders_only',true),
        'is_mvp_enabled', true,
        'replay_safe_seed', true
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
        hsn_code = excluded.hsn_code,
        romanized_variants = excluded.romanized_variants,
        discovery_tags = excluded.discovery_tags,
        metadata = public.master_products.metadata || excluded.metadata,
        governance_metadata = public.master_products.governance_metadata || excluded.governance_metadata,
        status = 'active',
        quality_score = greatest(public.master_products.quality_score, excluded.quality_score)
    returning id into product_uuid;

    foreach v in array array(select jsonb_array_elements(p->'variants'))
    loop
      select id into unit_uuid from public.units where slug = v->>'unit';
      select id into packaging_uuid from public.packaging_types where slug = v->>'packaging';

      insert into public.catalog_product_variants (
        product_id, variant_type, variant_name, quantity, unit_id, normalized_metric_value,
        normalized_metric_unit, packaging_type_id, shelf_life_hours, storage_requirement,
        fragile_flag, cold_chain_required, max_delivery_radius_km, freshness_window_minutes,
        sku_template, is_active, metadata, status, is_mvp_enabled, quality_score, governance_metadata
      )
      values (
        product_uuid, (v->>'type')::public.variant_type, v->>'name', null, unit_uuid, null,
        v->>'metric_unit', packaging_uuid, (v->>'shelf_life')::integer, v->>'storage',
        case when p->'operations'->>'perishability' = 'SAME_DAY_FRESH' then true else false end,
        coalesce((v->>'cold')::boolean, false),
        case when p->>'delivery' = 'dry-staple-humidity-safe' then 8 else 5 end,
        nullif(p->'operations'->>'freshness_window_minutes','')::integer,
        v->>'sku', true,
        jsonb_build_object(
          'source_dataset','tier4_hyperlocal_research_inventory_ingestion',
          'sku_ready_identifier', v->>'sku',
          'inventory_placeholder', jsonb_build_object('stock_count', null, 'seller_id', null, 'reason', 'canonical product only'),
          'pricing_placeholder', jsonb_build_object('price', null, 'reason', 'research_does_not_provide_price'),
          'packaging_type', v->>'packaging',
          'storage_requirements', v->>'storage',
          'perishability', p->'operations'->>'perishability',
          'freshness_profile', p->'operations'->>'freshness_profile',
          'delivery_sensitivity', p->'operations'->>'delivery_sensitivity',
          'temperature_constraints', p->'operations'->'temperature_constraints_c',
          'seller_inventory_requires_real_batch_or_pack', true
        ),
        'active', true, 97,
        jsonb_build_object('duplicate_detection_keys', jsonb_build_array(v->>'sku', p->>'slug', lower(v->>'name')), 'moderation_state','approved_curated_research_seed')
      )
      on conflict (sku_template) do update
      set variant_name = excluded.variant_name,
          packaging_type_id = excluded.packaging_type_id,
          shelf_life_hours = excluded.shelf_life_hours,
          storage_requirement = excluded.storage_requirement,
          cold_chain_required = excluded.cold_chain_required,
          metadata = public.catalog_product_variants.metadata || excluded.metadata,
          governance_metadata = public.catalog_product_variants.governance_metadata || excluded.governance_metadata
      returning id into variant_uuid;

      insert into public.product_logistics_profiles (
        product_id, variant_id, perishability_profile_id, delivery_constraint_id, region_codes, notes, metadata
      )
      values (
        product_uuid, variant_uuid, perishability_uuid, delivery_uuid, all_regions,
        'Tier 4 research ingestion logistics profile. Stock and price remain seller supplied.',
        jsonb_build_object(
          'temperature_constraints_c', p->'operations'->'temperature_constraints_c',
          'delivery_sensitivity', p->'operations'->>'delivery_sensitivity',
          'storage_requirements', p->'operations'->>'storage_requirements',
          'shelf_life_hours', p->'operations'->>'shelf_life_hours',
          'adaptive_concurrency_peak_context', jsonb_build_object('morning_spike_window','06:00-09:00','canonical_record_only',true)
        )
      )
      on conflict (product_id, variant_id, perishability_profile_id, delivery_constraint_id) do update
      set notes = excluded.notes,
          metadata = public.product_logistics_profiles.metadata || excluded.metadata;
    end loop;

    for alias_item in select value from jsonb_array_elements(p->'aliases')
    loop
      insert into public.product_aliases (
        product_id, alias, normalized_alias, alias_type, language, region_codes, confidence, source, metadata
      )
      values (
        product_uuid, alias_item->>0, lower(regexp_replace(alias_item->>0, '\s+', ' ', 'g')),
        (alias_item->>1)::public.product_alias_type, (alias_item->>2)::public.commerce_language,
        all_regions, case when alias_item->>1 = 'MISSPELLING' then 0.82 else 0.95 end,
        'tier4_hyperlocal_research_inventory_ingestion',
        jsonb_build_object('soundex_key', extensions.soundex(alias_item->>0), 'voice_ready', true, 'ocr_ready', true)
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
        product_uuid, token_item->>'token', lower(token_item->>'token'),
        (token_item->>'type')::public.search_token_type, (token_item->>'language')::public.commerce_language,
        all_regions, array(select jsonb_array_elements_text(p->'tokens'->'recipe')),
        array(select jsonb_array_elements_text(p->'tokens'->'context')),
        case token_item->>'type' when 'SEMANTIC' then 1.1 when 'RECIPE' then 0.95 else 0.9 end,
        jsonb_build_object('source_dataset','tier4_hyperlocal_research_inventory_ingestion','qdrant_hybrid_ready',true)
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
        product_uuid, variant_uuid, v_image_kind::public.product_image_kind,
        'catalog-ingestion/pending/tier4-hyperlocal-research/' || (p->>'slug') || '/' || lower(v_image_kind) || '.webp',
        (p->>'name') || ' ' || lower(replace(v_image_kind, '_', ' ')) || ' ingestion slot',
        case when v_image_kind = 'SHELF' then 1600 else 1200 end,
        case when v_image_kind = 'SHELF' then 900 else 1200 end,
        case when v_image_kind = 'SHELF' then '16:9' when v_image_kind = 'MOBILE_THUMBNAIL' then '1:1' else '4:5' end,
        'image/webp', true, true, true, 'pending_validation', 0,
        case when v_image_kind in ('PACKAGING','SHELF') then 0.85 else 0.65 end,
        case when v_image_kind in ('PACKAGING','SHELF') then 0.8 else 0.4 end,
        array[]::text[],
        jsonb_build_object(
          'image_requirements', image_requirements,
          'image_search_terms', p->'image'->'search_terms',
          'visual_search_tags', p->'image'->'visual_search_tags',
          'duplicate_detection_hints', jsonb_build_array(p->>'slug', p->>'sku', lower(v_image_kind)),
          'status','pending_asset_ingestion',
          'reject_watermark', true,
          'reject_marketplace_screenshot', true,
          'reject_fake_ai_packaging', true
        )
      )
      on conflict (product_id, image_kind, storage_path) do update
      set metadata = public.catalog_product_images.metadata || excluded.metadata,
          packaging_visibility = excluded.packaging_visibility,
          ocr_readability = excluded.ocr_readability;
    end loop;

    insert into public.product_quality_scores (
      product_id, score, grade, metadata_completeness_score, image_quality_score, category_consistency_score,
      variant_validity_score, search_readiness_score, seller_usage_score, duplicate_confidence_score,
      moderation_confidence_score, auto_visibility, findings, scored_at
    )
    values (
      product_uuid, 97, 'A',
      98, 90, 98, 95, 98, 0, 8, 95, 'active',
      jsonb_build_array(jsonb_build_object('code','inventory_not_seeded','severity','info','detail','Canonical product is ready; seller stock and pricing intentionally remain null.')),
      '2026-05-29 23:00:00+05:30'::timestamptz
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
