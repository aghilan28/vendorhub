create extension if not exists "pgcrypto";
create extension if not exists "fuzzystrmatch" with schema extensions;

create unique index if not exists catalog_product_variants_sku_template_unique_idx
  on public.catalog_product_variants(sku_template);

create unique index if not exists south_indian_search_tokens_replay_unique_idx
  on public.search_tokens(product_id, normalized_token, token_type, language)
  where product_id is not null;

create unique index if not exists south_indian_catalog_product_images_replay_unique_idx
  on public.catalog_product_images(product_id, image_kind, storage_path);

create table if not exists public.south_indian_mandi_nodes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null unique,
  name text not null,
  state_code public.commerce_region not null,
  sourcing_catchments text[] not null default '{}',
  peak_window text not null,
  flow_routes text[] not null default '{}',
  governance_profile jsonb not null default '{}'::jsonb,
  logistics_profile jsonb not null default '{}'::jsonb,
  risk_metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.produce_quality_models (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_slug text not null,
  model_key text not null,
  model_type text not null,
  stages jsonb not null default '[]'::jsonb,
  sensor_features jsonb not null default '{}'::jsonb,
  formula_metadata jsonb not null default '{}'::jsonb,
  image_label_protocol jsonb not null default '{}'::jsonb,
  governance_metadata jsonb not null default '{}'::jsonb,
  unique (product_slug, model_key)
);

create table if not exists public.produce_volatility_episodes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  episode_code text not null unique,
  target_product_slugs text[] not null default '{}',
  trigger text not null,
  measured_supply_deficit text,
  peak_mandi_shift text,
  peak_retail_price text,
  supply_chain_breakdown text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.produce_storage_compatibility_rules (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  rule_key text not null unique,
  producer_product_slugs text[] not null default '{}',
  sensitive_product_slugs text[] not null default '{}',
  risk_level text not null,
  rule_text text not null,
  operational_action text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.south_indian_festival_product_curves (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  festival_key text not null,
  event_key text not null,
  product_id uuid not null references public.master_products(id) on delete cascade,
  product_slug text not null,
  region_code public.commerce_region,
  curve jsonb not null default '{}'::jsonb,
  surge_multiplier numeric(8, 5) not null default 1,
  preparation_alert_threshold numeric(8, 5) not null default 0.7,
  metadata jsonb not null default '{}'::jsonb,
  unique (festival_key, event_key, product_id)
);

do $$
declare
  p jsonb;
  v jsonb;
  a text;
  token text;
  v_image_kind text;
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
  region_code public.commerce_region;
  all_regions public.commerce_region[] := array['TN','KL','KA','AP','TS']::public.commerce_region[];
  image_requirements jsonb := '{
    "required":["HERO","TRANSPARENT_PNG","SHELF","PACKAGING","MOBILE_THUMBNAIL"],
    "preferred_aspect_ratios":["1:1","4:5","16:9"],
    "minimum_width":1200,
    "minimum_height":1200,
    "watermark_allowed":false,
    "reject_marketplace_screenshot":true,
    "reject_fake_ai_packaging":true,
    "real_image_only":true,
    "calibration_block_required_for_cv_dataset":true,
    "lighting_kelvin_range":[5500,6500],
    "capture_angles":["top_down_90","isometric_45"],
    "label_masks":["bruise","wilt","discoloration","mechanical_damage"]
  }'::jsonb;
  products jsonb := $json$
[
  {
    "code":"TOM","slug":"country-tomato","name":"Country Tomato","botanical":"Solanum lycopersicum","type":"LOOSE","class":"SHORT_SHELF","category":"fresh-vegetables","subcategory":"loose-fresh-vegetables","region":"TN",
    "aliases":["Thakkali","Tomato","Thakaali","Thakkaali","Tamatar","Naatu Thakkali","Country Tomato"],
    "languages":{"ta":"Thakkali","te":"Tamatar / Tomato","kn":"Tomato","ml":"Thakkali","hi":"Tamatar","roman":"Thakkali"},
    "search":["tomato","country tomato","thakkali","tamatar","rasam tomato","sambar tomato"],
    "phonetic":["thakkali","thakaali","thakkaali","tomato","tamatar"],
    "recipes":["sambar starter","rasam essential basket","tomato puree","country tomato coriander rasam"],
    "festivals":[],
    "context":["weekday cooking","soup broth vector","rainy day demand boost"],
    "variants":[
      {"name":"Loose variable weight","variant_type":"LOOSE","unit":"kilogram","min":0.100,"metric_unit":"g","packaging":"loose","shelf":168,"storage":"cool_ventilated","fragile":true,"freshness":180},
      {"name":"25 kg ventilated mandi crate","variant_type":"WEIGHT","quantity":25,"unit":"kilogram","metric":25000,"metric_unit":"g","packaging":"hdpe-ventilated-crate-25kg","shelf":168,"storage":"cool_ventilated","fragile":true,"freshness":180},
      {"name":"16.5 kg Vellore mundy crate","variant_type":"WEIGHT","quantity":16.5,"unit":"kilogram","metric":16500,"metric_unit":"g","packaging":"vellore-mundy-crate-16-5kg","shelf":168,"storage":"cool_ventilated","fragile":true,"freshness":180}
    ],
    "operations":{"temperature_c":{"min":7.2,"max":12.2},"ethylene_production":"moderate","ethylene_sensitivity":"high","ripening_index_required":true,"last_mile_group":"soft_solanaceous","delivery_sensitivity":"epidermal rupture, juice leakage, accelerated ethylene ripening","co_storage_exclusions":["banana","mango","amaranth-greens","coriander-leaves","okra","cucumber"],"quality_model":"tomato_7_stage_ri"},
    "image":{"visual_search_tags":["red tomato","green breaker tomato","round tomato","calyx","fresh produce"],"search_terms":["country tomato loose product white background","thakkali mandi crate tomato","tomato ripening stages"]}
  },
  {
    "code":"OKR","slug":"okra","name":"Okra","botanical":"Abelmoschus esculentus","type":"LOOSE","class":"SHORT_SHELF","category":"fresh-vegetables","subcategory":"loose-fresh-vegetables","region":"TN",
    "aliases":["Vendakkai","Vendakkay","Vendakaai","Vendakkaai","Bhindi","Bendakaya","Bende Kayi"],
    "languages":{"ta":"Vendakkai","te":"Bendakaya","kn":"Bende Kayi","ml":"Vendakka","hi":"Bhindi","roman":"Vendakkai"},
    "search":["okra","vendakkai","bhindi","bendi","lady finger"],
    "phonetic":["vendakkai","vendakkay","vendakaai","vendakkaai"],
    "recipes":["vendakkai poriyal","sambar vegetable","okra fry"],
    "festivals":[],
    "context":["tender pod","snap test","fiber grade"],
    "variants":[{"name":"Loose variable weight","variant_type":"LOOSE","unit":"kilogram","min":0.100,"metric_unit":"g","packaging":"loose","shelf":120,"storage":"cool_ventilated","fragile":true,"freshness":120}],
    "operations":{"temperature_c":{"min":7.2,"max":10},"ethylene_production":"very_low","ethylene_sensitivity":"high","grading":"diameter_length_ld_ratio","last_mile_group":"leafy_and_tender_high_hydration","delivery_sensitivity":"yellowing, tough lignification, calyx abscission","co_storage_exclusions":["banana","mango","tomato"]},
    "image":{"visual_search_tags":["green okra pod","okra calyx","tender pod","ribbed pod"],"search_terms":["okra vendakkai loose white background","fresh bhindi pods"]}
  },
  {
    "code":"BRI","slug":"brinjal","name":"Brinjal","botanical":"Solanum melongena","type":"LOOSE","class":"SHORT_SHELF","category":"fresh-vegetables","subcategory":"loose-fresh-vegetables","region":"TN",
    "aliases":["Kathirikai","Kathiri kai","Vankaya","Badane","Badhanekayi","Gulla","Vazhuthinanga","Baingan"],
    "languages":{"ta":"Kathirikai","te":"Vankaya","kn":"Badane / Gulla","ml":"Vazhuthinanga","hi":"Baingan","roman":"Kathirikai"},
    "search":["brinjal","eggplant","kathirikai","vankaya","baingan","gulla"],
    "phonetic":["kathirikai","kathiri kai","vankaya","badane","baingan"],
    "recipes":["sambar","brinjal poriyal","gutti vankaya","curry"],
    "festivals":[],
    "context":["glossy skin","green stem","tender fruit"],
    "variants":[{"name":"Loose variable weight","variant_type":"LOOSE","unit":"kilogram","min":0.100,"metric_unit":"g","packaging":"loose","shelf":168,"storage":"cool_ventilated","fragile":true,"freshness":180}],
    "operations":{"temperature_c":{"min":7.8,"max":12.2},"ethylene_production":"low","ethylene_sensitivity":"high","quality_signals":["glossy skin","fresh green stem","avoid dull spongy over-mature fruit"],"delivery_sensitivity":"stem detachment, brown epidermal spotting, flesh pitting","co_storage_exclusions":["banana","mango","tomato"]},
    "image":{"visual_search_tags":["purple brinjal","green stem","glossy eggplant"],"search_terms":["brinjal kathirikai loose white background","fresh eggplant green stem"]}
  },
  {
    "code":"MGU","slug":"mattu-gulla-brinjal","name":"Udupi Mattu Gulla Brinjal","botanical":"Solanum melongena","type":"GI_SPECIALTY","class":"SHORT_SHELF","category":"fresh-vegetables","subcategory":"gi-specialty-vegetables","region":"KA",
    "aliases":["Mattu Gulla","Mattugulla","Mathu Gula","Mattugula","Udupi Gulla"],
    "languages":{"ta":"Mattu Gulla","te":"Mattu Gulla","kn":"Mattu Gulla","ml":"Mattu Gulla","hi":"Mattu Gulla","roman":"Mattu Gulla"},
    "search":["mattu gulla","udupi brinjal","gi brinjal","green brinjal"],
    "phonetic":["mattu gulla","mattugulla","mathu gula","mattugula"],
    "recipes":["udupi sambar","gulla curry"],
    "festivals":[],
    "context":["GI variety","saline clay soil","Udupi terroir"],
    "variants":[{"name":"Loose GI specialty count or weight","variant_type":"LOOSE","unit":"kilogram","min":0.100,"metric_unit":"g","packaging":"loose","shelf":168,"storage":"cool_ventilated","fragile":true,"freshness":180}],
    "operations":{"temperature_c":{"min":7.8,"max":12.2},"gi_tagged":true,"terroir":"Mattu village saline clay soils","ethylene_sensitivity":"high","delivery_sensitivity":"surface bruising and stem detachment"},
    "image":{"visual_search_tags":["light green spherical brinjal","mattu gulla","udupi vegetable"],"search_terms":["Udupi Mattu Gulla brinjal GI light green"]}
  },
  {
    "code":"AMA","slug":"amaranth-greens","name":"Amaranth Greens","botanical":"Amaranthus tricolor","type":"BUNDLE","class":"SAME_DAY_FRESH","category":"leafy-greens","subcategory":"loose-leafy-greens","region":"TN",
    "aliases":["Thandukeerai","Mulaikeerai","Cheera","Chuvanna Cheera","Dantina Soppu","Totakoora","Amaranth"],
    "languages":{"ta":"Thandukeerai / Mulaikeerai","te":"Totakoora","kn":"Dantina Soppu","ml":"Cheera / Chuvanna Cheera","hi":"Amaranth Greens","roman":"Mulaikeerai"},
    "search":["amaranth greens","keerai","cheera","soppu","totakoora","mulaikeerai","thandukeerai"],
    "phonetic":["mulaikeerai","thandukeerai","cheera","totakoora","dantina soppu"],
    "recipes":["keerai poriyal","andhra pappu","kerala thoran","lentil greens"],
    "festivals":[],
    "context":["leafy green","wetting greens weight adjustment","high hydration"],
    "variants":[{"name":"Loose kattu bundle","variant_type":"BUNDLE","unit":"piece","min":1,"metric_unit":"bundle","packaging":"leafy-kattu-bundle","shelf":48,"storage":"refrigerated_or_breathable_cool","fragile":true,"freshness":60}],
    "operations":{"temperature_c":{"min":4,"max":6},"ethylene_production":"very_low","ethylene_sensitivity":"high","last_mile_group":"leafy_greens","delivery_sensitivity":"cell wall shearing, moisture loss, chlorophyll degradation, browning","wetting_weight_adjustment":{"alpha_wet_min":0.12,"alpha_wet_max":0.15},"co_storage_exclusions":["banana","mango","tomato"],"recommended_packaging":"micro-perforated paper bag inside insulated compartment"},
    "image":{"visual_search_tags":["amaranth leaves","keerai bundle","leafy green bunch"],"search_terms":["amaranth greens keerai bundle white background","mulaikeerai fresh bunch"]}
  },
  {
    "code":"BAS","slug":"malabar-spinach","name":"Malabar Spinach","botanical":"Basella alba","type":"BUNDLE","class":"SAME_DAY_FRESH","category":"leafy-greens","subcategory":"loose-leafy-greens","region":"KA",
    "aliases":["Pasalai Keerai","Vasalacheera","Basale Soppu","Bachali Kura","Basale Soppoo","Basalay Soppu"],
    "languages":{"ta":"Pasalai Keerai","te":"Bachali Kura","kn":"Basale Soppu","ml":"Vasalacheera","hi":"Malabar Spinach","roman":"Basale Soppu"},
    "search":["malabar spinach","pasalai keerai","basale soppu","bachali kura","vasalacheera"],
    "phonetic":["basale soppu","basale soppoo","basalay soppu","bachali kura"],
    "recipes":["kootu","lentil greens","bachali kura pappu"],
    "festivals":[],
    "context":["mucilaginous leaves","leafy green","lentil cooking"],
    "variants":[{"name":"Loose kattu bundle","variant_type":"BUNDLE","unit":"piece","min":1,"metric_unit":"bundle","packaging":"leafy-kattu-bundle","shelf":48,"storage":"refrigerated_or_breathable_cool","fragile":true,"freshness":60}],
    "operations":{"temperature_c":{"min":4,"max":6},"last_mile_group":"leafy_greens","delivery_sensitivity":"wilting and leaf edge browning","recommended_packaging":"micro-perforated paper bag inside insulated compartment"},
    "image":{"visual_search_tags":["malabar spinach leaves","basale soppu","thick green leaves"],"search_terms":["basale soppu malabar spinach bunch"]}
  },
  {
    "code":"MGL","slug":"drumstick-leaves","name":"Drumstick Leaves","botanical":"Moringa oleifera","type":"BUNDLE","class":"SAME_DAY_FRESH","category":"leafy-greens","subcategory":"loose-leafy-greens","region":"TN",
    "aliases":["Murungai Keerai","Muringila","Nugge Soppu","Mulaga Aaku","Murungakeerai","Muringa keeray"],
    "languages":{"ta":"Murungai Keerai","te":"Mulaga Aaku","kn":"Nugge Soppu","ml":"Muringila","hi":"Drumstick Leaves","roman":"Murungai Keerai"},
    "search":["drumstick leaves","murungai keerai","moringa leaves","mulaga aaku","nugge soppu"],
    "phonetic":["murungai keerai","muringa keeray","murungakeerai"],
    "recipes":["adai batter greens","keerai poriyal","lentil stir fry"],
    "festivals":[],
    "context":["iron rich","fiber rich","washed greens demand"],
    "variants":[{"name":"Loose kattu bundle","variant_type":"BUNDLE","unit":"piece","min":1,"metric_unit":"bundle","packaging":"leafy-kattu-bundle","shelf":48,"storage":"refrigerated_or_breathable_cool","fragile":true,"freshness":60}],
    "operations":{"temperature_c":{"min":4,"max":6},"last_mile_group":"leafy_greens","delivery_sensitivity":"leaf shedding and moisture loss","recommended_packaging":"breathable perforated bag"},
    "image":{"visual_search_tags":["moringa leaves","murungai keerai bunch","small leaflets"],"search_terms":["murungai keerai fresh bunch white background"]}
  },
  {
    "code":"FEN","slug":"fenugreek-leaves","name":"Fenugreek Leaves","botanical":"Trigonella foenum-graecum","type":"BUNDLE","class":"SAME_DAY_FRESH","category":"leafy-greens","subcategory":"loose-leafy-greens","region":"TN",
    "aliases":["Vendhaya Keerai","Uluva Cheera","Mentyada Soppu","Menthi Koora"],
    "languages":{"ta":"Vendhaya Keerai","te":"Menthi Koora","kn":"Mentyada Soppu","ml":"Uluva Cheera","hi":"Methi","roman":"Vendhaya Keerai"},
    "search":["fenugreek leaves","vendhaya keerai","menthi koora","methi leaves","uluva cheera"],
    "phonetic":["vendhaya keerai","menthi koora","mentyada soppu"],
    "recipes":["sambar","vadai","stir fry"],
    "festivals":[],
    "context":["slightly bitter greens","leafy green"],
    "variants":[{"name":"Loose kattu bundle","variant_type":"BUNDLE","unit":"piece","min":1,"metric_unit":"bundle","packaging":"leafy-kattu-bundle","shelf":48,"storage":"refrigerated_or_breathable_cool","fragile":true,"freshness":60}],
    "operations":{"temperature_c":{"min":4,"max":6},"last_mile_group":"leafy_greens","delivery_sensitivity":"wilting and aroma loss"},
    "image":{"visual_search_tags":["fenugreek leaves","methi bunch","small leaf greens"],"search_terms":["fresh fenugreek leaves bunch vendhaya keerai"]}
  },
  {
    "code":"GON","slug":"gongura-roselle-leaves","name":"Gongura / Roselle Leaves","botanical":"Hibiscus sabdariffa","type":"BUNDLE","class":"SAME_DAY_FRESH","category":"leafy-greens","subcategory":"loose-leafy-greens","region":"AP",
    "aliases":["Gongura","Gongoora","Gungura","Gonguraa","Pulicha Keerai","Puliccheera","Pundi Soppu"],
    "languages":{"ta":"Pulicha Keerai","te":"Gongura","kn":"Pundi Soppu","ml":"Puliccheera","hi":"Sorrel Leaves","roman":"Gongura"},
    "search":["gongura","roselle leaves","sorrel leaves","pulicha keerai","pundi soppu"],
    "phonetic":["gongura","gongoora","gungura","gonguraa"],
    "recipes":["gongura pachadi","gongura pappu","kootu"],
    "festivals":[],
    "context":["acidic greens","andhra chutney"],
    "variants":[{"name":"Loose kattu bundle","variant_type":"BUNDLE","unit":"piece","min":1,"metric_unit":"bundle","packaging":"leafy-kattu-bundle","shelf":48,"storage":"refrigerated_or_breathable_cool","fragile":true,"freshness":60}],
    "operations":{"temperature_c":{"min":4,"max":6},"last_mile_group":"leafy_greens","delivery_sensitivity":"leaf browning and acidity loss"},
    "image":{"visual_search_tags":["gongura leaves","roselle leaves","sorrel bunch"],"search_terms":["gongura leaves bunch Andhra fresh"]}
  },
  {
    "code":"DIL","slug":"dill-leaves","name":"Dill Leaves","botanical":"Anethum graveolens","type":"BUNDLE","class":"SAME_DAY_FRESH","category":"leafy-greens","subcategory":"loose-leafy-greens","region":"KA",
    "aliases":["Satakuppi","Sompa","Sathakuppa","Sabbasige Soppu","Soya Koora"],
    "languages":{"ta":"Satakuppi / Sompa","te":"Soya Koora","kn":"Sabbasige Soppu","ml":"Sathakuppa","hi":"Dill Leaves","roman":"Sabbasige Soppu"},
    "search":["dill leaves","sabbasige soppu","satakuppi","soya koora"],
    "phonetic":["sabbasige soppu","satakuppi","sathakuppa"],
    "recipes":["yellow split lentils","dill rice"],
    "festivals":[],
    "context":["aromatic greens"],
    "variants":[{"name":"Loose kattu bundle","variant_type":"BUNDLE","unit":"piece","min":1,"metric_unit":"bundle","packaging":"leafy-kattu-bundle","shelf":48,"storage":"refrigerated_or_breathable_cool","fragile":true,"freshness":60}],
    "operations":{"temperature_c":{"min":4,"max":6},"last_mile_group":"fresh_herbs","delivery_sensitivity":"aroma loss and frond wilting"},
    "image":{"visual_search_tags":["dill fronds","sabbasige soppu","fine leaf herb"],"search_terms":["dill leaves sabbasige soppu bunch"]}
  },
  {
    "code":"CUR","slug":"curry-leaves","name":"Curry Leaves","botanical":"Murraya koenigii","type":"BUNDLE","class":"SAME_DAY_FRESH","category":"fresh-herbs","subcategory":"loose-fresh-herbs","region":"TN",
    "aliases":["Karuveppilai","Kariveppela","Karibevu Soppu","Karivaepaku","Curry Patta"],
    "languages":{"ta":"Karuveppilai","te":"Karivaepaku","kn":"Karibevu Soppu","ml":"Kariveppela","hi":"Curry Patta","roman":"Karuveppilai"},
    "search":["curry leaves","karuveppilai","karivepaku","karibevu","curry patta"],
    "phonetic":["karuveppilai","kariveppela","karivaepaku"],
    "recipes":["rasam tempering","sambar tempering","oil infusion","kerala tempering bundle"],
    "festivals":["onam-sadya"],
    "context":["free kothu promo candidate","tempering herb"],
    "variants":[{"name":"Loose sprig kothu","variant_type":"BUNDLE","unit":"piece","min":1,"metric_unit":"sprig","packaging":"leafy-kattu-bundle","shelf":72,"storage":"refrigerated_or_breathable_cool","fragile":true,"freshness":90}],
    "operations":{"temperature_c":{"min":4,"max":6},"last_mile_group":"fresh_herbs","promo_shrinkage_factor":0.035,"delivery_sensitivity":"leaf drop and aroma loss"},
    "image":{"visual_search_tags":["curry leaves sprig","karuveppilai","green herb"],"search_terms":["fresh curry leaves sprig karuveppilai"]}
  },
  {
    "code":"MUS","slug":"mustard-leaves","name":"Mustard Leaves","botanical":"Brassica juncea","type":"BUNDLE","class":"SAME_DAY_FRESH","category":"leafy-greens","subcategory":"loose-leafy-greens","region":"AP",
    "aliases":["Kadugu Keerai","Kaduguila","Sasive Soppu","Aava Kura","Aava Aaku"],
    "languages":{"ta":"Kadugu Keerai","te":"Aava Kura / Aava Aaku","kn":"Sasive Soppu","ml":"Kaduguila","hi":"Sarson Saag","roman":"Aava Kura"},
    "search":["mustard leaves","aava kura","kadugu keerai","sasive soppu"],
    "phonetic":["aava kura","aava aaku","kadugu keerai"],
    "recipes":["dry stir fry","fermented mustard preparation"],
    "festivals":[],
    "context":["pungent greens"],
    "variants":[{"name":"Loose kattu bundle","variant_type":"BUNDLE","unit":"piece","min":1,"metric_unit":"bundle","packaging":"leafy-kattu-bundle","shelf":48,"storage":"refrigerated_or_breathable_cool","fragile":true,"freshness":60}],
    "operations":{"temperature_c":{"min":4,"max":6},"last_mile_group":"leafy_greens","delivery_sensitivity":"wilting and yellowing"},
    "image":{"visual_search_tags":["mustard greens","aava kura leaves"],"search_terms":["mustard leaves aava kura bunch"]}
  },
  {
    "code":"TARL","slug":"taro-leaves","name":"Taro / Colocasia Leaves","botanical":"Colocasia esculenta","type":"BUNDLE","class":"SAME_DAY_FRESH","category":"leafy-greens","subcategory":"loose-leafy-greens","region":"KL",
    "aliases":["Chepankizhangu Leaves","Chembu","Kesu Soppu","Chemagadda Leaves","Colocasia Leaves"],
    "languages":{"ta":"Chepankizhangu Ilai","te":"Chemagadda Aaku","kn":"Kesu Soppu","ml":"Chembu","hi":"Arbi Patta","roman":"Chembu"},
    "search":["taro leaves","colocasia leaves","chembu","kesu soppu","pathrode leaves"],
    "phonetic":["chembu","kesu soppu","chemagadda"],
    "recipes":["pathrode","steamed lentil paste rolls"],
    "festivals":[],
    "context":["heart shaped leaves","pathrode"],
    "variants":[{"name":"Loose leaf bundle","variant_type":"BUNDLE","unit":"piece","min":1,"metric_unit":"bundle","packaging":"leafy-kattu-bundle","shelf":48,"storage":"refrigerated_or_breathable_cool","fragile":true,"freshness":60}],
    "operations":{"temperature_c":{"min":4,"max":6},"last_mile_group":"leafy_greens","delivery_sensitivity":"leaf tear and edge browning"},
    "image":{"visual_search_tags":["colocasia leaves","taro leaves","heart shaped leaf"],"search_terms":["taro colocasia leaves pathrode"]}
  },
  {
    "code":"DRU","slug":"drumstick","name":"Drumstick","botanical":"Moringa oleifera","type":"LOOSE","class":"SHORT_SHELF","category":"fresh-vegetables","subcategory":"loose-fresh-vegetables","region":"TN",
    "aliases":["Murungakkai","Murungaikai","Muringakka","Muringakkaya","Mulakada","Munagakayalu","Nuggekai"],
    "languages":{"ta":"Murungakkai","te":"Mulakada","kn":"Nuggekai","ml":"Muringakka","hi":"Saijan Phalli","roman":"Murungakkai"},
    "search":["drumstick","murungakkai","mulakada","nuggekai","moringa pod"],
    "phonetic":["murungakkai","mulakada","nuggekai"],
    "recipes":["sambar starter","avial","stew"],
    "festivals":[],
    "context":["sambar essential"],
    "variants":[{"name":"Loose variable weight","variant_type":"LOOSE","unit":"kilogram","min":0.100,"metric_unit":"g","packaging":"loose","shelf":168,"storage":"cool_ventilated","fragile":true,"freshness":180}],
    "operations":{"temperature_c":{"min":7.2,"max":10},"last_mile_group":"cucurbit_like_pods","delivery_sensitivity":"skin abrasion and dehydration"},
    "image":{"visual_search_tags":["drumstick pods","moringa pods"],"search_terms":["fresh drumstick murungakkai white background"]}
  },
  {
    "code":"SNA","slug":"snake-gourd","name":"Snake Gourd","botanical":"Trichosanthes cucumerina","type":"LOOSE","class":"SHORT_SHELF","category":"fresh-vegetables","subcategory":"loose-fresh-vegetables","region":"TN",
    "aliases":["Pudalangai","Padavalanga","Potlakaya","Padwal","Snake Gourd"],
    "languages":{"ta":"Pudalangai","te":"Potlakaya","kn":"Padavalakayi","ml":"Padavalanga","hi":"Chichinda","roman":"Pudalangai"},
    "search":["snake gourd","pudalangai","padavalanga","potlakaya"],
    "phonetic":["pudalangai","padavalanga","potlakaya"],
    "recipes":["kootu","poriyal","sambar"],
    "festivals":[],
    "context":["thumbnail tenderness test","commercial length"],
    "variants":[{"name":"Loose variable weight","variant_type":"LOOSE","unit":"kilogram","min":0.100,"metric_unit":"g","packaging":"loose","shelf":168,"storage":"cool_ventilated","fragile":true,"freshness":180}],
    "operations":{"temperature_c":{"min":7.2,"max":10},"last_mile_group":"cucurbits","delivery_sensitivity":"micro cracking, epidermal abrasions, yellowing from moisture loss","recommended_packaging":"low-density polyethylene mesh sleeve"},
    "image":{"visual_search_tags":["long snake gourd","striped gourd"],"search_terms":["snake gourd pudalangai fresh"]}
  },
  {
    "code":"WTR","slug":"watermelon","name":"Watermelon","botanical":"Citrullus lanatus","type":"PIECE","class":"MEDIUM_SHELF","category":"fresh-fruits","subcategory":"whole-melons","region":"TN",
    "aliases":["Watermelon","Tarbooz","Kallangadi","Puchakaya","Dharbusani"],
    "languages":{"ta":"Dharbusani","te":"Puchakaya","kn":"Kallangadi","ml":"Thannimathan","hi":"Tarbooz","roman":"Watermelon"},
    "search":["watermelon","tarbooz","puchakaya","kallangadi","dharbusani"],
    "phonetic":["watermelon","tarbooz","puchakaya"],
    "recipes":["cut fruit salad","juice"],
    "festivals":[],
    "context":["acoustic hollow sound","summer cooling fruit"],
    "variants":[{"name":"Whole single count","variant_type":"PIECE","unit":"piece","min":1,"metric_unit":"piece","packaging":"loose","shelf":168,"storage":"cool_ventilated","fragile":true,"freshness":240}],
    "operations":{"temperature_c":{"min":10,"max":15},"quality_signals":["dull hollow acoustic resonance"],"cut_form_tcs_temperature_c_max":5,"last_mile_group":"melons","delivery_sensitivity":"impact cracking"},
    "image":{"visual_search_tags":["whole watermelon","striped melon"],"search_terms":["whole watermelon white background fresh"]}
  },
  {
    "code":"MEL","slug":"muskmelon","name":"Muskmelon","botanical":"Cucumis melo","type":"PIECE","class":"MEDIUM_SHELF","category":"fresh-fruits","subcategory":"whole-melons","region":"TN",
    "aliases":["Muskmelon","Cantaloupe","Mulaam Pazham","Kharbuja"],
    "languages":{"ta":"Mulaam Pazham","te":"Kharbuja","kn":"Kharbuja","ml":"Madhurapazham","hi":"Kharbuja","roman":"Muskmelon"},
    "search":["muskmelon","cantaloupe","kharbuja","mulaam pazham"],
    "phonetic":["muskmelon","kharbuja","mulaam"],
    "recipes":["cut fruit salad","dessert fruit"],
    "festivals":[],
    "context":["full slip maturity","summer fruit"],
    "variants":[{"name":"Whole single count","variant_type":"PIECE","unit":"piece","min":1,"metric_unit":"piece","packaging":"loose","shelf":168,"storage":"cool_ventilated","fragile":true,"freshness":240}],
    "operations":{"temperature_c":{"min":7,"max":10},"quality_signals":["full slip stage","clean cavity after twist"],"cut_form_tcs_temperature_c_max":5,"delivery_sensitivity":"bruising and aroma loss"},
    "image":{"visual_search_tags":["muskmelon","netted melon","cantaloupe"],"search_terms":["whole muskmelon kharbuja white background"]}
  },
  {
    "code":"BAN","slug":"banana-poovan-nendran","name":"Banana (Poovan / Nendran)","botanical":"Musa acuminata","type":"PIECE","class":"SHORT_SHELF","category":"fresh-fruits","subcategory":"bananas","region":"KL",
    "aliases":["Banana","Vazhai Pazham","Nendran","Poovan","Robusta","Pazham","Arati Pandu","Baale Hannu"],
    "languages":{"ta":"Vazhai Pazham","te":"Arati Pandu","kn":"Baale Hannu","ml":"Pazham / Nendran","hi":"Kela","roman":"Nendran Banana"},
    "search":["banana","nendran","poovan","robusta banana","vazhai pazham","pazham"],
    "phonetic":["nendran","poovan","pazham","vazhai"],
    "recipes":["banana chips","sarkaravaratti","office pantry fruit"],
    "festivals":["onam-sadya"],
    "context":["ethylene producer","ridged to rounded maturity","dry flower residue"],
    "variants":[{"name":"Loose single count","variant_type":"PIECE","unit":"piece","min":1,"metric_unit":"piece","packaging":"loose","shelf":96,"storage":"ambient_ventilated","fragile":true,"freshness":180}],
    "operations":{"temperature_c":{"min":13,"max":15},"ethylene_production":"moderate","ethylene_sensitivity":"high","co_storage_exclusions":["amaranth-greens","coriander-leaves","okra","cucumber"],"delivery_sensitivity":"skin blackening and compression bruises"},
    "image":{"visual_search_tags":["banana bunch","nendran banana","poovan banana"],"search_terms":["nendran banana poovan banana fresh"]}
  },
  {
    "code":"BMG","slug":"banaganapalle-mango","name":"Banaganapalle Mango","botanical":"Mangifera indica","type":"GI_SPECIALTY","class":"SHORT_SHELF","category":"fresh-fruits","subcategory":"gi-specialty-fruits","region":"AP",
    "aliases":["Banaganapalle Mango","Banganapalli Mango","Benishan Mango","Banganapalle"],
    "languages":{"ta":"Banaganapalle Mango","te":"Banaganapalle Mamidi","kn":"Banaganapalle Mavu","ml":"Banaganapalle Manga","hi":"Banaganapalle Aam","roman":"Banaganapalle Mango"},
    "search":["banaganapalle mango","banganapalli mango","gi mango","andhra mango"],
    "phonetic":["banaganapalle","banganapalli","benishan"],
    "recipes":["dessert fruit","premium salary week fruit"],
    "festivals":[],
    "context":["GI variety","thin yellow skin","fiberless golden pulp","Kurnool terroir"],
    "variants":[{"name":"Loose GI specialty count or weight","variant_type":"LOOSE","unit":"kilogram","min":0.250,"metric_unit":"g","packaging":"pulp-nest-tray","shelf":120,"storage":"ambient_ventilated","fragile":true,"freshness":180}],
    "operations":{"temperature_c":{"min":10,"max":13},"ethylene_production":"moderate","ethylene_sensitivity":"high","delivery_sensitivity":"flesh softening, skin spotting, mold susceptibility","recommended_packaging":"rigid pulp-nest tray with cellular partitions"},
    "image":{"visual_search_tags":["yellow mango","banaganapalle","fiberless pulp"],"search_terms":["Banaganapalle mango GI yellow fruit"]}
  },
  {
    "code":"PNA","slug":"vazhakulam-pineapple","name":"Vazhakulam Pineapple","botanical":"Ananas comosus","type":"GI_SPECIALTY","class":"SHORT_SHELF","category":"fresh-fruits","subcategory":"gi-specialty-fruits","region":"KL",
    "aliases":["Vazhakulam Pineapple","Pineapple","Kaithachakka","Ananas"],
    "languages":{"ta":"Pineapple","te":"Anasa Pandu","kn":"Ananas","ml":"Vazhakulam Kaithachakka","hi":"Ananas","roman":"Vazhakulam Pineapple"},
    "search":["vazhakulam pineapple","pineapple","kaithachakka","high sugar pineapple"],
    "phonetic":["vazhakulam","pineapple","kaithachakka"],
    "recipes":["dessert fruit","juice","premium salary week fruit"],
    "festivals":[],
    "context":["GI variety","red laterite soils","high sugar"],
    "variants":[{"name":"Whole single count","variant_type":"PIECE","unit":"piece","min":1,"metric_unit":"piece","packaging":"loose","shelf":120,"storage":"cool_ventilated","fragile":true,"freshness":180}],
    "operations":{"temperature_c":{"min":7,"max":10},"gi_tagged":true,"terroir":"Vazhakulam red laterite soils","delivery_sensitivity":"crown damage and bruising"},
    "image":{"visual_search_tags":["pineapple","vazhakulam pineapple","crown fruit"],"search_terms":["Vazhakulam pineapple GI Kerala"]}
  },
  {
    "code":"ASH","slug":"ash-gourd","name":"Ash Gourd","botanical":"Benincasa hispida","type":"LOOSE","class":"MEDIUM_SHELF","category":"fresh-vegetables","subcategory":"gourds-cucurbits","region":"KL",
    "aliases":["Kumbalanga","Poosanikai","Boodida Gummadikaya","Boodu Kumbalakai","Ash Gourd"],
    "languages":{"ta":"Poosanikai","te":"Boodida Gummadikaya","kn":"Boodu Kumbalakai","ml":"Kumbalanga","hi":"Petha","roman":"Kumbalanga"},
    "search":["ash gourd","kumbalanga","poosanikai","olan vegetable","avial vegetable"],
    "phonetic":["kumbalanga","poosanikai"],
    "recipes":["olan","avial","sadya vegetable","ash gourd coconut"],
    "festivals":["onam-sadya"],
    "context":["slow cook weekend vegetable","Onam basket"],
    "variants":[{"name":"Loose variable weight or cut piece","variant_type":"LOOSE","unit":"kilogram","min":0.250,"metric_unit":"g","packaging":"loose","shelf":240,"storage":"cool_ventilated","fragile":false,"freshness":240}],
    "operations":{"temperature_c":{"min":10,"max":15},"last_mile_group":"cucurbits","delivery_sensitivity":"cut-surface dehydration if sliced"},
    "image":{"visual_search_tags":["ash gourd","white pumpkin","kumbalanga"],"search_terms":["ash gourd kumbalanga whole cut"]}
  },
  {
    "code":"YAM","slug":"elephant-foot-yam","name":"Elephant Foot Yam","botanical":"Amorphophallus paeoniifolius","type":"LOOSE","class":"MEDIUM_SHELF","category":"fresh-vegetables","subcategory":"roots-tubers","region":"KL",
    "aliases":["Chena","Senai Kizhangu","Karunai Kizhangu","Suvarna Gadde","Kanda","Suran"],
    "languages":{"ta":"Senai Kizhangu","te":"Kanda","kn":"Suvarna Gadde","ml":"Chena","hi":"Suran","roman":"Chena"},
    "search":["elephant foot yam","chena","senai kizhangu","suran","onam yam"],
    "phonetic":["chena","senai","suran"],
    "recipes":["kalan","kootu curry","avial","yam fry"],
    "festivals":["onam-sadya"],
    "context":["slow cook weekend vegetable","Onam basket"],
    "variants":[{"name":"Loose variable weight or cut piece","variant_type":"LOOSE","unit":"kilogram","min":0.250,"metric_unit":"g","packaging":"loose","shelf":720,"storage":"cool_ventilated","fragile":false,"freshness":360}],
    "operations":{"temperature_c":{"min":12.8,"max":15.6},"delivery_sensitivity":"cut face drying and abrasion"},
    "image":{"visual_search_tags":["elephant foot yam","chena cut piece","brown tuber"],"search_terms":["elephant foot yam chena Kerala"]}
  },
  {
    "code":"COC","slug":"fresh-coconut","name":"Fresh Coconut","botanical":"Cocos nucifera","type":"PIECE","class":"MEDIUM_SHELF","category":"fresh-produce","subcategory":"coconuts","region":"KL",
    "aliases":["Coconut","Thengai","Thenga","Kobbari","Tenginakai","Fresh Coconut"],
    "languages":{"ta":"Thengai","te":"Kobbari","kn":"Tenginakai","ml":"Thenga","hi":"Nariyal","roman":"Thenga"},
    "search":["fresh coconut","thengai","thenga","kobbari","sadya coconut"],
    "phonetic":["thengai","thenga","kobbari"],
    "recipes":["kerala tempering bundle","olan","avial","thoran","fresh coconut milk"],
    "festivals":["onam-sadya"],
    "context":["Onam high volume","grating","coconut milk"],
    "variants":[{"name":"Whole husked coconut single count","variant_type":"PIECE","unit":"piece","min":1,"metric_unit":"piece","packaging":"loose","shelf":336,"storage":"ambient_ventilated","fragile":false,"freshness":360}],
    "operations":{"temperature_c":{"min":10,"max":30},"delivery_sensitivity":"shell cracking under heavy impact"},
    "image":{"visual_search_tags":["whole coconut","husked coconut","thengai"],"search_terms":["fresh husked coconut white background"]}
  },
  {
    "code":"BLF","slug":"banana-leaf","name":"Fresh Banana Leaf","botanical":"Musa acuminata leaf","type":"BUNDLE","class":"SAME_DAY_FRESH","category":"fresh-produce","subcategory":"serving-leaves","region":"KL",
    "aliases":["Banana Leaf","Vazhai Ilai","Ela","Arati Aaku","Baale Ele"],
    "languages":{"ta":"Vazhai Ilai","te":"Arati Aaku","kn":"Baale Ele","ml":"Ela","hi":"Kela Patta","roman":"Banana Leaf"},
    "search":["banana leaf","vazhai ilai","ela","onam leaf","sadya leaf"],
    "phonetic":["vazhai ilai","ela","banana leaf"],
    "recipes":["sadya serving","festival serving leaf"],
    "festivals":["onam-sadya"],
    "context":["bulk kattu bundle","serving leaf"],
    "variants":[{"name":"Kattu bundle","variant_type":"BUNDLE","unit":"piece","min":1,"metric_unit":"bundle","packaging":"leafy-kattu-bundle","shelf":24,"storage":"cool_ventilated","fragile":true,"freshness":60}],
    "operations":{"temperature_c":{"min":10,"max":15},"delivery_sensitivity":"fold cracks, drying, edge browning"},
    "image":{"visual_search_tags":["banana leaf","large green leaf","sadya leaf"],"search_terms":["fresh banana leaf bundle Onam"]}
  },
  {
    "code":"SGC","slug":"whole-sugarcane-stalk","name":"Whole Sugarcane Stalk","botanical":"Saccharum officinarum","type":"BUNDLE","class":"MEDIUM_SHELF","category":"fresh-produce","subcategory":"festival-produce","region":"TN",
    "aliases":["Sugarcane","Karumbu","Cheruku","Kabbu","Pongal Karumbu"],
    "languages":{"ta":"Karumbu","te":"Cheruku","kn":"Kabbu","ml":"Karimbu","hi":"Ganna","roman":"Karumbu"},
    "search":["sugarcane","karumbu","pongal sugarcane","whole sugarcane"],
    "phonetic":["karumbu","cheruku","kabbu"],
    "recipes":["pongal ceremonial basket"],
    "festivals":["pongal"],
    "context":["Pongal two week sourcing cycle","bundle of 10 or 20 pieces"],
    "variants":[
      {"name":"Bundle of 10 stalks","variant_type":"BUNDLE","quantity":10,"unit":"piece","metric":10,"metric_unit":"stalk","packaging":"sugarcane-stalk-bundle","shelf":168,"storage":"ambient_ventilated","fragile":false,"freshness":360},
      {"name":"Bundle of 20 stalks","variant_type":"BUNDLE","quantity":20,"unit":"piece","metric":20,"metric_unit":"stalk","packaging":"sugarcane-stalk-bundle","shelf":168,"storage":"ambient_ventilated","fragile":false,"freshness":360}
    ],
    "operations":{"temperature_c":{"min":10,"max":30},"delivery_sensitivity":"drying at cut ends and splitting"},
    "image":{"visual_search_tags":["sugarcane stalks","karumbu bundle","pongal produce"],"search_terms":["Pongal sugarcane karumbu bundle"]}
  },
  {
    "code":"TUR","slug":"fresh-turmeric-plant","name":"Fresh Turmeric Plant","botanical":"Curcuma longa","type":"BUNDLE","class":"SHORT_SHELF","category":"fresh-produce","subcategory":"festival-produce","region":"TN",
    "aliases":["Manjal Kothu","Fresh Turmeric Plant","Turmeric Rhizome With Leaves","Pasupu Kommulu"],
    "languages":{"ta":"Manjal Kothu","te":"Pasupu Kommulu","kn":"Arishina Gida","ml":"Manjal Chedi","hi":"Kacchi Haldi","roman":"Manjal Kothu"},
    "search":["fresh turmeric plant","manjal kothu","pongal turmeric","turmeric leaves rhizome"],
    "phonetic":["manjal kothu","pasupu"],
    "recipes":["pongal ceremonial basket"],
    "festivals":["pongal"],
    "context":["intact green leaves and root rhizomes","ceremonial pot wrapping"],
    "variants":[{"name":"Leaf and rhizome kothu bundle","variant_type":"BUNDLE","unit":"piece","min":1,"metric_unit":"bundle","packaging":"leafy-kattu-bundle","shelf":72,"storage":"cool_ventilated","fragile":true,"freshness":120}],
    "operations":{"temperature_c":{"min":10,"max":15},"delivery_sensitivity":"leaf drying and rhizome abrasion"},
    "image":{"visual_search_tags":["fresh turmeric plant","turmeric leaves","manjal kothu"],"search_terms":["fresh turmeric plant manjal kothu Pongal"]}
  },
  {
    "code":"GAR","slug":"kodaikanal-malai-poondu","name":"Kodaikanal Malai Poondu","botanical":"Allium sativum","type":"GI_SPECIALTY","class":"MEDIUM_SHELF","category":"fresh-produce","subcategory":"gi-specialty-alliums","region":"TN",
    "aliases":["Kodaikanal Malai Poondu","Hill Garlic","Malai Poondu","Poondu"],
    "languages":{"ta":"Kodaikanal Malai Poondu","te":"Vellulli","kn":"Bellulli","ml":"Veluthulli","hi":"Lahsun","roman":"Malai Poondu"},
    "search":["kodaikanal garlic","malai poondu","hill garlic","poondu"],
    "phonetic":["malai poondu","poondu"],
    "recipes":["keerai poriyal tempering","garlic paste","sambar base"],
    "festivals":[],
    "context":["GI variety","high-altitude damp soils","strong aroma","long shelf life"],
    "variants":[{"name":"Loose bulb weight","variant_type":"LOOSE","unit":"kilogram","min":0.050,"metric_unit":"g","packaging":"open-net-mesh-bag","shelf":720,"storage":"ambient_ventilated","fragile":false,"freshness":360}],
    "operations":{"temperature_c":{"min":10,"max":30},"gi_tagged":true,"delivery_sensitivity":"outer skin peeling and moisture mold","recommended_packaging":"breathable open net mesh"},
    "image":{"visual_search_tags":["hill garlic","garlic bulb","malai poondu"],"search_terms":["Kodaikanal Malai Poondu GI garlic"]}
  },
  {
    "code":"SHO","slug":"bangalore-rose-onion","name":"Bangalore Rose Onion","botanical":"Allium cepa","type":"GI_SPECIALTY","class":"MEDIUM_SHELF","category":"fresh-produce","subcategory":"gi-specialty-alliums","region":"KA",
    "aliases":["Bangalore Rose Onion","Rose Onion","Small Red Onion","Export Onion"],
    "languages":{"ta":"Chinna Vengayam","te":"Ulli Gadda","kn":"Rose Eerulli","ml":"Cheriya Ulli","hi":"Chhota Pyaz","roman":"Rose Onion"},
    "search":["bangalore rose onion","rose onion","small onion","shallot","chinna vengayam"],
    "phonetic":["rose onion","chinna vengayam"],
    "recipes":["sambar starter","rasam base","poriyal pack"],
    "festivals":[],
    "context":["GI variety","deep red pungent small onions","high sulphur export preference"],
    "variants":[{"name":"Loose bulb weight","variant_type":"LOOSE","unit":"kilogram","min":0.100,"metric_unit":"g","packaging":"open-net-mesh-bag","shelf":720,"storage":"ambient_ventilated","fragile":false,"freshness":360}],
    "operations":{"temperature_c":{"min":10,"max":30},"ethylene_production":"very_low","last_mile_group":"alliums","delivery_sensitivity":"outer skin peeling, bruising, root zone moisture mold","recommended_packaging":"breathable open net mesh"},
    "image":{"visual_search_tags":["rose onion","small red onion","shallot"],"search_terms":["Bangalore Rose Onion GI small red onion"]}
  },
  {
    "code":"CHI","slug":"byadagi-chilli","name":"Byadagi Chilli","botanical":"Capsicum annuum","type":"GI_SPECIALTY","class":"DRY_STABLE","category":"dry-produce","subcategory":"spices-chillies","region":"KA",
    "aliases":["Byadagi Chilli","Byadgi Chilli","Dry Red Chilli","Byadagi Menasinakai"],
    "languages":{"ta":"Byadagi Milagai","te":"Byadagi Mirapakaya","kn":"Byadagi Menasinakai","ml":"Byadagi Mulaku","hi":"Byadagi Mirch","roman":"Byadagi Chilli"},
    "search":["byadagi chilli","dry red chilli","low pungency chilli","wrinkled chilli"],
    "phonetic":["byadagi","byadgi"],
    "recipes":["kerala tempering bundle","spice mix","sadya base"],
    "festivals":["onam-sadya"],
    "context":["GI chilli","deep red color","low pungency"],
    "variants":[{"name":"Loose dry weight","variant_type":"LOOSE","unit":"kilogram","min":0.050,"metric_unit":"g","packaging":"loose","shelf":8760,"storage":"dry_ambient","fragile":false,"freshness":null}],
    "operations":{"temperature_c":{"min":0,"max":35},"humidity_sensitivity":"keep_dry","delivery_sensitivity":"keep dry to prevent mold"},
    "image":{"visual_search_tags":["wrinkled dry red chilli","byadagi chilli"],"search_terms":["Byadagi chilli GI dry red wrinkled"]}
  },
  {
    "code":"GCH","slug":"guntur-sannam-chilli","name":"Guntur Sannam Chilli","botanical":"Capsicum annuum","type":"GI_SPECIALTY","class":"DRY_STABLE","category":"dry-produce","subcategory":"spices-chillies","region":"AP",
    "aliases":["Guntur Sannam Chilli","Guntur Chilli","Sannam Mirchi","Dry Red Chilli"],
    "languages":{"ta":"Guntur Milagai","te":"Guntur Sannam Mirapakaya","kn":"Guntur Menasinakai","ml":"Guntur Mulaku","hi":"Guntur Mirch","roman":"Guntur Sannam Chilli"},
    "search":["guntur sannam chilli","guntur chilli","pungent red chilli","capsaicin chilli"],
    "phonetic":["guntur sannam","guntur chilli"],
    "recipes":["spice mix","pickle","sambar powder"],
    "festivals":[],
    "context":["GI chilli","Guntur Prakasam terroir","capsaicin rich"],
    "variants":[{"name":"Loose dry weight","variant_type":"LOOSE","unit":"kilogram","min":0.050,"metric_unit":"g","packaging":"loose","shelf":8760,"storage":"dry_ambient","fragile":false,"freshness":null}],
    "operations":{"temperature_c":{"min":0,"max":35},"humidity_sensitivity":"keep_dry","delivery_sensitivity":"keep dry to prevent mold"},
    "image":{"visual_search_tags":["dry red chilli","guntur chilli"],"search_terms":["Guntur Sannam chilli GI dry red"]}
  }
]
$json$::jsonb;
begin
  insert into public.packaging_types (slug, name, description, supports_loose_weight, supports_ocr, leak_risk, crush_risk, metadata)
  values
    ('hdpe-ventilated-crate-25kg', '25 kg HDPE Ventilated Mandi Crate', 'Injection-molded HDPE or PP mesh crate used for tomato and high-volume fresh produce transport.', false, true, 0.02, 0.2, '{"net_payload_kg":25,"tare_kg_options":[2.000,1.575],"dimensions_mm_options":[[540,360,290],[540,355,300]],"wholesale_unit_cost_inr_range":[240,350]}'),
    ('vellore-mundy-crate-16-5kg', '16.5 kg Vellore Mundy Crate', 'Regional HDPE crate model used in Vellore mundy wholesale produce handling.', false, true, 0.02, 0.25, '{"net_payload_kg":16.5,"tare_kg":1.2,"dimensions_mm":[395,320,250],"wholesale_unit_cost_inr_range":[150,180]}'),
    ('leafy-kattu-bundle', 'Leafy Kattu Bundle', 'Traditional leafy-green bundle or sprig unit used for Keerai, Cheera, Soppu, Kura, curry leaves, and festival leaves.', true, false, 0.08, 0.65, '{"traditional_unit":"kattu","water_mass_adjustment_supported":true,"surface_water_retention_max_pct":15}'),
    ('open-net-mesh-bag', 'Open Net Mesh Bag', 'Breathable mesh bag for alliums and moisture-sensitive produce.', true, false, 0.02, 0.35, '{"breathable":true,"moisture_buildup_risk":"low"}'),
    ('pulp-nest-tray', 'Rigid Pulp Nest Tray', 'Rigid cellular tray for soft solanaceous produce and mangoes to prevent epidermal rupture.', false, false, 0.02, 0.1, '{"cellular_partitions":true,"fragile_fruit_ready":true}'),
    ('sugarcane-stalk-bundle', 'Sugarcane Stalk Bundle', 'Bulk bundle for whole sugarcane stalks in Pongal sourcing cycles.', false, false, 0.01, 0.15, '{"supported_bundle_counts":[10,20]}')
  on conflict (slug) do update
  set description = excluded.description,
      supports_loose_weight = excluded.supports_loose_weight,
      metadata = public.packaging_types.metadata || excluded.metadata;

  insert into public.perishability_profiles (
    slug, name, perishability_class, shelf_life_hours, freshness_window_minutes, storage_requirement,
    heat_sensitivity, spoilage_rate, delivery_urgency, max_transit_duration_minutes,
    refrigeration_required, sunlight_sensitivity, stackability, leak_risk, odor_sensitivity, breakability, metadata
  )
  values
    ('same-day-leafy-greens-5c-high-hydration', 'Same-Day Leafy Greens 5C High Hydration', 'SAME_DAY_FRESH', 48, 60, 'refrigerated_or_breathable_cool', 0.95, 0.9, 0.95, 45, true, 0.85, 0.15, 0.04, 0.35, 0.8, '{"temperature_constraints_c":{"min":4,"max":6,"critical_max":38},"humidity_min_pct":55,"tcs_cut_form_max_c":5,"wetting_weight_model":true}'),
    ('soft-solanaceous-7d-cool-ventilated', 'Soft Solanaceous 7d Cool Ventilated', 'SHORT_SHELF', 168, 180, 'cool_ventilated', 0.8, 0.65, 0.8, 90, false, 0.55, 0.25, 0.08, 0.35, 0.75, '{"temperature_constraints_c":{"min":7.2,"max":12.2,"critical_max":38},"ethylene_sensitive":true,"rigid_partition_recommended":true}'),
    ('fresh-herb-3d-cold-breathable', 'Fresh Herb 3d Cold Breathable', 'SAME_DAY_FRESH', 72, 90, 'refrigerated_or_breathable_cool', 0.9, 0.75, 0.85, 60, true, 0.75, 0.2, 0.02, 0.8, 0.6, '{"temperature_constraints_c":{"min":4,"max":6},"aroma_loss_sensitive":true}'),
    ('whole-fruit-5d-ambient-ventilated', 'Whole Fruit 5d Ambient Ventilated', 'SHORT_SHELF', 120, 180, 'ambient_ventilated', 0.7, 0.55, 0.65, 90, false, 0.5, 0.35, 0.05, 0.45, 0.7, '{"ethylene_producer_possible":true,"avoid_leafy_co_storage":true}'),
    ('festival-bundle-medium-shelf', 'Festival Bundle Medium Shelf', 'MEDIUM_SHELF', 168, 360, 'ambient_ventilated', 0.45, 0.25, 0.5, 180, false, 0.45, 0.5, 0.02, 0.15, 0.45, '{"festival_sourcing_ready":true}'),
    ('dry-gi-chilli-stable', 'Dry GI Chilli Stable', 'DRY_STABLE', 8760, null, 'dry_ambient', 0.15, 0.03, 0.15, 240, false, 0.25, 0.75, 0.02, 0.45, 0.25, '{"humidity_sensitivity":"keep_dry","mold_risk_if_wet":true}')
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
    ('leafy-greens-bike-delivery-critical', 'Leafy Greens Bike Delivery Critical', 4, 45, false, true, false, true, false, true, false, '{"tier1_temperature_breach_c":38,"tier1_duration_minutes":15,"humidity_min_pct":55,"recommended_packaging":"micro_perforated_paper_inside_insulated_compartment"}'),
    ('soft-fruit-vegetable-rigid-bike-delivery', 'Soft Fruit Vegetable Rigid Bike Delivery', 5, 60, false, true, false, true, false, true, true, '{"vibration_rms_g_alert":1.8,"recommended_packaging":"rigid_pulp_nest_tray"}'),
    ('festival-produce-standard-hyperlocal', 'Festival Produce Standard Hyperlocal', 8, 180, false, false, false, false, true, false, true, '{"sourcing_window_days_before_festival":14}'),
    ('dry-spice-staple-hyperlocal', 'Dry Spice Staple Hyperlocal', 8, 240, false, false, false, false, true, false, true, '{"keep_dry":true}')
  on conflict (slug) do update
  set metadata = public.delivery_constraints.metadata || excluded.metadata;

  insert into public.departments (
    slug, canonical_name, multilingual_names, aliases, search_terms, regional_priority, seasonality,
    perishability_class, image_requirements, packaging_defaults, fulfillment_constraints, discovery_tags,
    sort_order, is_active, status, is_mvp_enabled, quality_score, governance_metadata
  )
  values (
    'fruits-vegetables', 'Fruits & Vegetables', '{"en":"Fruits & Vegetables","ta":"Kai Kari Pazham","ml":"Pachakkari Pazham","kn":"Tarakari Hannu","te":"Kuragayalu Pandlu"}',
    array['fresh produce','vegetables','fruits','keerai','cheera','soppu','kura','aaku'],
    array['fresh vegetables','fresh fruits','leafy greens','south indian produce','GI produce'],
    '{"TN":100,"KL":100,"KA":100,"AP":100,"TS":100}'::jsonb, '{}'::jsonb,
    'SHORT_SHELF', image_requirements, '{"primary":"loose","secondary":["kattu","crate","piece"]}'::jsonb,
    '{"maxTransitMinutes":120,"ethyleneAwarePacking":true,"imagePipelineRequired":true}'::jsonb,
    array['fresh','south-indian','hyperlocal','multilingual'], 20, true, 'active', true, 98,
    '{"source_dataset":"south_indian_production_ingestion","tier":"commerce_ontology"}'::jsonb
  )
  on conflict (slug) do update
  set multilingual_names = excluded.multilingual_names,
      aliases = excluded.aliases,
      search_terms = excluded.search_terms,
      image_requirements = excluded.image_requirements,
      governance_metadata = public.departments.governance_metadata || excluded.governance_metadata
  returning id into dept_uuid;

  foreach p in array array(select jsonb_array_elements(products))
  loop
    insert into public.categories (
      name, slug, description, sort_order, is_active, department_id, canonical_name, aliases, search_terms,
      regional_priority, perishability_class, image_requirements, packaging_defaults, fulfillment_constraints,
      discovery_tags, taxonomy_level, ontology_metadata, status, is_mvp_enabled, quality_score, governance_metadata
    )
    values (
      case p->>'category'
        when 'leafy-greens' then 'Leafy Greens'
        when 'fresh-herbs' then 'Fresh Herbs'
        when 'fresh-fruits' then 'Fresh Fruits'
        when 'dry-produce' then 'Dry Produce'
        else 'Fresh Produce'
      end,
      p->>'category',
      'Research-backed South Indian fresh produce category for canonical commerce ontology.',
      10, true, dept_uuid,
      case p->>'category'
        when 'leafy-greens' then 'Leafy Greens'
        when 'fresh-herbs' then 'Fresh Herbs'
        when 'fresh-fruits' then 'Fresh Fruits'
        when 'dry-produce' then 'Dry Produce'
        else 'Fresh Produce'
      end,
      array(select jsonb_array_elements_text(p->'aliases')),
      array(select jsonb_array_elements_text(p->'search')),
      '{"TN":100,"KL":100,"KA":100,"AP":100,"TS":100}'::jsonb,
      case p->>'class'
        when 'SAME_DAY_FRESH' then 'SAME_DAY_FRESH'::public.perishability_class
        when 'MEDIUM_SHELF' then 'MEDIUM_SHELF'::public.perishability_class
        when 'DRY_STABLE' then 'DRY_STABLE'::public.perishability_class
        else 'SHORT_SHELF'::public.perishability_class
      end,
      image_requirements, '{"primary":"loose"}'::jsonb,
      '{"ethyleneAware":true,"freshnessScored":true}'::jsonb,
      array['south-indian','hyperlocal'], 'CATEGORY',
      jsonb_build_object('source_dataset','south_indian_production_ingestion','schema_revision',2),
      'active', true, 97,
      jsonb_build_object('duplicate_detection_scope','canonical_slug_botanical_region')
    )
    on conflict (slug) do update
    set department_id = excluded.department_id,
        aliases = excluded.aliases,
        search_terms = excluded.search_terms,
        ontology_metadata = public.categories.ontology_metadata || excluded.ontology_metadata,
        governance_metadata = public.categories.governance_metadata || excluded.governance_metadata
    returning id into cat_uuid;

    insert into public.subcategories (
      department_id, category_id, slug, canonical_name, aliases, search_terms, regional_priority,
      perishability_class, image_requirements, packaging_defaults, fulfillment_constraints, discovery_tags,
      sort_order, is_active, status, is_mvp_enabled, quality_score, governance_metadata
    )
    values (
      dept_uuid, cat_uuid, p->>'subcategory', initcap(replace(p->>'subcategory','-',' ')),
      array(select jsonb_array_elements_text(p->'aliases')),
      array(select jsonb_array_elements_text(p->'search')),
      '{"TN":100,"KL":100,"KA":100,"AP":100,"TS":100}'::jsonb,
      case p->>'class'
        when 'SAME_DAY_FRESH' then 'SAME_DAY_FRESH'::public.perishability_class
        when 'MEDIUM_SHELF' then 'MEDIUM_SHELF'::public.perishability_class
        when 'DRY_STABLE' then 'DRY_STABLE'::public.perishability_class
        else 'SHORT_SHELF'::public.perishability_class
      end,
      image_requirements, '{"primary":"loose"}'::jsonb,
      '{"imagePipelineRequired":true,"variantSeparated":true}'::jsonb,
      array(select jsonb_array_elements_text(p->'context')),
      10, true, 'active', true, 97,
      jsonb_build_object('source_dataset','south_indian_production_ingestion','schema_revision',2)
    )
    on conflict (slug) do update
    set category_id = excluded.category_id,
        aliases = excluded.aliases,
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
      array(select jsonb_array_elements_text(p->'aliases')),
      array(select jsonb_array_elements_text(p->'search')),
      '{"TN":100,"KL":100,"KA":100,"AP":100,"TS":100}'::jsonb,
      case p->>'class'
        when 'SAME_DAY_FRESH' then 'SAME_DAY_FRESH'::public.perishability_class
        when 'MEDIUM_SHELF' then 'MEDIUM_SHELF'::public.perishability_class
        when 'DRY_STABLE' then 'DRY_STABLE'::public.perishability_class
        else 'SHORT_SHELF'::public.perishability_class
      end,
      image_requirements, '{"primary":"loose"}'::jsonb,
      '{"governanceCompatible":true,"aiIngestionReady":true}'::jsonb,
      array(select jsonb_array_elements_text(p->'context')),
      true, 'active', true, 97,
      jsonb_build_object('source_dataset','south_indian_production_ingestion','botanical_name',p->>'botanical')
    )
    on conflict (slug) do update
    set aliases = excluded.aliases,
        search_terms = excluded.search_terms,
        governance_metadata = public.product_families.governance_metadata || excluded.governance_metadata
    returning id into family_uuid;

    product_sku := 'SI-FP-' || (p->>'code') || '-' || lpad((mod(('x' || substr(md5(p->>'slug'), 1, 8))::bit(32)::bigint, 1000000))::text, 6, '0');
    region_code := (p->>'region')::public.commerce_region;

    insert into public.master_products (
      canonical_name, normalized_name, slug, description, short_description, department_id, category_id,
      subcategory_id, product_family_id, product_group, product_type, origin_region, internal_sku,
      seller_visibility, active_status, english_name, tamil_name, tamil_transliteration, telugu_name,
      kannada_name, malayalam_name, hindi_name, romanized_variants, discovery_tags, dietary_classification,
      regional_priority, metadata, status, is_mvp_enabled, quality_score, moderation_required, governance_metadata
    )
    values (
      p->>'name', lower(p->>'name'), p->>'slug',
      (p->>'name') || ' canonical catalog record for South Indian hyperlocal commerce, backed by research-supplied botanical, regional, alias, freshness, packaging, and discovery metadata.',
      'Canonical ' || lower(p->>'name') || ' with multilingual discovery, SKU-ready variants, image slots, and operational freshness rules.',
      dept_uuid, cat_uuid, subcat_uuid, family_uuid, p->>'botanical', p->>'type', region_code, product_sku,
      'PUBLIC', 'ACTIVE', p->>'name', p->'languages'->>'ta', p->'languages'->>'roman',
      p->'languages'->>'te', p->'languages'->>'kn', p->'languages'->>'ml', p->'languages'->>'hi',
      array(select jsonb_array_elements_text(p->'aliases')),
      array(select jsonb_array_elements_text(p->'context')),
      jsonb_build_object('botanical_name', p->>'botanical', 'vegetarian', true, 'gi_specialty', p->>'type' = 'GI_SPECIALTY'),
      jsonb_build_object(p->>'region', 100, 'TN', 85, 'KL', 85, 'KA', 85, 'AP', 85, 'TS', 85),
      jsonb_build_object(
        'source_dataset','south_indian_production_ingestion',
        'schema_revision',2,
        'taxonomy_tier','tier_1_commerce_ontology',
        'normalization_tier','tier_1_5_governance',
        'discovery_tier','tier_2_multilingual_voice_search',
        'operations_tier','tier_3_freshness_logistics',
        'ai_tier','tier_4_image_ocr_embedding_ingestion',
        'orchestration_tier','tier_5_autonomous_replenishment',
        'botanical_name', p->>'botanical',
        'aliases', p->'aliases',
        'search_metadata', jsonb_build_object(
          'search_tokens', p->'search',
          'phonetic_tokens', p->'phonetic',
          'transliteration_tokens', p->'aliases',
          'voice_tokens', p->'aliases',
          'recipe_tokens', p->'recipes',
          'festival_tokens', p->'festivals',
          'context_tokens', p->'context'
        ),
        'operational_metadata', p->'operations',
        'image_ingestion', jsonb_build_object(
          'requirements', image_requirements,
          'image_search_terms', p->'image'->'search_terms',
          'visual_search_tags', p->'image'->'visual_search_tags',
          'packaging_visibility_required', true,
          'ocr_visibility_required_for', jsonb_build_array('SHELF','PACKAGING'),
          'duplicate_detection_hints', jsonb_build_array(lower(p->>'name'), lower(p->>'botanical'), p->>'slug')
        ),
        'ai_ingestion_readiness', jsonb_build_object(
          'embedding_metadata', jsonb_build_object('model_family','multilingual_dense_embedding','hybrid_rrf_k',60),
          'ocr_aliases', p->'aliases',
          'visual_search_tags', p->'image'->'visual_search_tags',
          'packaging_signatures', jsonb_build_object('loose_or_bundle',true,'fake_brand_packaging_rejected',true),
          'ai_match_tokens', (p->'search') || (p->'aliases')
        ),
        'inventory_generation', jsonb_build_object('starter_inventory_seeded',false,'reason','research does not provide seller stock counts or item prices')
      ),
      'active', true, 98, false,
      jsonb_build_object(
        'duplicate_detection_keys', jsonb_build_array(lower(p->>'name'), lower(p->>'botanical'), p->>'slug', lower(p->>'region')),
        'moderation_state','approved_curated_research_seed',
        'quality_indicators', jsonb_build_object('taxonomy_integrity',true,'variant_separation',true,'multilingual_aliases',true,'image_pipeline_ready',true,'inventory_placeholders_only',true),
        'replay_safe', true
      )
    )
    on conflict (slug) do update
    set canonical_name = excluded.canonical_name,
        normalized_name = excluded.normalized_name,
        description = excluded.description,
        romanized_variants = excluded.romanized_variants,
        metadata = public.master_products.metadata || excluded.metadata,
        governance_metadata = public.master_products.governance_metadata || excluded.governance_metadata,
        quality_score = greatest(public.master_products.quality_score, excluded.quality_score)
    returning id into product_uuid;

    foreach v in array array(select jsonb_array_elements(p->'variants'))
    loop
      select id into unit_uuid from public.units where slug = coalesce(v->>'unit','kilogram');
      if unit_uuid is null then
        select id into unit_uuid from public.units where slug = 'kilogram';
      end if;

      select id into packaging_uuid from public.packaging_types where slug = v->>'packaging';
      select id into perishability_uuid from public.perishability_profiles where slug =
        case
          when p->>'class' = 'SAME_DAY_FRESH' and p->>'category' = 'fresh-herbs' then 'fresh-herb-3d-cold-breathable'
          when p->>'class' = 'SAME_DAY_FRESH' then 'same-day-leafy-greens-5c-high-hydration'
          when p->>'class' = 'DRY_STABLE' then 'dry-gi-chilli-stable'
          when p->>'category' = 'fresh-fruits' then 'whole-fruit-5d-ambient-ventilated'
          when p->>'subcategory' = 'festival-produce' then 'festival-bundle-medium-shelf'
          else 'soft-solanaceous-7d-cool-ventilated'
        end;
      select id into delivery_uuid from public.delivery_constraints where slug =
        case
          when p->>'class' = 'SAME_DAY_FRESH' then 'leafy-greens-bike-delivery-critical'
          when p->>'class' = 'DRY_STABLE' then 'dry-spice-staple-hyperlocal'
          when p->>'subcategory' = 'festival-produce' then 'festival-produce-standard-hyperlocal'
          else 'soft-fruit-vegetable-rigid-bike-delivery'
        end;

      variant_sku := product_sku || '-' || upper(regexp_replace(left(v->>'name', 18), '[^A-Za-z0-9]+', '-', 'g'));

      insert into public.catalog_product_variants (
        product_id, variant_type, variant_name, quantity, unit_id, normalized_metric_value,
        normalized_metric_unit, min_metric_value, max_metric_value, packaging_type_id, shelf_life_hours,
        storage_requirement, fragile_flag, cold_chain_required, max_delivery_radius_km, freshness_window_minutes,
        reorder_threshold, sku_template, is_active, metadata, status, is_mvp_enabled, quality_score, governance_metadata
      )
      values (
        product_uuid, (v->>'variant_type')::public.variant_type, v->>'name',
        nullif(v->>'quantity','')::numeric, unit_uuid, nullif(v->>'metric','')::numeric,
        v->>'metric_unit', nullif(v->>'min','')::numeric, nullif(v->>'max','')::numeric, packaging_uuid,
        (v->>'shelf')::integer, v->>'storage', coalesce((v->>'fragile')::boolean, false),
        false,
        case when p->>'class' = 'SAME_DAY_FRESH' then 4 when p->>'class' = 'DRY_STABLE' then 8 else 6 end,
        nullif(v->>'freshness','')::integer, null, variant_sku, true,
        jsonb_build_object(
          'source_dataset','south_indian_production_ingestion',
          'sku_ready_identifier', variant_sku,
          'inventory_placeholder', true,
          'pricing_placeholder', true,
          'packaging_type', v->>'packaging',
          'storage_requirements', v->>'storage',
          'perishability', p->>'class',
          'freshness_profile', p->'operations',
          'image_pipeline_ready', true,
          'seller_inventory_requires_real_stock', true
        ),
        'active', true, 98,
        jsonb_build_object(
          'duplicate_detection_keys', jsonb_build_array(variant_sku, p->>'slug', lower(v->>'name')),
          'moderation_state','approved_curated_research_seed'
        )
      )
      on conflict (sku_template) do update
      set metadata = public.catalog_product_variants.metadata || excluded.metadata,
          governance_metadata = public.catalog_product_variants.governance_metadata || excluded.governance_metadata
      returning id into variant_uuid;

      insert into public.product_logistics_profiles (product_id, variant_id, perishability_profile_id, delivery_constraint_id, region_codes, notes, metadata)
      values (
        product_uuid, variant_uuid, perishability_uuid, delivery_uuid, all_regions,
        'Operational profile seeded from South Indian fresh produce research ingestion.',
        jsonb_build_object(
          'temperature_constraints_c', p->'operations'->'temperature_c',
          'delivery_sensitivity', p->'operations'->>'delivery_sensitivity',
          'ethylene_metadata', jsonb_build_object('production',p->'operations'->>'ethylene_production','sensitivity',p->'operations'->>'ethylene_sensitivity'),
          'telemetry_alerts', jsonb_build_object('temperature_breach_c',38,'temperature_duration_minutes',15,'vibration_rms_g',1.8,'ambient_delay_minutes',45),
          'quality_degradation_model_ready', true
        )
      )
      on conflict (product_id, variant_id, perishability_profile_id, delivery_constraint_id) do update
      set metadata = public.product_logistics_profiles.metadata || excluded.metadata;
    end loop;

    foreach a in array array(select jsonb_array_elements_text(p->'aliases'))
    loop
      insert into public.product_aliases (product_id, alias, normalized_alias, alias_type, language, region_codes, confidence, source, metadata)
      values (
        product_uuid, a, lower(regexp_replace(a, '\s+', ' ', 'g')),
        case when a = any(array(select jsonb_array_elements_text(p->'phonetic'))) then 'PHONETIC'::public.product_alias_type else 'REGIONAL'::public.product_alias_type end,
        'roman', all_regions, 0.97, 'curated_research_seed',
        jsonb_build_object('soundex_key',extensions.soundex(a),'voice_ready',true,'ocr_ready',true,'source_dataset','south_indian_production_ingestion')
      )
      on conflict (product_id, normalized_alias, alias_type, language) do update
      set confidence = greatest(public.product_aliases.confidence, excluded.confidence),
          metadata = public.product_aliases.metadata || excluded.metadata;
    end loop;

    foreach token in array
      array(select jsonb_array_elements_text(p->'search')) ||
      array(select jsonb_array_elements_text(p->'aliases')) ||
      array(select jsonb_array_elements_text(p->'recipes')) ||
      array(select jsonb_array_elements_text(p->'festivals')) ||
      array(select jsonb_array_elements_text(p->'context'))
    loop
      insert into public.search_tokens (product_id, token, normalized_token, token_type, language, region_codes, recipe_associations, co_purchase_tags, weight, metadata)
      values (
        product_uuid, token, lower(token),
        case
          when token = any(array(select jsonb_array_elements_text(p->'recipes'))) then 'RECIPE'::public.search_token_type
          when token = any(array(select jsonb_array_elements_text(p->'festivals'))) then 'INTENT'::public.search_token_type
          when token = any(array(select jsonb_array_elements_text(p->'phonetic'))) then 'PHONETIC'::public.search_token_type
          else 'SEMANTIC'::public.search_token_type
        end,
        'roman', all_regions,
        array(select jsonb_array_elements_text(p->'recipes')),
        array(select jsonb_array_elements_text(p->'context')),
        case when token = p->>'name' then 1.2 else 1.0 end,
        jsonb_build_object('source_dataset','south_indian_production_ingestion','vector_ready',true,'voice_ready',true)
      )
      on conflict do nothing;
    end loop;

    insert into public.multilingual_mappings (
      entity_table, entity_id, language, native_text, transliteration, romanized_variants,
      phonetic_tokens, ocr_variants, voice_variants, confidence, source, metadata
    )
    select 'master_products', product_uuid, lang::public.commerce_language, native_text, native_text,
      array(select jsonb_array_elements_text(p->'aliases')),
      array(select jsonb_array_elements_text(p->'phonetic')),
      array(select jsonb_array_elements_text(p->'aliases')),
      array(select jsonb_array_elements_text(p->'aliases')),
      0.96, 'curated_research_seed',
      jsonb_build_object('source_dataset','south_indian_production_ingestion','voice_commerce_ready',true)
    from (
      values
        ('ta', p->'languages'->>'ta'),
        ('te', p->'languages'->>'te'),
        ('kn', p->'languages'->>'kn'),
        ('ml', p->'languages'->>'ml'),
        ('hi', p->'languages'->>'hi'),
        ('roman', p->'languages'->>'roman')
    ) as m(lang, native_text)
    on conflict (entity_table, entity_id, language, native_text) do update
    set romanized_variants = excluded.romanized_variants,
        phonetic_tokens = excluded.phonetic_tokens,
        voice_variants = excluded.voice_variants,
        metadata = public.multilingual_mappings.metadata || excluded.metadata;

    foreach v_image_kind in array array['HERO','TRANSPARENT_PNG','SHELF','PACKAGING','MOBILE_THUMBNAIL']
    loop
      insert into public.catalog_product_images (
        product_id, image_kind, storage_path, alt_text, width, height, aspect_ratio,
        mime_type, white_background, mobile_optimized, no_watermark, lighting_quality,
        compression_artifact_score, lazy_loading_ready, packaging_visibility, ocr_readability,
        dominant_colors, metadata
      )
      values (
        product_uuid, v_image_kind::public.product_image_kind,
        'catalog-ingestion/pending/south-indian-production-ingestion/' || (p->>'slug') || '/' || lower(v_image_kind) || '.webp',
        (p->>'name') || ' ' || lower(replace(v_image_kind, '_', ' ')) || ' ingestion slot',
        case when v_image_kind = 'SHELF' then 1600 else 1200 end,
        case when v_image_kind = 'SHELF' then 900 else 1200 end,
        case when v_image_kind = 'SHELF' then '16:9' else '1:1' end,
        'image/webp', v_image_kind <> 'SHELF', true, true, 'pending_curated_capture_5500k_6500k',
        0, true, case when v_image_kind in ('PACKAGING','SHELF') then 0.7 else 0.55 end,
        case when v_image_kind in ('PACKAGING','SHELF') then 0.65 else 0.35 end,
        array['fresh-produce-natural','south-indian-market'],
        jsonb_build_object(
          'image_status','placeholder_for_curated_ingestion',
          'image_requirements', image_requirements,
          'image_search_terms', p->'image'->'search_terms',
          'visual_search_tags', p->'image'->'visual_search_tags',
          'packaging_visibility_requirements', jsonb_build_object('loose_product_visible',true,'shelf_label_visible',v_image_kind in ('SHELF','PACKAGING')),
          'duplicate_detection_hints', jsonb_build_array(lower(p->>'name'), lower(p->>'botanical'), p->>'slug'),
          'ocr_visibility_requirements', jsonb_build_object('regional_alias_label_allowed',true,'canonical_name_label_required_for_shelf',v_image_kind = 'SHELF'),
          'reject', jsonb_build_array('watermark','marketplace_screenshot','fake_ai_packaging','low_resolution_thumbnail')
        )
      )
      on conflict do nothing;
    end loop;

    if not exists (
      select 1 from public.search_validation_reports svr
      where svr.product_id = product_uuid
        and svr.metadata->>'report_source' = 'south_indian_production_ingestion'
    ) then
      insert into public.search_validation_reports (
        product_id, alias_count, transliteration_count, phonetic_token_count, autocomplete_token_count,
        multilingual_coverage, recipe_association_count, co_purchase_tag_count, readiness_score, missing_requirements, metadata
      )
      values (
        product_uuid,
        jsonb_array_length(p->'aliases'), jsonb_array_length(p->'aliases'), jsonb_array_length(p->'phonetic'),
        jsonb_array_length(p->'search'), '{"ta":true,"te":true,"kn":true,"ml":true,"hi":true,"roman":true}'::jsonb,
        jsonb_array_length(p->'recipes'), jsonb_array_length(p->'context'), 98, array[]::text[],
        jsonb_build_object('report_source','south_indian_production_ingestion','embedding_metadata',jsonb_build_object('model_family','multilingual_dense_embedding','hybrid_rrf_k',60))
      );
    end if;

    if not exists (
      select 1 from public.taxonomy_integrity_reports tir
      where tir.product_id = product_uuid
        and tir.metadata->>'source_dataset' = 'south_indian_production_ingestion'
    ) then
      insert into public.taxonomy_integrity_reports (
        product_id, category_id, depth_valid, parent_relationship_valid, orphan_product,
        regional_tags_valid, festival_tags_valid, consistency_score, findings, metadata
      )
      values (
        product_uuid, cat_uuid, true, true, false, true, true, 99, array[]::text[],
        jsonb_build_object('source_dataset','south_indian_production_ingestion','botanical_name',p->>'botanical','schema_revision',2)
      );
    end if;

    if not exists (
      select 1 from public.product_quality_scores pqs
      where pqs.product_id = product_uuid
        and pqs.metadata->>'source_dataset' = 'south_indian_production_ingestion'
    ) then
      insert into public.product_quality_scores (
        product_id, score, grade, metadata_completeness_score, image_quality_score,
        category_consistency_score, variant_validity_score, search_readiness_score,
        seller_usage_score, duplicate_confidence_score, moderation_confidence_score,
        auto_visibility, findings, metadata
      )
      values (
        product_uuid, 98, 'production_grade', 99, 92, 99, 98, 99, 0, 5, 98,
        'active', '[]'::jsonb,
        jsonb_build_object('source_dataset','south_indian_production_ingestion','inventory_not_seeded_reason','no research stock counts or seller pricing')
      );
    end if;
  end loop;

  insert into public.south_indian_mandi_nodes (slug, name, state_code, sourcing_catchments, peak_window, flow_routes, governance_profile, logistics_profile, risk_metadata)
  values
    ('koyambedu-kwmc', 'Koyambedu Wholesale Market Complex', 'TN', array['Tiruvallur','Kanchipuram','Cuddalore','Vellore'], '04:00-08:00', array['Chennai Metro','Vellore','Pondicherry'], '{"blocks":["Periyar Vegetable Market","Anna Fruits Market","Flower Market"],"shop_categories":{"A1_sqft":2400,"A2_sqft":1200,"A3_sqft":600,"A4_sqft":300,"A5_sqft":150},"association_roles":["President","Vice President","Legal Advisor","Honorary President","Secretary","Assistant Secretary","Treasurer","10 Committee Members"]}'::jsonb, '{"retail_exit_before":"07:00","tanfeed_cold_storage":true,"waste_biomethanisation_tpd":30}'::jsonb, '{"lockdown_hour_change_risk":"sales drop can cause large perishable waste","documented_waste_tonnes":500}'::jsonb),
    ('kr-market-bengaluru', 'Sri Jayachamarajendra KR Market', 'KA', array['Bangalore Rural','Kolar','Chikkaballapur','Tumkur'], '04:00-08:00', array['Bangalore Urban','Mysore','Tumkur'], '{"established":1928,"merchant_listing_scale":"800 plus verified listings"}'::jsonb, '{"metro_demand_share_pct":40,"wholesale_discount_vs_supermarket_pct":25}'::jsonb, '{}'::jsonb),
    ('bowenpally-market', 'Bowenpally Vegetable Market', 'TS', array['Rangareddy','Medchal-Malkajgiri','Medak'], '07:00-11:00', array['Hyderabad Metro','Warangal','Secunderabad'], '{"supply_agreements":["hotels","restaurants","caterers"]}'::jsonb, '{"operating_window":"07:00-21:00","transporters":["Royal Transport","Sneha Packers","Gati Logistics","L R Transport"]}'::jsonb, '{}'::jsonb),
    ('oddanchatram-gandhi-market', 'Oddanchatram Gandhi Market', 'TN', array['Dindigul','Theni','Madurai','Karur'], '21:00-04:00', array['Palakkad','Thrissur','Ernakulam','Erode','Salem','Madurai'], '{"commission_agent_fee_pct_range":[7,10],"same_day_cash_payment":true}'::jsonb, '{"farmer_transport_cost_per_45kg_bag_inr":27,"handling_fee_per_crate_inr":15,"transporters":["TVLS Transports","Siva Surya Roadways","Malar Freeze","Deva Freeze"]}'::jsonb, '{"downgrade_trigger_damage_pct":5,"downgrade_price_cut_pct":60}'::jsonb),
    ('netaji-daily-market-erode', 'Netaji Daily Market', 'TN', array['Erode','Tiruppur','Coimbatore'], '04:00-09:00', array['Coimbatore','Erode Rural','Salem'], '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)
  on conflict (slug) do update
  set sourcing_catchments = excluded.sourcing_catchments,
      flow_routes = excluded.flow_routes,
      governance_profile = public.south_indian_mandi_nodes.governance_profile || excluded.governance_profile,
      logistics_profile = public.south_indian_mandi_nodes.logistics_profile || excluded.logistics_profile,
      risk_metadata = public.south_indian_mandi_nodes.risk_metadata || excluded.risk_metadata,
      updated_at = now();

  insert into public.produce_quality_models (product_slug, model_key, model_type, stages, sensor_features, formula_metadata, image_label_protocol, governance_metadata)
  values
    ('country-tomato', 'tomato_7_stage_ri', 'maturity_index', '[{"stage":0,"name":"Green Mature"},{"stage":1,"name":"Breaker"},{"stage":2,"name":"Turning"},{"stage":3,"name":"Pink"},{"stage":4,"name":"Light-Red"},{"stage":5,"name":"Red"},{"stage":6,"name":"Red-Ripe"}]'::jsonb, '{"reflectance_nm":521,"hyperspectral_ready":true,"vis_nir_ready":true}'::jsonb, '{"ripening_index":"sum(FN_i * RS_i) / (FN_total * 6) * 100","r521_prediction":"y = -2.456 ln(R521) - 1.093"}'::jsonb, image_requirements, '{"moderation_state":"approved_curated_research_seed"}'::jsonb),
    ('okra', 'okra_ld_ratio_grade', 'dimension_grade', '[{"grade":"Very Small","diameter_cm":"<1.22","length_cm":"<2.42","ld_ratio":"<1.98"},{"grade":"Small","diameter_cm":"1.22-1.77","length_cm":"2.42-4.08","ld_ratio":"1.98-2.28"},{"grade":"Medium","diameter_cm":"1.77-2.11","length_cm":"4.08-5.50","ld_ratio":"2.28-2.55"},{"grade":"Large / Over-mature","diameter_cm":">2.11","length_cm":">5.50","ld_ratio":">2.55"}]'::jsonb, '{"image_measurement_r2":{"diameter":0.9117,"length":0.9783,"ld_ratio":0.9678}}'::jsonb, '{}'::jsonb, image_requirements, '{"moderation_state":"approved_curated_research_seed"}'::jsonb)
  on conflict (product_slug, model_key) do update
  set stages = excluded.stages,
      sensor_features = excluded.sensor_features,
      formula_metadata = excluded.formula_metadata,
      image_label_protocol = excluded.image_label_protocol;

  insert into public.produce_volatility_episodes (episode_code, target_product_slugs, trigger, measured_supply_deficit, peak_mandi_shift, peak_retail_price, supply_chain_breakdown, metadata)
  values
    ('VOL-TOM-2023', array['country-tomato'], 'Heavy monsoon rains in Karnataka', '12.9% output decline', 'INR 1,800 to INR 6,700 per quintal', 'INR 350+ per kg', 'Extreme rain flooded fields, damaged root systems, and washed out transit highways.', '{"year":2023}'::jsonb),
    ('VOL-ON-2023', array['bangalore-rose-onion'], 'Hailstorms and unseasonal rain in Maharashtra', '28.5% storage decay', 'INR 1,260 to INR 3,900 per quintal', 'INR 120 per kg', 'Wet harvests caused storage rot and delayed winter crop planting.', '{"year":2023}'::jsonb),
    ('VOL-FBN-2026', array['amaranth-greens','okra','dill-leaves','curry-leaves'], 'Extreme summer heatwave in transit routes', '30% volume drop', 'INR 3,500 to INR 11,000 per quintal', 'INR 250 per kg', 'High heat accelerated dehydration, wilting, and decay in non-refrigerated trucks.', '{"year":2026,"decay_premium":true}'::jsonb)
  on conflict (episode_code) do update
  set target_product_slugs = excluded.target_product_slugs,
      metadata = public.produce_volatility_episodes.metadata || excluded.metadata;

  insert into public.produce_storage_compatibility_rules (rule_key, producer_product_slugs, sensitive_product_slugs, risk_level, rule_text, operational_action, metadata)
  values
    ('ethylene-dark-store-isolation', array['banana-poovan-nendran','banaganapalle-mango','country-tomato'], array['amaranth-greens','malabar-spinach','okra','curry-leaves'], 'critical', 'Bananas, mangoes, and tomatoes must be isolated from leafy greens, cucumbers, and okra unless ethylene remains below 0.1 ppm.', 'Block co-storage or require ethylene filtration under 0.1 ppm.', '{"ethylene_ppm_max":0.1}'::jsonb),
    ('last-mile-banana-leafy-exclusion', array['banana-poovan-nendran'], array['amaranth-greens','malabar-spinach','curry-leaves','dill-leaves'], 'critical', 'Delivery packing must prevent bananas from sharing a bag with coriander, spinach, or similar leafy greens.', 'Generate packer hard-stop and reduce leafy shelf-life estimate from 48 hours to 6 hours if breached.', '{"shelf_life_breach_hours":6}'::jsonb)
  on conflict (rule_key) do update
  set metadata = public.produce_storage_compatibility_rules.metadata || excluded.metadata;

  insert into public.recipe_mappings (recipe_key, recipe_name, language, region, required_terms, optional_terms, metadata)
  values
    ('sambar-starter-bundle', 'Sambar Starter Bundle', 'en', 'TN', array['country-tomato','bangalore-rose-onion','drumstick','curry-leaves'], array['okra','brinjal'], '{"association_rule":{"small_onion_to_drumstick":{"support":0.18,"confidence":0.72,"lift":3.40}}}'::jsonb),
    ('kerala-tempering-bundle', 'Kerala Tempering Bundle', 'en', 'KL', array['fresh-coconut','curry-leaves','byadagi-chilli'], array[]::text[], '{"sadya_base":true}'::jsonb),
    ('keerai-poriyal-bundle', 'Keerai Poriyal Bundle', 'en', 'TN', array['amaranth-greens','kodaikanal-malai-poondu','fresh-coconut'], array['curry-leaves'], '{"association_rule":{"greens_to_garlic":{"support":0.14,"confidence":0.65,"lift":2.80}}}'::jsonb)
  on conflict (recipe_key, (coalesce(region, 'all')), language) do update
  set required_terms = excluded.required_terms,
      optional_terms = excluded.optional_terms,
      metadata = public.recipe_mappings.metadata || excluded.metadata;

  insert into public.south_indian_festival_product_curves (
    festival_key, event_key, product_id, product_slug, region_code, curve,
    surge_multiplier, preparation_alert_threshold, metadata
  )
  select f.festival_key, f.event_key, mp.id, mp.slug, (f.metadata->>'region')::public.commerce_region, f.curve, f.surge, 0.7, f.metadata
  from (
    values
      ('pongal','jan-harvest-sourcing','whole-sugarcane-stalk','{"secure_days_before":14,"basket":["whole-sugarcane-stalk","fresh-turmeric-plant"]}'::jsonb,2.2,'{"region":"TN"}'::jsonb),
      ('pongal','jan-harvest-sourcing','fresh-turmeric-plant','{"secure_days_before":14,"basket":["whole-sugarcane-stalk","fresh-turmeric-plant"]}'::jsonb,2.0,'{"region":"TN"}'::jsonb),
      ('onam-sadya','aug-sep-sadya-sourcing','banana-poovan-nendran','{"secure_days_before":14,"basket":["banana-poovan-nendran","ash-gourd","elephant-foot-yam","fresh-coconut","banana-leaf"]}'::jsonb,2.1,'{"region":"KL"}'::jsonb),
      ('onam-sadya','aug-sep-sadya-sourcing','ash-gourd','{"secure_days_before":14,"basket":["banana-poovan-nendran","ash-gourd","elephant-foot-yam","fresh-coconut","banana-leaf"]}'::jsonb,1.9,'{"region":"KL"}'::jsonb),
      ('onam-sadya','aug-sep-sadya-sourcing','elephant-foot-yam','{"secure_days_before":14,"basket":["banana-poovan-nendran","ash-gourd","elephant-foot-yam","fresh-coconut","banana-leaf"]}'::jsonb,1.9,'{"region":"KL"}'::jsonb),
      ('onam-sadya','aug-sep-sadya-sourcing','fresh-coconut','{"secure_days_before":14,"basket":["banana-poovan-nendran","ash-gourd","elephant-foot-yam","fresh-coconut","banana-leaf"]}'::jsonb,2.3,'{"region":"KL"}'::jsonb),
      ('onam-sadya','aug-sep-sadya-sourcing','banana-leaf','{"secure_days_before":14,"basket":["banana-poovan-nendran","ash-gourd","elephant-foot-yam","fresh-coconut","banana-leaf"]}'::jsonb,2.5,'{"region":"KL"}'::jsonb)
  ) as f(festival_key,event_key,slug,curve,surge,metadata)
  join public.master_products mp on mp.slug = f.slug
  on conflict (festival_key, event_key, product_id) do update
  set product_slug = excluded.product_slug,
      region_code = excluded.region_code,
      curve = excluded.curve,
      surge_multiplier = excluded.surge_multiplier,
      preparation_alert_threshold = excluded.preparation_alert_threshold,
      metadata = public.south_indian_festival_product_curves.metadata || excluded.metadata,
      updated_at = now();

  insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
  values
    ('south_indian_fresh_produce_production_ingestion', 'Enables production-grade South Indian fresh produce catalog ingestion with variants, aliases, image slots, freshness metadata, mandi intelligence, festivals, and governance reports.', true, 100, '{"roles":["BUYER","SELLER","ADMIN","SUPER_ADMIN"]}')
  on conflict (key) do update
  set description = excluded.description,
      is_enabled = excluded.is_enabled,
      rollout_percentage = excluded.rollout_percentage,
      audience = excluded.audience,
      updated_at = now();
end $$;
