create extension if not exists "pgcrypto";
create extension if not exists "fuzzystrmatch";

create unique index if not exists catalog_product_variants_sku_template_unique_idx
  on public.catalog_product_variants(sku_template);

do $$
declare
  p jsonb;
  alias_key text;
  alias_value text;
  token text;
  image_kind text;
  product_uuid uuid;
  variant_uuid uuid;
  dept_uuid uuid;
  cat_uuid uuid;
  subcat_uuid uuid;
  family_uuid uuid;
  unit_uuid uuid;
  packaging_uuid uuid;
  perishability_uuid uuid;
  delivery_uuid uuid;
  variant_sku text;
  product_sku text;
  alias_parts text[];
  native_name text;
  romanized_aliases text[];
  image_requirements jsonb := '{
    "required":["HERO","TRANSPARENT_PNG","SHELF","PACKAGING","MOBILE_THUMBNAIL"],
    "preferred_aspect_ratios":["1:1","4:5"],
    "webp_required":true,
    "watermark_allowed":false,
    "reject_marketplace_screenshot":true,
    "reject_fake_ai_packaging":true,
    "real_image_only":true,
    "loose_product_image_allowed":true,
    "ocr_required_for":["SHELF","PACKAGING"],
    "validation":{"minimum_width":1200,"minimum_height":1200,"background":"matte_white_or_clean_retail_shelf","scale_reference_required":true}
  }'::jsonb;
  products jsonb := $json$
[
  {"code":"BIT","slug":"bitter-gourd","name":"Bitter Gourd","botanical":"Momordica charantia","class":"fresh","shelf":336,"temp":{"min_c":7.2,"max_c":12.2},"rh":"90-95","aliases":{"ta":"Paavakkai","te":"Kakarakaya / Kakara Kayi","kn":"Hagalkai / Haggala Kai / Hagara Kai","ml":"Paval / Kaipakka / Pavakka","hi":"Karela"},"recipes":["poriyal","kootu","fry","stir fry"],"context":["diabetic","bitter vegetable","weekday cooking"]},
  {"code":"BRI","slug":"brinjal","name":"Brinjal","botanical":"Solanum melongena","class":"fresh","shelf":336,"temp":{"min_c":7.8,"max_c":12.2},"rh":"90-95","aliases":{"ta":"Kathiri kai / Kathirikai","te":"Vankaya / Sannvankaya","kn":"Badane / Badhanekayi / Badanekai / Gulla","ml":"Vazhuthinanga / Vazhuthananga","hi":"Baingan"},"recipes":["sambar","poriyal","curry","gutti vankaya"],"context":["sambar vegetable","stir fry","daily cooking"]},
  {"code":"BOT","slug":"bottle-gourd","name":"Bottle Gourd","botanical":"Lagenaria siceraria","class":"fresh","shelf":336,"temp":{"min_c":10,"max_c":12.8},"rh":"90-95","aliases":{"ta":"Surakkai / Suraikkai / Chorakkai","te":"Anapakaya / Sorakaya","kn":"Sorekai / Esugai Balli / Halu Gumbala","ml":"Sorekai / Chorakaa","hi":"Lauki"},"recipes":["kootu","dal","sambar","poriyal"],"context":["light cooking","summer vegetable","daily curry"]},
  {"code":"BRO","slug":"broad-beans","name":"Broad Beans","botanical":"Vicia faba","class":"fresh","shelf":240,"temp":{"min_c":4.4,"max_c":7.2},"rh":"95","aliases":{"ta":"Avarakai / Avarakkai","te":"Chikkudu Kaya / Pedda Chikkudu / Anamulu","kn":"Avarekayi / Chapparadavare / Avrekai","ml":"Amarakka / Amarakkaya / Amarapayar","hi":"Sem / Papdi / Bakla / Lablab Beans"},"recipes":["poriyal","sambar","avarekalu curry","stir fry"],"context":["seasonal beans","protein rich vegetable","festival cooking"]},
  {"code":"CAB","slug":"cabbage","name":"Cabbage","botanical":"Brassica oleracea var. capitata","class":"fresh","shelf":2160,"temp":{"min_c":0,"max_c":0},"rh":"98-100","aliases":{"ta":"Muttai gose / Muttakose","te":"Cabbagee / Kosu / Gos Koora / Gobi gadda","kn":"Kosu / kosu gedde / Kosugaddae / Yele Kosu","ml":"Muttakoos / Muttakose / Muttagose","hi":"Bandhgobi / Pattagobi / Patta Gobi"},"recipes":["poriyal","thoran","fried rice","stir fry"],"context":["bulk vegetable","fast cooking","odor sensitive storage"]},
  {"code":"CAP","slug":"capsicum","name":"Capsicum","botanical":"Capsicum annuum","class":"fresh","shelf":336,"temp":{"min_c":7.2,"max_c":10},"rh":"90-95","aliases":{"ta":"Kuda Milakai / Kudai Milagai","te":"Bunga mirapa / Bangalore mirapa kaaya","kn":"Donne Menasu / Dodda menasinakayi / donne menasinakaayi","ml":"Unda Mulakku / Kappal Mulakku / Kuda mulagu","hi":"Simla Mirch / shimala mirch"},"recipes":["fried rice","noodles","poriyal","capsicum curry"],"context":["indo chinese","stir fry","pizza topping"]},
  {"code":"CAR","slug":"carrot","name":"Carrot","botanical":"Daucus carota","class":"fresh","shelf":672,"temp":{"min_c":0,"max_c":0},"rh":"98-100","aliases":{"ta":"Carrot","te":"Gujjara gadda / Gajar","kn":"Gajjari / Gajjara Gadde","ml":"Carrot","hi":"Gaajar"},"recipes":["poriyal","halwa","salad","sambar"],"context":["kids","salad","sweet prep"]},
  {"code":"CAU","slug":"cauliflower","name":"Cauliflower","botanical":"Brassica oleracea var. botrytis","class":"fresh","shelf":480,"temp":{"min_c":0,"max_c":0},"rh":"90-98","aliases":{"ta":"Cauliflower","te":"Cauliflower / Gobi puvvu","kn":"HuKosu / HooKosu / Hookosu","ml":"Kaliflower / Cauliflower","hi":"Phul gobi / Gobi"},"recipes":["gobi fry","kurma","poriyal","manchurian"],"context":["stir fry","snack prep","weekday curry"]},
  {"code":"CHA","slug":"chayote","name":"Chayote","botanical":"Sechium edule","class":"fresh","shelf":336,"temp":{"min_c":10,"max_c":12.8},"rh":"90-95","aliases":{"ta":"Chow Chow / Bangalore Kathrikkai","te":"SeemaVankaya","kn":"Seeme badanekaye / Seeme Bhadhare Kai","ml":"Sheema Kathrika / Bangalore Kathrikka","hi":"Chow Chow"},"recipes":["kootu","sambar","poriyal","stew"],"context":["south indian kootu","mild vegetable","daily cooking"]},
  {"code":"CLU","slug":"cluster-beans","name":"Cluster Beans","botanical":"Cyamopsis tetragonoloba","class":"fresh","shelf":240,"temp":{"min_c":4.4,"max_c":7.2},"rh":"95","aliases":{"ta":"Kothavarangaai","te":"Goru chikkudu / Mattikaya / Gokhara kaya","kn":"Capparadavari / Goreekaye / Chawlikay / Gori Kayi","ml":"Kottavara / Kothamara","hi":"Gavar / Clusterbeens"},"recipes":["poriyal","curry","stir fry","kootu"],"context":["fiber rich","bitter bean","daily cooking"]},
  {"code":"COL","slug":"colocasia-taro","name":"Colocasia / Taro","botanical":"Colocasia esculenta","class":"root","shelf":720,"temp":{"min_c":7,"max_c":12},"rh":"85-90","aliases":{"ta":"Sepankezhangu","te":"Chema dumpa / Chemagadda","kn":"Sama gadde / Kesuvina Gadde","ml":"Chembu","hi":"Arvi / arbi"},"recipes":["roast","fry","pulusu","mezhukkupuratti"],"context":["root vegetable","roast curry","monsoon cooking"]},
  {"code":"YAM","slug":"elephant-foot-yam","name":"Elephant Foot Yam","botanical":"Amorphophallus paeoniifolius","class":"root","shelf":720,"temp":{"min_c":12.8,"max_c":15.6},"rh":"85-90","aliases":{"ta":"Senai kizhangu / Karunai Kizhangu","te":"Kanda-Gaddha / Pullakanda / Surai Kanda","kn":"Suvarna Gadde","ml":"Chenath-thanda / Chand / Chenna","hi":"Jangli Suran / Surti Kand / Kanda"},"recipes":["fry","kootu","curry","avial"],"context":["root vegetable","festival meal","high fiber"]},
  {"code":"IVY","slug":"ivy-gourd","name":"Ivy Gourd","botanical":"Coccinia grandis","class":"fresh","shelf":240,"temp":{"min_c":7.2,"max_c":10},"rh":"90-95","aliases":{"ta":"Kovakkai / Kovaikkai","te":"Dondakaya","kn":"Tonde kayi / Coccinia","ml":"Kovakka / Coccinia","hi":"Thendli / Kundru / Tindora"},"recipes":["poriyal","fry","curry","stir fry"],"context":["lunchbox vegetable","quick fry","daily cooking"]},
  {"code":"DRU","slug":"drumstick","name":"Drumstick","botanical":"Moringa oleifera","class":"fresh","shelf":168,"temp":{"min_c":7.2,"max_c":10},"rh":"90-95","aliases":{"ta":"Murungaikai","te":"Mulakada / Munnakaya / Munagakayalu","kn":"Nurgekay / Nuggekai","ml":"Muringakka / Muringakkaya","hi":"Saijan ki phalli / Shingh phali"},"recipes":["sambar","avial","curry","stew"],"context":["sambar essential","moringa pod","south indian cooking"]},
  {"code":"COW","slug":"cow-pea","name":"Cow Pea","botanical":"Vigna unguiculata","class":"fresh","shelf":240,"temp":{"min_c":4.4,"max_c":7.2},"rh":"95","aliases":{"ta":"Kaaramani","te":"Bobbarlu / Alasandulu","kn":"Alsande","ml":"Vella payaru","hi":"Lobia"},"recipes":["sundal","curry","poriyal","stew"],"context":["protein rich","legume","festival sundal"]},
  {"code":"SWE","slug":"sweet-potato","name":"Sweet Potato","botanical":"Ipomoea batatas","class":"root","shelf":2880,"temp":{"min_c":12.8,"max_c":15.6},"rh":"85-90","aliases":{"ta":"Sakaraivalli Kizhangu","te":"Chilakada dumpa","kn":"Sweet Potato","ml":"Sweet Potato / Cheeni Kizhangu","hi":"Shakarkand / Ratalu"},"recipes":["boiled snack","roast","poriyal","chaat"],"context":["healthy snack","root vegetable","kids"]},
  {"code":"TAP","slug":"tapioca","name":"Tapioca","botanical":"Manihot esculenta","class":"root","shelf":720,"temp":{"min_c":10,"max_c":15.6},"rh":"85-90","aliases":{"ta":"Maravalli Kizhangu","te":"Kara pendalanu / Karra Pendalam","kn":"Tapioca / Maragenasu","ml":"Tapioca / Kappa","hi":"Tapioca"},"recipes":["kappa puzhukku","chips","boiled snack","curry"],"context":["kerala staple","root vegetable","snack prep"]},
  {"code":"URA","slug":"urad-dal","name":"Urad Dal","botanical":"Split Black Gram","class":"dry","shelf":8760,"temp":{"min_c":0,"max_c":35},"rh":"dry ambient","aliases":{"ta":"Ulundhu Paruppu","te":"Minappa Pappu / Gundu Minapa pappu","kn":"Udina bele","ml":"Uzhunnu Parippu","hi":"Urad dal"},"recipes":["idli batter","dosa batter","vada","dal"],"context":["tiffin batter","protein rich","pantry staple"]},
  {"code":"TOO","slug":"toor-dal","name":"Toor Dal","botanical":"Pigeon Pea","class":"dry","shelf":8760,"temp":{"min_c":0,"max_c":35},"rh":"dry ambient","aliases":{"ta":"Thoovaram Paruppu","te":"Kandipappu","kn":"Toor Dal / Bele","ml":"Thuvara Parippu","hi":"Toor dal"},"recipes":["sambar","dal","rasam","pappu"],"context":["sambar essential","pantry staple","daily dal"]},
  {"code":"MOO","slug":"moong-dal","name":"Moong Dal","botanical":"Split Green Gram","class":"dry","shelf":8760,"temp":{"min_c":0,"max_c":35},"rh":"dry ambient","aliases":{"ta":"Paasi Paruppu","te":"Pesara Pappu","kn":"Hesar Bele","ml":"Cherupayar Parippu","hi":"Moong dal"},"recipes":["dal","payasam","khichdi","sundal"],"context":["light dal","protein rich","pantry staple"]},
  {"code":"CHA","slug":"channa-dal","name":"Channa Dal","botanical":"Split Bengal Gram","class":"dry","shelf":8760,"temp":{"min_c":0,"max_c":35},"rh":"dry ambient","aliases":{"ta":"Kadalai Paruppu","te":"Cenagapappu / Senaga pappu","kn":"Kadale Bele / Bele","ml":"Kadala Parippu","hi":"Chana dal / Channa"},"recipes":["dal","sundal","vada","chutney"],"context":["protein rich","pantry staple","festival sundal"]}
]
$json$::jsonb;
begin
  insert into public.packaging_types (slug, name, description, supports_loose_weight, supports_ocr, leak_risk, crush_risk, metadata)
  values
    ('loose', 'Loose', 'Loose fresh produce or staple sold by variable weight from a bin, crate, or seller bag.', true, false, 0.02, 0.35, '{"source_dataset":"south_indian_fresh_produce_taxonomy","image_mode":"loose_product"}')
  on conflict (slug) do update
  set supports_loose_weight = true,
      description = excluded.description,
      metadata = public.packaging_types.metadata || excluded.metadata;

  insert into public.perishability_profiles (
    slug, name, perishability_class, shelf_life_hours, freshness_window_minutes, storage_requirement,
    heat_sensitivity, spoilage_rate, delivery_urgency, max_transit_duration_minutes,
    refrigeration_required, sunlight_sensitivity, stackability, leak_risk, odor_sensitivity, breakability, metadata
  )
  values
    ('loose-fresh-vegetable-7-14d-cool-ventilated', 'Loose Fresh Vegetable Cool Ventilated', 'SHORT_SHELF', 336, 240, 'cool_ventilated', 0.7, 0.55, 0.65, 120, false, 0.45, 0.55, 0.02, 0.35, 0.25, '{"temperature_constraints_c":{"default_min":4.4,"default_max":12.8},"humidity_required":true,"ethylene_sensitive":true}'),
    ('loose-root-tuber-30d-ambient', 'Loose Root and Tuber Ambient', 'MEDIUM_SHELF', 720, 360, 'cool_ventilated', 0.45, 0.35, 0.45, 180, false, 0.35, 0.8, 0.02, 0.25, 0.35, '{"temperature_constraints_c":{"default_min":10,"default_max":15.6},"avoid_direct_sun":true}'),
    ('loose-dal-dry-stable-ambient', 'Loose Dal Dry Stable Ambient', 'DRY_STABLE', 8760, null, 'ambient', 0.15, 0.03, 0.15, 240, false, 0.2, 0.9, 0.02, 0.15, 0.2, '{"humidity_sensitivity":"keep_dry","pest_control_required":true}')
  on conflict (slug) do update
  set name = excluded.name,
      perishability_class = excluded.perishability_class,
      shelf_life_hours = excluded.shelf_life_hours,
      freshness_window_minutes = excluded.freshness_window_minutes,
      storage_requirement = excluded.storage_requirement,
      metadata = public.perishability_profiles.metadata || excluded.metadata;

  insert into public.delivery_constraints (
    slug, name, max_delivery_radius_km, max_transit_duration_minutes, cold_chain_required,
    insulated_delivery_required, ice_required, fragile_flag, stackable, morning_priority, route_batching_allowed, metadata
  )
  values
    ('fresh-produce-hyperlocal-standard', 'Fresh Produce Hyperlocal Standard', 6, 120, false, false, false, true, false, true, true, '{"avoid_heat_exposure":true,"separate_from_ethylene_emitters":true}'),
    ('dry-dal-hyperlocal-standard', 'Dry Dal Hyperlocal Standard', 8, 180, false, false, false, false, true, false, true, '{"keep_dry":true,"bin_or_pouch_transfer_allowed":true}')
  on conflict (slug) do update
  set max_delivery_radius_km = excluded.max_delivery_radius_km,
      max_transit_duration_minutes = excluded.max_transit_duration_minutes,
      metadata = public.delivery_constraints.metadata || excluded.metadata;

  select id into unit_uuid from public.units where slug = 'kilogram';
  select id into packaging_uuid from public.packaging_types where slug = 'loose';

  foreach p in array array(select jsonb_array_elements(products))
  loop
    romanized_aliases := array[]::text[];
    for alias_key, alias_value in select key, value from jsonb_each_text(p->'aliases')
    loop
      alias_parts := regexp_split_to_array(alias_value, '\s*/\s*');
      romanized_aliases := romanized_aliases || alias_parts;
    end loop;

    insert into public.departments (
      slug, canonical_name, multilingual_names, aliases, search_terms, regional_priority, seasonality,
      perishability_class, image_requirements, packaging_defaults, fulfillment_constraints, discovery_tags,
      sort_order, is_active, status, is_mvp_enabled, quality_score, governance_metadata
    )
    values (
      'fruits-vegetables', 'Fruits & Vegetables', '{"en":"Fruits & Vegetables"}',
      array['fresh produce','vegetables','keerai','kaikari'], array['fresh vegetables','loose produce','south indian vegetables'],
      '{"TN":100,"KA":100,"TS":100,"AP":100,"KL":100}'::jsonb, '{}'::jsonb,
      'SHORT_SHELF', image_requirements, '{"primary":"loose"}',
      '{"maxTransitMinutes":120,"odorIsolation":true,"humiditySensitive":true}'::jsonb,
      array['lunch','dinner','quick-cook'], 20, true, 'active', true, 96,
      jsonb_build_object('source_dataset','south_indian_fresh_produce_taxonomy','tier','commerce_ontology')
    )
    on conflict (slug) do update
    set canonical_name = excluded.canonical_name,
        search_terms = excluded.search_terms,
        image_requirements = excluded.image_requirements,
        governance_metadata = public.departments.governance_metadata || excluded.governance_metadata
    returning id into dept_uuid;

    insert into public.categories (
      name, slug, description, sort_order, is_active, department_id, canonical_name, aliases, search_terms,
      regional_priority, perishability_class, image_requirements, packaging_defaults, fulfillment_constraints,
      discovery_tags, taxonomy_level, ontology_metadata, status, is_mvp_enabled, quality_score, governance_metadata
    )
    values (
      case when p->>'class' = 'dry' then 'Dals & Pulses' else 'Fresh Vegetables' end,
      case when p->>'class' = 'dry' then 'dals-pulses' else 'fresh-vegetables' end,
      'Canonical South Indian hyperlocal marketplace category seeded from supported research aliases.',
      case when p->>'class' = 'dry' then 30 else 10 end,
      true, dept_uuid,
      case when p->>'class' = 'dry' then 'Dals & Pulses' else 'Fresh Vegetables' end,
      case when p->>'class' = 'dry' then array['paruppu','pappu','bele','parippu','dal'] else array['kaikari','vegetables','loose vegetables'] end,
      case when p->>'class' = 'dry' then array['dal','pulses','paruppu','pappu','bele'] else array['fresh vegetables','loose vegetables','south indian vegetables'] end,
      '{"TN":100,"KA":100,"TS":100,"AP":100,"KL":100}'::jsonb,
      case when p->>'class' = 'dry' then 'DRY_STABLE'::public.perishability_class else 'SHORT_SHELF'::public.perishability_class end,
      image_requirements, '{"primary":"loose"}',
      case when p->>'class' = 'dry' then '{"keepDry":true}'::jsonb else '{"maxTransitMinutes":120,"odorIsolation":true,"humiditySensitive":true}'::jsonb end,
      case when p->>'class' = 'dry' then array['lunch','dinner','protein-rich'] else array['lunch','dinner','quick-cook'] end,
      'CATEGORY', jsonb_build_object('source_dataset','south_indian_fresh_produce_taxonomy','schema_revision',1),
      'active', true, 96, jsonb_build_object('duplicate_detection_scope','botanical_trade_name')
    )
    on conflict (slug) do update
    set department_id = excluded.department_id,
        canonical_name = excluded.canonical_name,
        ontology_metadata = public.categories.ontology_metadata || excluded.ontology_metadata,
        governance_metadata = public.categories.governance_metadata || excluded.governance_metadata
    returning id into cat_uuid;

    insert into public.subcategories (
      department_id, category_id, slug, canonical_name, aliases, search_terms, regional_priority,
      perishability_class, image_requirements, packaging_defaults, fulfillment_constraints, discovery_tags,
      sort_order, is_active, status, is_mvp_enabled, quality_score, governance_metadata
    )
    values (
      dept_uuid, cat_uuid,
      case when p->>'class' = 'dry' then 'loose-dals' when p->>'class' = 'root' then 'roots-tubers' else 'loose-fresh-vegetables' end,
      case when p->>'class' = 'dry' then 'Loose Dals' when p->>'class' = 'root' then 'Roots & Tubers' else 'Loose Fresh Vegetables' end,
      case when p->>'class' = 'dry' then array['loose paruppu','loose pappu','loose bele'] else array['loose vegetables','fresh kaikari','loose produce'] end,
      romanized_aliases || array[p->>'name', p->>'botanical'],
      '{"TN":100,"KA":100,"TS":100,"AP":100,"KL":100}'::jsonb,
      case when p->>'class' = 'dry' then 'DRY_STABLE'::public.perishability_class when p->>'class' = 'root' then 'MEDIUM_SHELF'::public.perishability_class else 'SHORT_SHELF'::public.perishability_class end,
      image_requirements, '{"primary":"loose"}',
      case when p->>'class' = 'dry' then '{"keepDry":true}'::jsonb else '{"maxTransitMinutes":120,"humiditySensitive":true}'::jsonb end,
      case when p->>'class' = 'dry' then array['protein-rich','quick-cook'] else array['lunch','dinner','quick-cook'] end,
      10, true, 'active', true, 96,
      jsonb_build_object('source_dataset','south_indian_fresh_produce_taxonomy','schema_revision',1)
    )
    on conflict (slug) do update
    set category_id = excluded.category_id,
        search_terms = excluded.search_terms,
        governance_metadata = public.subcategories.governance_metadata || excluded.governance_metadata
    returning id into subcat_uuid;

    insert into public.product_families (
      department_id, category_id, subcategory_id, slug, canonical_name, product_group, aliases, search_terms,
      regional_priority, perishability_class, image_requirements, packaging_defaults, fulfillment_constraints,
      discovery_tags, is_active, status, is_mvp_enabled, quality_score, governance_metadata
    )
    values (
      dept_uuid, cat_uuid, subcat_uuid, (p->>'slug') || '-family', p->>'name', p->>'botanical',
      romanized_aliases, romanized_aliases || array[p->>'name', p->>'botanical'],
      '{"TN":100,"KA":100,"TS":100,"AP":100,"KL":100}'::jsonb,
      case when p->>'class' = 'dry' then 'DRY_STABLE'::public.perishability_class when p->>'class' = 'root' then 'MEDIUM_SHELF'::public.perishability_class else 'SHORT_SHELF'::public.perishability_class end,
      image_requirements, '{"primary":"loose"}',
      case when p->>'class' = 'dry' then '{"keepDry":true}'::jsonb else '{"maxTransitMinutes":120,"humiditySensitive":true}'::jsonb end,
      case when p->>'class' = 'dry' then array['protein-rich','quick-cook'] else array['lunch','dinner','quick-cook'] end,
      true, 'active', true, 96,
      jsonb_build_object('source_dataset','south_indian_fresh_produce_taxonomy','botanical_name',p->>'botanical')
    )
    on conflict (slug) do update
    set search_terms = excluded.search_terms,
        governance_metadata = public.product_families.governance_metadata || excluded.governance_metadata
    returning id into family_uuid;

    product_sku := 'SKU-FRS-' || lpad((mod(('x' || substr(md5(p->>'slug'), 1, 8))::bit(32)::bigint, 1000000))::text, 6, '0');

    insert into public.master_products (
      canonical_name, normalized_name, slug, description, short_description, department_id, category_id,
      subcategory_id, product_family_id, product_group, product_type, origin_region, internal_sku,
      seller_visibility, active_status, english_name, tamil_name, tamil_transliteration, telugu_name,
      kannada_name, malayalam_name, hindi_name, romanized_variants, discovery_tags, dietary_classification,
      regional_priority, metadata, status, is_mvp_enabled, quality_score, moderation_required, governance_metadata
    )
    values (
      p->>'name', lower(p->>'name'), p->>'slug',
      (p->>'name') || ' mapped to canonical botanical/trade identity ' || (p->>'botanical') || ' for South Indian hyperlocal fresh commerce.',
      'Canonical loose ' || lower(p->>'name') || ' with South Indian multilingual discovery aliases.',
      dept_uuid, cat_uuid, subcat_uuid, family_uuid, p->>'botanical', 'LOOSE', 'TN',
      product_sku,
      'PUBLIC', 'ACTIVE', p->>'name', p->'aliases'->>'ta', (regexp_split_to_array(p->'aliases'->>'ta', '\s*/\s*'))[1],
      p->'aliases'->>'te', p->'aliases'->>'kn', p->'aliases'->>'ml', p->'aliases'->>'hi',
      romanized_aliases,
      case when p->>'class' = 'dry' then array['protein-rich','quick-cook'] else array['lunch','dinner','quick-cook'] end,
      jsonb_build_object('botanical_or_trade_name', p->>'botanical', 'vegetarian', true),
      '{"TN":100,"KA":100,"TS":100,"AP":100,"KL":100}'::jsonb,
      jsonb_build_object(
        'source_dataset','south_indian_fresh_produce_taxonomy',
        'schema_revision',1,
        'metadata_contract', jsonb_build_object('canonical_sku_pattern','^SKU-[A-Z]{3}-[0-9]{6}$','additional_properties_allowed',false),
        'botanical_name', p->>'botanical',
        'taxonomy_tier','tier_1_commerce_ontology',
        'normalization_tier','tier_1_5_governance',
        'discovery_tier','tier_2_multilingual_search',
        'operations_tier','tier_3_freshness_intelligence',
        'ai_tier','tier_4_image_and_embedding_ingestion',
        'orchestration_tier','tier_5_agentic_automation',
        'schema_evolution', jsonb_build_object('policy','additive_only','deprecation_register_required',true,'sunset_days',180,'lineage_api','OpenLineage'),
        'image_ingestion_requirements', image_requirements,
        'inventory_generation', jsonb_build_object('starter_inventory_seeded',false,'reason','research_does_not_provide_stock_counts_or_seller_prices')
      ),
      'active', true, 96, false,
      jsonb_build_object(
        'duplicate_detection_keys', jsonb_build_array(lower(p->>'name'), lower(p->>'botanical'), p->>'slug'),
        'moderation_state','approved_curated_research_seed',
        'quality_indicators', jsonb_build_object('taxonomy_integrity',true,'multilingual_aliases',true,'variant_separated',true,'inventory_placeholders_only',true),
        'lineage', jsonb_build_object('raw_fields', jsonb_build_array('English Name','Botanical / Trade Name','Tamil Name','Telugu Name','Kannada Name','Malayalam Name','Hindi Name'), 'output_tables', jsonb_build_array('master_products','catalog_product_variants','product_aliases','search_tokens','catalog_product_images'))
      )
    )
    on conflict (slug) do update
    set canonical_name = excluded.canonical_name,
        product_group = excluded.product_group,
        romanized_variants = excluded.romanized_variants,
        metadata = public.master_products.metadata || excluded.metadata,
        governance_metadata = public.master_products.governance_metadata || excluded.governance_metadata,
        quality_score = greatest(public.master_products.quality_score, excluded.quality_score)
    returning id into product_uuid;

    variant_sku := 'SKU-' || p->>'code' || '-' || lpad((mod(('x' || substr(md5(p->>'slug'), 1, 8))::bit(32)::bigint, 1000000))::text, 6, '0');
    select id into perishability_uuid from public.perishability_profiles where slug = case when p->>'class' = 'dry' then 'loose-dal-dry-stable-ambient' when p->>'class' = 'root' then 'loose-root-tuber-30d-ambient' else 'loose-fresh-vegetable-7-14d-cool-ventilated' end;
    select id into delivery_uuid from public.delivery_constraints where slug = case when p->>'class' = 'dry' then 'dry-dal-hyperlocal-standard' else 'fresh-produce-hyperlocal-standard' end;

    insert into public.catalog_product_variants (
      product_id, variant_type, variant_name, quantity, unit_id, normalized_metric_value,
      normalized_metric_unit, min_metric_value, max_metric_value, packaging_type_id, shelf_life_hours,
      storage_requirement, fragile_flag, cold_chain_required, max_delivery_radius_km, freshness_window_minutes,
      reorder_threshold, sku_template, is_active, metadata, status, is_mvp_enabled, quality_score, governance_metadata
    )
    values (
      product_uuid, 'LOOSE', 'Loose variable weight', null, unit_uuid, null, 'g', 100, null, packaging_uuid,
      (case when p->>'class' = 'dry' then 8760 when p->>'class' = 'root' then 720 else coalesce((p->>'shelf')::int, 336) end),
      case when p->>'class' = 'dry' then 'ambient' else 'cool_ventilated' end,
      p->>'class' <> 'dry', false,
      case when p->>'class' = 'dry' then 8 else 6 end,
      case when p->>'class' = 'dry' then null else 240 end,
      null, variant_sku, true,
      jsonb_build_object(
        'source_dataset','south_indian_fresh_produce_taxonomy',
        'sku_ready_identifier', variant_sku,
        'inventory_placeholder', true,
        'pricing_placeholder', true,
        'supported_quantity_parser_units', jsonb_build_array('kg','kilo','gram','g'),
        'temperature_constraints_c', p->'temp',
        'relative_humidity', p->>'rh',
        'freshness_profile', jsonb_build_object('perishability', p->>'class', 'delivery_sensitivity', case when p->>'class' = 'dry' then 'keep_dry' else 'heat_and_humidity_sensitive' end)
      ),
      'active', true, 96,
      jsonb_build_object('duplicate_detection_keys', jsonb_build_array(variant_sku, p->>'slug', 'loose-variable-weight'), 'moderation_state','approved_curated_research_seed')
    )
    on conflict (sku_template) do update
    set metadata = public.catalog_product_variants.metadata || excluded.metadata,
        governance_metadata = public.catalog_product_variants.governance_metadata || excluded.governance_metadata
    returning id into variant_uuid;

    insert into public.product_logistics_profiles (product_id, variant_id, perishability_profile_id, delivery_constraint_id, region_codes, notes, metadata)
    values (
      product_uuid, variant_uuid, perishability_uuid, delivery_uuid,
      array['TN','KL','KA','AP','TS']::public.commerce_region[],
      'Operational profile seeded from commodity storage and South Indian fresh commerce taxonomy.',
      jsonb_build_object('temperature_constraints_c', p->'temp', 'relative_humidity', p->>'rh', 'zero_stock_cache_invalidation', true, 'price_shift_cache_invalidation_pct', 10)
    )
    on conflict (product_id, variant_id, perishability_profile_id, delivery_constraint_id) do update
    set metadata = public.product_logistics_profiles.metadata || excluded.metadata;

    for alias_key, alias_value in select key, value from jsonb_each_text(p->'aliases')
    loop
      foreach token in array regexp_split_to_array(alias_value, '\s*/\s*')
      loop
        insert into public.product_aliases (product_id, alias, normalized_alias, alias_type, language, region_codes, confidence, source, metadata)
        values (
          product_uuid, token, lower(regexp_replace(token, '\s+', ' ', 'g')), 'REGIONAL',
          case alias_key when 'ta' then 'ta'::public.commerce_language when 'te' then 'te'::public.commerce_language when 'kn' then 'kn'::public.commerce_language when 'ml' then 'ml'::public.commerce_language when 'hi' then 'hi'::public.commerce_language else 'roman'::public.commerce_language end,
          array['TN','KL','KA','AP','TS']::public.commerce_region[], 0.96, 'curated_research_seed',
          jsonb_build_object('script_type','romanized','botanical_name',p->>'botanical','phonetic_key',soundex(token))
        )
        on conflict (product_id, normalized_alias, alias_type, language) do update
        set confidence = excluded.confidence,
            metadata = public.product_aliases.metadata || excluded.metadata;
      end loop;
    end loop;

    foreach token in array romanized_aliases || array[p->>'name', p->>'botanical'] || array(select jsonb_array_elements_text(p->'recipes')) || array(select jsonb_array_elements_text(p->'context'))
    loop
      insert into public.search_tokens (product_id, token, normalized_token, token_type, language, region_codes, recipe_associations, weight, metadata)
      values (
        product_uuid, token, lower(token), 'SEMANTIC', 'roman',
        array['TN','KL','KA','AP','TS']::public.commerce_region[],
        array(select jsonb_array_elements_text(p->'recipes')), 1.0,
        jsonb_build_object('source_dataset','south_indian_fresh_produce_taxonomy','vector_ready',true,'rrf_ready',true)
      )
      on conflict do nothing;

      insert into public.search_tokens (product_id, token, normalized_token, token_type, language, region_codes, weight, metadata)
      values (
        product_uuid, token, regexp_replace(lower(token), '[aeiou ]', '', 'g'), 'PHONETIC', 'roman',
        array['TN','KL','KA','AP','TS']::public.commerce_region[], 0.92,
        jsonb_build_object('source_dataset','south_indian_fresh_produce_taxonomy','itrans_edit_distance_ready',true,'soundex_key',soundex(token))
      )
      on conflict do nothing;

      insert into public.search_tokens (product_id, token, normalized_token, token_type, language, region_codes, recipe_associations, weight, metadata)
      values (
        product_uuid, token, lower(token), 'AUTOCOMPLETE', 'roman',
        array['TN','KL','KA','AP','TS']::public.commerce_region[],
        array(select jsonb_array_elements_text(p->'recipes')), 0.85,
        jsonb_build_object('source_dataset','south_indian_fresh_produce_taxonomy')
      )
      on conflict do nothing;
    end loop;

    for alias_key, alias_value in select key, value from jsonb_each_text(p->'aliases')
    loop
      native_name := alias_value;
      insert into public.multilingual_mappings (
        entity_table, entity_id, language, native_text, transliteration, romanized_variants,
        phonetic_tokens, ocr_variants, voice_variants, confidence, source, metadata
      )
      values (
        'master_products', product_uuid,
        case alias_key when 'ta' then 'ta'::public.commerce_language when 'te' then 'te'::public.commerce_language when 'kn' then 'kn'::public.commerce_language when 'ml' then 'ml'::public.commerce_language when 'hi' then 'hi'::public.commerce_language else 'roman'::public.commerce_language end,
        native_name, (regexp_split_to_array(native_name, '\s*/\s*'))[1], romanized_aliases,
        array[p->>'slug'], array[p->>'name'], regexp_split_to_array(native_name, '\s*/\s*'),
        0.96, 'curated_research_seed',
        jsonb_build_object('script_type','romanized','schema_revision',1)
      )
      on conflict (entity_table, entity_id, language, native_text) do update
      set romanized_variants = excluded.romanized_variants,
          voice_variants = excluded.voice_variants,
          metadata = public.multilingual_mappings.metadata || excluded.metadata;
    end loop;

    foreach image_kind in array array['HERO','TRANSPARENT_PNG','SHELF','PACKAGING','MOBILE_THUMBNAIL']
    loop
      insert into public.catalog_product_images (
        product_id, variant_id, image_kind, storage_path, alt_text, width, height, aspect_ratio,
        mime_type, white_background, mobile_optimized, no_watermark, lighting_quality,
        compression_artifact_score, lazy_loading_ready, packaging_visibility, ocr_readability,
        dominant_colors, metadata
      )
      values (
        product_uuid, variant_uuid, image_kind::public.product_image_kind,
        'catalog-ingestion/pending/south-indian-fresh-produce-taxonomy/' || (p->>'slug') || '/' || lower(image_kind) || '.webp',
        (p->>'name') || ' ' || lower(replace(image_kind, '_', ' ')) || ' ingestion slot',
        case when image_kind = 'SHELF' then 1600 else 1200 end,
        case when image_kind = 'SHELF' then 900 else 1200 end,
        case when image_kind = 'SHELF' then '16:9' else '1:1' end,
        'image/webp', image_kind <> 'SHELF', true, true, 'pending_curated_capture',
        0, true, case when image_kind in ('HERO','PACKAGING','MOBILE_THUMBNAIL') then 0.75 else 0.55 end,
        case when image_kind in ('PACKAGING','SHELF') then 0.65 else 0.45 end,
        array['fresh-produce-natural','market-bin'],
        jsonb_build_object(
          'image_status','placeholder_for_ingestion',
          'image_requirements', image_requirements,
          'image_search_terms', romanized_aliases || array[p->>'name', p->>'botanical'],
          'visual_search_tags', jsonb_build_array(p->>'name', p->>'botanical', p->>'class', 'loose produce', 'south indian market'),
          'packaging_signatures', jsonb_build_object('packaging_type','loose','must_show_natural_surface',true,'reject_branded_packaging_unless_seller_uploaded',true),
          'duplicate_detection_hints', jsonb_build_array(lower(p->>'name'), lower(p->>'botanical'), p->>'slug'),
          'ocr_visibility_requirements', jsonb_build_object('shelf_label_required', image_kind in ('SHELF','PACKAGING'), 'alias_label_allowed', true),
          'ai_match_tokens', romanized_aliases || array[p->>'name', p->>'botanical']
        )
      )
      on conflict do nothing;
    end loop;

    insert into public.search_validation_reports (
      product_id, alias_count, transliteration_count, phonetic_token_count, autocomplete_token_count,
      multilingual_coverage, recipe_association_count, co_purchase_tag_count, readiness_score, missing_requirements, metadata
    )
    values (
      product_uuid, array_length(romanized_aliases, 1), array_length(romanized_aliases, 1), array_length(romanized_aliases, 1),
      array_length(romanized_aliases, 1), '{"ta":true,"te":true,"kn":true,"ml":true,"hi":true,"roman":true}'::jsonb,
      jsonb_array_length(p->'recipes'), 0, 97, array[]::text[],
      jsonb_build_object('report_source','south_indian_fresh_produce_taxonomy','embedding_metadata',jsonb_build_object('model_family','multilingual_dense_embedding','hybrid_rrf_k',60,'index_targets',jsonb_build_array('HNSW','IVF-PQ')))
    )
    on conflict do nothing;

    insert into public.taxonomy_integrity_reports (
      product_id, category_id, depth_valid, parent_relationship_valid, orphan_product,
      regional_tags_valid, festival_tags_valid, consistency_score, findings, metadata
    )
    values (
      product_uuid, cat_uuid, true, true, false, true, true, 98, array[]::text[],
      jsonb_build_object('source_dataset','south_indian_fresh_produce_taxonomy','botanical_name',p->>'botanical','schema_revision',1)
    )
    on conflict do nothing;
  end loop;

  insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
  values
    ('south_indian_fresh_produce_taxonomy_seed', 'Enables curated South Indian fresh produce and dal taxonomy records with canonical variants, aliases, image slots, governance metadata, and search readiness.', true, 100, '{"roles":["BUYER","SELLER","ADMIN","SUPER_ADMIN"]}')
  on conflict (key) do update
  set description = excluded.description,
      is_enabled = excluded.is_enabled,
      rollout_percentage = excluded.rollout_percentage,
      audience = excluded.audience,
      updated_at = now();
end $$;
