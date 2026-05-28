create extension if not exists "pgcrypto";
create extension if not exists "fuzzystrmatch";

create unique index if not exists catalog_product_variants_sku_template_unique_idx
  on public.catalog_product_variants(sku_template);

insert into public.packaging_types (slug, name, description, supports_loose_weight, supports_ocr, leak_risk, crush_risk, metadata)
values
  ('pillow-pouch', 'Pillow Pouch', 'Flexible pillow pack used for cooperative milk, oil pouches, and snack packs.', false, true, 0.45, 0.2, '{"matrix_code":"PKG-PIL-POUCH","material_class":"co-extruded PE"}'),
  ('transformer-pouch', 'Transformer Pouch', 'Self-standing zip-lock pouch used for chilled wet batters.', false, true, 0.35, 0.25, '{"matrix_code":"PKG-TRN-POUCH","material_class":"barrier nylon PE"}'),
  ('hanging-strip', 'Hanging Strip', 'Punch-cut sachet strip for high-density petty-shop vertical merchandising.', false, true, 0.1, 0.15, '{"matrix_code":"PKG-HNG-STRIP","material_class":"punch-cut poly"}'),
  ('paper-wrapped-bar', 'Paper Wrapped Bar', 'Water-resistant wrapper around a solid cleaning bar.', false, true, 0.05, 0.35, '{"matrix_code":"PKG-PACKET-BAR","material_class":"treated paper"}'),
  ('glass-jar', 'Glass Jar', 'Airtight sodalime glass jar with screw lid for pickles and condiments.', false, true, 0.2, 0.85, '{"matrix_code":"PKG-GLS-JAR","material_class":"sodalime glass"}'),
  ('opp-pillow-pouch', 'OPP Pillow Pouch', 'Clear oriented polypropylene pillow pack for crisp bakery snacks.', false, true, 0.05, 0.7, '{"matrix_code":"PKG-PIL-OPP","material_class":"oriented polypropylene"}')
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    supports_loose_weight = excluded.supports_loose_weight,
    supports_ocr = excluded.supports_ocr,
    leak_risk = excluded.leak_risk,
    crush_risk = excluded.crush_risk,
    metadata = public.packaging_types.metadata || excluded.metadata;

insert into public.perishability_profiles (
  slug, name, perishability_class, shelf_life_hours, freshness_window_minutes, storage_requirement,
  heat_sensitivity, spoilage_rate, delivery_urgency, max_transit_duration_minutes,
  refrigeration_required, sunlight_sensitivity, stackability, leak_risk, odor_sensitivity, breakability, metadata
)
values
  ('coop-packet-milk-48h-cold-chain', 'Cooperative Packet Milk 48h Cold Chain', 'SHORT_SHELF', 48, 120, 'refrigerated', 0.9, 0.85, 0.9, 60, true, 0.55, 0.65, 0.55, 0.2, 0.25, '{"temperature_celsius":{"min":1,"max":4,"critical_max":8},"spoilage_window_unrefrigerated_hours":4}'),
  ('fermented-batter-168h-chilled', 'Fermented Wet Batter 168h Chilled', 'SHORT_SHELF', 168, 180, 'refrigerated', 0.85, 0.75, 0.8, 90, true, 0.35, 0.45, 0.45, 0.25, 0.35, '{"temperature_celsius":{"min":2,"max":6,"critical_max":10},"spoilage_window_unrefrigerated_hours":12}'),
  ('personal-care-sachet-stable', 'Personal Care Sachet Ambient Stable', 'DRY_STABLE', 17520, null, 'ambient', 0.15, 0.02, 0.1, 240, false, 0.2, 0.9, 0.05, 0.05, 0.1, '{"temperature_celsius":{"min":0,"max":45,"critical_max":50}}'),
  ('dishwash-bar-dry-stable', 'Dishwash Bar Dry Stable', 'DRY_STABLE', 26280, null, 'ambient', 0.1, 0.02, 0.1, 240, false, 0.15, 0.8, 0.02, 0.05, 0.35, '{"humidity_sensitivity":"high_water_immersion_dissolves_bar"}'),
  ('andhra-pickle-glass-jar-stable', 'Andhra Pickle Glass Jar Stable', 'LONG_SHELF', 8760, null, 'ambient', 0.2, 0.08, 0.15, 180, false, 0.35, 0.5, 0.1, 0.65, 0.95, '{"temperature_celsius":{"min":5,"max":40,"critical_max":45},"humidity_sensitivity":"medium_mold_risk_after_opening"}'),
  ('crisp-bakery-snack-humidity-sensitive', 'Crisp Bakery Snack Humidity Sensitive', 'MEDIUM_SHELF', 480, null, 'ambient', 0.25, 0.15, 0.2, 180, false, 0.25, 0.25, 0.02, 0.15, 0.9, '{"humidity_threshold_rh_percent":45,"decay_mode":"loss_of_crunch"}')
on conflict (slug) do update
set name = excluded.name,
    perishability_class = excluded.perishability_class,
    shelf_life_hours = excluded.shelf_life_hours,
    freshness_window_minutes = excluded.freshness_window_minutes,
    storage_requirement = excluded.storage_requirement,
    heat_sensitivity = excluded.heat_sensitivity,
    spoilage_rate = excluded.spoilage_rate,
    delivery_urgency = excluded.delivery_urgency,
    refrigeration_required = excluded.refrigeration_required,
    metadata = public.perishability_profiles.metadata || excluded.metadata;

insert into public.delivery_constraints (
  slug, name, max_delivery_radius_km, max_transit_duration_minutes, cold_chain_required,
  insulated_delivery_required, ice_required, fragile_flag, stackable, morning_priority, route_batching_allowed, metadata
)
values
  ('milk-batter-morning-cold-chain', 'Milk and Batter Morning Cold Chain', 6, 60, true, true, false, false, true, true, true, '{"preferred_window":"03:30-08:30","crate_or_chiller_required":true}'),
  ('dry-sachet-standard-hyperlocal', 'Dry Sachet Standard Hyperlocal', 8, 180, false, false, false, false, true, false, true, '{"hanging_strip_ready":true}'),
  ('fragile-glass-condiment-hyperlocal', 'Fragile Glass Condiment Hyperlocal', 6, 120, false, false, false, true, false, false, true, '{"bubble_wrap_or_separate_crate":true}'),
  ('humidity-sensitive-snack-hyperlocal', 'Humidity Sensitive Snack Hyperlocal', 6, 120, false, false, false, true, false, false, true, '{"keep_dry":true,"avoid_stack_load":true}')
on conflict (slug) do update
set name = excluded.name,
    max_delivery_radius_km = excluded.max_delivery_radius_km,
    max_transit_duration_minutes = excluded.max_transit_duration_minutes,
    cold_chain_required = excluded.cold_chain_required,
    insulated_delivery_required = excluded.insulated_delivery_required,
    fragile_flag = excluded.fragile_flag,
    metadata = public.delivery_constraints.metadata || excluded.metadata;

insert into public.brands (slug, canonical_name, manufacturer, origin_region, country_code, aliases, is_local_brand, metadata)
values
  ('aavin', 'Aavin', 'Tamil Nadu Cooperative Milk Producers Federation Ltd.', 'TN', 'IN', array['TCMPF', 'Aavin Milk'], true, '{"brand_type":"state_dairy_cooperative"}'),
  ('id-fresh', 'iD Fresh', 'iD Fresh Food (India) Pvt. Ltd.', 'KA', 'IN', array['iD Fresh Food', 'ID Fresh'], true, '{"brand_type":"fresh_food_private"}'),
  ('chik', 'Chik', 'CavinKare Pvt. Ltd.', 'TN', 'IN', array['Chik Shampoo', 'CavinKare Chik'], true, '{"brand_type":"regional_fmcg"}'),
  ('vim', 'Vim', 'Hindustan Unilever Limited', null, 'IN', array['Vim Dishwash', 'Vim Bar'], false, '{"brand_type":"national_fmcg"}'),
  ('priya', 'Priya', 'Priya Foods (Ushodaya Enterprises Pvt. Ltd.)', 'AP', 'IN', array['Priya Foods', 'Priya Pickle'], true, '{"brand_type":"regional_condiments"}'),
  ('ootymade', 'OotyMade', 'Registered Firewood Bakers Association of the Nilgiris', 'TN', 'IN', array['Ooty Varkey', 'Ooty Varki'], true, '{"brand_type":"regional_specialty","gi_tagged":true}')
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    manufacturer = excluded.manufacturer,
    origin_region = excluded.origin_region,
    aliases = excluded.aliases,
    is_local_brand = excluded.is_local_brand,
    metadata = public.brands.metadata || excluded.metadata;

do $$
declare
  p jsonb;
  v jsonb;
  token text;
  alias_item jsonb;
  image_kind text;
  product_uuid uuid;
  variant_uuid uuid;
  dept_uuid uuid;
  cat_uuid uuid;
  subcat_uuid uuid;
  family_uuid uuid;
  brand_uuid uuid;
  unit_uuid uuid;
  packaging_uuid uuid;
  perishability_uuid uuid;
  delivery_uuid uuid;
  products jsonb := $json$
[
  {
    "slug": "aavin-nice-toned-milk",
    "sku": "KG-TN-DAIRY-AAVIN-NICE",
    "name": "Aavin Nice Toned Milk",
    "description": "Blue-pack cooperative toned milk for daily tea, coffee, drinking, and household curd setting. Cold-chain item synchronized to early-morning milk booth and petty-shop restocking.",
    "short": "Blue-pack Aavin toned milk for daily tea, coffee, and breakfast baskets.",
    "department": "dairy-breakfast",
    "category": "packet-milk",
    "category_name": "Packet Milk",
    "subcategory": "toned-milk",
    "subcategory_name": "Toned Milk",
    "family": "cooperative-packet-milk",
    "family_name": "Cooperative Packet Milk",
    "product_type": "BRANDED",
    "brand": "aavin",
    "manufacturer": "Tamil Nadu Cooperative Milk Producers Federation Ltd.",
    "region": "TN",
    "english": "Aavin Nice Toned Milk",
    "ta": "ஆவின் நைஸ் டோன்ட் பால்",
    "ta_roman": "aavin nice toned paal",
    "te": "ఆవిన్ నైస్ టోన్డ్ పాలు",
    "kn": "ಆವಿನ್ ನೈಸ್ ಟೋನ್ಡ್ ಹಾಲು",
    "ml": "ആവിൻ ടോൺഡ് പാൽ",
    "hi": "आविन नाइस टोंड दूध (नीला पैकेट)",
    "romanized": ["aavin paal", "aavin blue milk", "aavin nice toned paal", "paal packet"],
    "discovery": ["breakfast", "kids", "quick-cook"],
    "aliases": [
      ["ஆவின் பால்", "REGIONAL", "ta"], ["ஆவின் நீல பாக்கெட்", "SLANG", "ta"], ["aavin blue", "SLANG", "roman"], ["avin milk", "MISSPELLING", "roman"], ["aavin nais tond milk bloo paeket", "PHONETIC", "roman"], ["ఆవిన్ పాలు", "VOICE", "te"], ["ಆವಿನ್ ಹಾಲು", "VOICE", "kn"], ["ആവിൻ പാൽ", "VOICE", "ml"], ["आविन नीला पैकेट", "VOICE", "hi"]
    ],
    "tokens": ["milk", "toned milk", "packet milk", "aavin blue", "tea milk", "coffee milk", "daily milk", "paal", "haalu", "paalu", "doodh", "breakfast tea", "morning coffee", "curd setting", "chennai milk", "coimbatore aavin", "madurai aavin", "trichy aavin"],
    "recipe_tokens": ["tea brewing", "coffee brewing", "curd setting", "payasam"],
    "context_tokens": ["morning breakfast basket", "daily tea restock", "milk booth", "petti kadai"],
    "visual": {"primary":"#0056B3","accent":"#FFFFFF","logo":"Stylized cow face logo enclosed in an oval with Tamil word Aavin.","layout":"Horizontal blue-and-white milk pouch band layout.","tags":["dairy","beverage","perishable","liquid","white_bag","blue_text","tcmpf"]},
    "perishability": "coop-packet-milk-48h-cold-chain",
    "delivery": "milk-batter-morning-cold-chain",
    "relationships": {"used_for":["tea_brewing","coffee_brewing","drinking","infant_nutrition"],"commonly_bought_with":["id_fresh_idli_dosa_batter_1kg","sugar_loose_1kg","bru_instant_coffee_sachet_2rs"],"sold_in":["milk_booth","petti_kadai","kirana_store","supermarket"],"peak_purchase_window":"06:00_AM_to_08:30_AM"},
    "variants": [
      {"name":"500 ml blue pillow pouch","type":"VOLUME","qty":500,"unit":"milliliter","metric":500,"metric_unit":"ml","packaging":"pillow-pouch","shelf_life":48,"storage":"refrigerated","cold":true,"weight":512,"sku":"KG-TN-DAIRY-AAVIN-NICE-500ML","mrp":20.00,"dimensions":{"width_mm":325,"length_mm":150},"crate":{"type":"plastic_crate","contains_qty":24,"gross_weight_kg":13.2}},
      {"name":"1 L blue pillow pouch","type":"VOLUME","qty":1,"unit":"liter","metric":1000,"metric_unit":"ml","packaging":"pillow-pouch","shelf_life":48,"storage":"refrigerated","cold":true,"weight":1015,"sku":"KG-TN-DAIRY-AAVIN-NICE-1L","mrp":40.00}
    ]
  },
  {
    "slug": "id-fresh-classic-idli-dosa-batter",
    "sku": "KG-KA-BATTER-IDF-CLASSIC",
    "name": "iD Fresh Classic Idli & Dosa Batter",
    "description": "Ready-to-cook fermented rice and lentil batter in a patented self-standing transformer pouch with zip-lock, built for chilled breakfast discovery.",
    "short": "Chilled idli and dosa batter in a self-standing zip-lock pouch.",
    "department": "tiffin-batter-products",
    "category": "ready-to-cook-batters",
    "category_name": "Ready-to-Cook Batters",
    "subcategory": "wet-batters",
    "subcategory_name": "Wet Batters",
    "family": "fermented-rice-lentil-batter",
    "family_name": "Fermented Rice and Lentil Batter",
    "product_type": "BRANDED",
    "brand": "id-fresh",
    "manufacturer": "iD Fresh Food (India) Pvt. Ltd.",
    "region": "KA",
    "english": "iD Fresh Classic Idli & Dosa Batter",
    "ta": "ஐடி பிரெஷ் இட்லி தோசை மாவு",
    "ta_roman": "iD fresh idli thosai maavu",
    "te": "ఐడి ఫ్రెష్ ఇడ్లి దోస పిండి",
    "kn": "ಐಡಿ ಫ್ರೆಶ್ ಇಡ್ಲಿ ದೋಸೆ ಹಿಟ್ಟು",
    "ml": "ഐഡി ഫ്രഷ് ഇഡ്ഡലി ദോശ മാവ്",
    "hi": "आईडी फ्रेश इडली डोसा बैटर",
    "romanized": ["idli dosa maavu", "id fresh batter", "idli dose hittu", "idli dosa pindi", "dosa maavu"],
    "discovery": ["breakfast", "quick-cook"],
    "aliases": [
      ["ஐடி இட்லி மாவு", "VOICE", "ta"], ["ஐடி மாவு", "SLANG", "ta"], ["id batter", "SHORTHAND", "roman"], ["idly batter", "MISSPELLING", "roman"], ["id fresh idli dosa baetar", "PHONETIC", "roman"], ["ಐಡಿ ಹಿಟ್ಟು", "VOICE", "kn"], ["ఐడి ఇడ్లి పిండి", "VOICE", "te"], ["ഐഡി മാവ്", "VOICE", "ml"], ["आईडी इडली डोसा घोल", "VOICE", "hi"]
    ],
    "tokens": ["batter", "idli batter", "dosa batter", "id fresh", "fermented batter", "wet batter", "maavu", "hittu", "pindi", "morning breakfast", "dinner dosa", "quick idli", "soft idly", "crispy dosa", "bengaluru breakfast", "chennai quick commerce", "hyderabad id fresh", "kochi batter"],
    "recipe_tokens": ["idli steaming", "dosa cooking", "paniyaram making", "uttapam griddling"],
    "context_tokens": ["morning breakfast basket", "weekend breakfast combo", "apartment delivery bestseller"],
    "visual": {"primary":"#1E7E34","accent":"#FFFFFF","logo":"Green round stamp badge with white iD lowercase lettering.","layout":"Green borders with white central panel showing idlis and dosas.","tags":["fermented","breakfast","wet_batter","green_bag","ziplock","chilled","id_fresh"]},
    "perishability": "fermented-batter-168h-chilled",
    "delivery": "milk-batter-morning-cold-chain",
    "relationships": {"used_for":["idli_steaming","dosa_cooking","paniyaram_making","uttapam_griddling"],"commonly_bought_with":["id_fresh_coconut_chutney","aavin_nice_toned_milk_500ml","gingelly_oil_idhayam_500ml"],"sold_in":["supermarket","quick_commerce_dark_store","milk_booth"],"peak_purchase_window":"06:30_AM_to_09:00_AM"},
    "variants": [
      {"name":"1 kg transformer pouch","type":"WEIGHT","qty":1,"unit":"kilogram","metric":1000,"metric_unit":"g","packaging":"transformer-pouch","shelf_life":168,"storage":"refrigerated","cold":true,"weight":1030,"sku":"KG-KA-BATTER-IDF-CLASSIC-1KG","mrp":90.00,"dimensions":{"width_mm":180,"length_mm":240,"gusset_depth_mm":60},"case_pack":{"type":"corrugated_box","contains_qty":10,"gross_weight_kg":10.8}}
    ]
  },
  {
    "slug": "chik-thick-glossy-black-shampoo-sachet",
    "sku": "KG-TN-PCARE-CHIK-BLACK",
    "name": "Chik Thick & Glossy Black Shampoo Sachet",
    "description": "Single-use black shampoo sachet strip product designed for petty-shop hanging display and low-unit-cost personal care discovery.",
    "short": "One-rupee Chik black shampoo sachet for hanging-strip retail.",
    "department": "personal-care",
    "category": "hair-care",
    "category_name": "Hair Care",
    "subcategory": "shampoo",
    "subcategory_name": "Shampoo",
    "family": "hanging-sachet-shampoo",
    "family_name": "Hanging Sachet Shampoo",
    "product_type": "BRANDED",
    "brand": "chik",
    "manufacturer": "CavinKare Pvt. Ltd.",
    "region": "TN",
    "english": "Chik Thick & Glossy Black Shampoo Sachet",
    "ta": "சிக் பிளாக் ஷாம்பு பாக்கெட் (ஒரு ரூபாய்)",
    "ta_roman": "chik black shampoo sachet",
    "te": "చిక్ బ్లాక్ షాంపూ సాచెట్",
    "kn": "ಚಿಕ್ ಬ್ಲಾಕ್ ಶಾಂಪೂ ಸ್ಯಾಚೆಟ್",
    "ml": "ചിക് ബ്ലാക്ക് ഷാംപൂ സാഷെ",
    "hi": "चिक थिक एंड ग्लॉसी ब्लैक शैम्पू पाउच (एक रुपया)",
    "romanized": ["chik shampoo packet", "oru rubai shampoo", "one rupee shampoo", "chik black"],
    "discovery": ["hostel"],
    "aliases": [
      ["சிக் ஷாம்பு பாக்கெட்", "VOICE", "ta"], ["ஒரு ரூபாய் ஷாம்பு", "SLANG", "ta"], ["chick shampoo", "MISSPELLING", "roman"], ["chik thik end glosi blaek shaampoo saeche", "PHONETIC", "roman"], ["ಚಿಕ್ ಶಾಂಪೂ", "VOICE", "kn"], ["రూపాయి షాంపూ", "SLANG", "te"], ["ഒരു രൂപ ഷാംപൂ", "SLANG", "ml"], ["एक रुपया शैम्पू", "SLANG", "hi"]
    ],
    "tokens": ["shampoo sachet", "shampoo pouch", "chik black", "1rs shampoo", "rupee sachet", "hair wash sachet", "shampoo packet", "chik packet", "weekly bath", "travel hygiene", "hostel essentials", "low cost grooming", "rural kirana", "suburban petti kadai", "college campus shop"],
    "recipe_tokens": [],
    "context_tokens": ["bachelor hygiene basket", "daily petti shop change rounding", "hanging strip impulse"],
    "visual": {"primary":"#000000","accent":"#FAD02C","logo":"Bold yellow serif CHIK letters printed at an upward diagonal tilt.","layout":"Jet black gloss sachet with yellow protein drops and herbal leaves.","tags":["cosmetics","hygiene","shampoo","black_sachet","hanging_strip","one_rupee","cavinkare"]},
    "perishability": "personal-care-sachet-stable",
    "delivery": "dry-sachet-standard-hyperlocal",
    "relationships": {"used_for":["hair_washing","dandruff_cleaning","scalp_care"],"commonly_bought_with":["lifebuoy_red_soap_small","rin_detergent_bar_10rs","center_fresh_gum_1rs"],"sold_in":["petti_kadai","kirana_store","pan_shop"],"peak_purchase_window":"07:30_AM_to_10:00_AM"},
    "variants": [
      {"name":"6 ml hanging sachet","type":"SACHET","qty":6,"unit":"milliliter","metric":6,"metric_unit":"ml","packaging":"hanging-strip","shelf_life":17520,"storage":"ambient","cold":false,"weight":7,"sku":"KG-TN-PCARE-CHIK-BLACK-6ML","mrp":1.00,"dimensions":{"width_mm":50,"length_mm":65},"strip":{"type":"hanging_strip","contains_qty":40,"gross_weight_kg":0.28}}
    ]
  },
  {
    "slug": "vim-dishwash-bar-stain-cutter-lemon",
    "sku": "KG-IN-CLEAN-VIM-LEMON-BAR",
    "name": "Vim Dishwash Bar with Stain Cutter Lemon",
    "description": "Lemon dishwash bar for high-frequency kitchen cleaning, tea-kadai cleanup, and household cleaning baskets.",
    "short": "Green lemon Vim dishwash bar for daily utensil cleaning.",
    "department": "cleaning-supplies",
    "category": "dishwash",
    "category_name": "Dishwash",
    "subcategory": "dishwash-bars",
    "subcategory_name": "Dishwash Bars",
    "family": "solid-cleansing-bars",
    "family_name": "Solid Cleansing Bars",
    "product_type": "BRANDED",
    "brand": "vim",
    "manufacturer": "Hindustan Unilever Limited",
    "region": "TN",
    "english": "Vim Dishwash Bar with Stain Cutter Lemon",
    "ta": "விம் பாத்திரம் தேய்க்கும் சோப் (275 கிராம்)",
    "ta_roman": "vim paathiram theikkum soap",
    "te": "విమ్ పాత్రలు తోముకునే సబ్బు",
    "kn": "ವಿಮ್ ಪಾತ್ರೆ ತೊಳೆಯುವ ಸೋಪು",
    "ml": "വിം പാത്രം കഴുകുന്ന സോപ്പ്",
    "hi": "विम डिशवॉश बार नींबू (275 ग्राम)",
    "romanized": ["vim soap", "vim bar", "paathiram soap", "ginnela soap", "bathan sabbu"],
    "discovery": ["quick-cook"],
    "aliases": [
      ["விம் சோப்", "VOICE", "ta"], ["விம் பார்", "SLANG", "ta"], ["wim bar", "MISSPELLING", "roman"], ["vim dishvaash baar leman", "PHONETIC", "roman"], ["ವಿಮ್ ಸೋಪು", "VOICE", "kn"], ["విమ్ బార్", "SLANG", "te"], ["വിം ബാർ", "SLANG", "ml"], ["बर्तन वाला साबुन", "SLANG", "hi"]
    ],
    "tokens": ["dishwash bar", "vim soap", "dish washing bar", "lemon vim", "utensil cleaner bar", "paathira soap", "ginnela soap", "kitchen cleaning", "removing oily grease", "after meal cleanup", "vessel washing", "chennai home hygiene", "bengaluru apartment delivery", "hyderabad kirana grocery"],
    "recipe_tokens": [],
    "context_tokens": ["monthly ration basket", "kitchen care restock", "tea kadai cleaning"],
    "visual": {"primary":"#28A745","accent":"#FFC107","logo":"Bold red Vim word inside yellow lemon graphic with splash vectors.","layout":"Bright green wrap with yellow bands and lemon wedges.","tags":["dishwash","cleaning","homecare","green_bar","paper_wrap","lemon","hul"]},
    "perishability": "dishwash-bar-dry-stable",
    "delivery": "dry-sachet-standard-hyperlocal",
    "relationships": {"used_for":["vessel_scrubbing","grease_cleaning","utensil_cleaning","sink_washing"],"commonly_bought_with":["gala_steel_scrubber_pack","exo_safai_green_scrubber_pad","sabena_dishwash_powder_450g"],"sold_in":["kirana_store","supermarket","quick_commerce_dark_store","petti_kadai"],"peak_purchase_window":"10:00_AM_to_01:00_PM"},
    "variants": [
      {"name":"275 g paper wrapped bar","type":"WEIGHT","qty":275,"unit":"gram","metric":275,"metric_unit":"g","packaging":"paper-wrapped-bar","shelf_life":26280,"storage":"ambient","cold":false,"weight":282,"sku":"KG-IN-CLEAN-VIM-LEMON-BAR-275G","mrp":20.06,"dimensions":{"width_mm":110,"length_mm":60,"depth_mm":35},"carton":{"type":"corrugated_outer_carton","contains_qty":48,"gross_weight_kg":14.1}}
    ]
  },
  {
    "slug": "priya-mango-avakaya-pickle-with-garlic",
    "sku": "KG-AP-PICKLE-PRIYA-MANGO-AVAKAYA",
    "name": "Priya Mango Avakaya Pickle (With Garlic)",
    "description": "Andhra-style mango avakaya pickle with garlic in a glass jar, used as a high-spice condiment for rice, tiffins, and curd rice.",
    "short": "Priya garlic mango avakaya pickle in a glass jar.",
    "department": "grocery",
    "category": "pickles-chutneys",
    "category_name": "Pickles and Chutneys",
    "subcategory": "mango-pickle",
    "subcategory_name": "Mango Pickle",
    "family": "andhra-avakaya-pickle",
    "family_name": "Andhra Avakaya Pickle",
    "product_type": "BRANDED",
    "brand": "priya",
    "manufacturer": "Priya Foods (Ushodaya Enterprises Pvt. Ltd.)",
    "region": "AP",
    "english": "Priya Mango Avakaya Pickle (With Garlic)",
    "ta": "பிரியா மாங்காய் ஆவக்காய் ஊறுகாய் (பூண்டுடன்)",
    "ta_roman": "priya maangai aavakkaai oorugaai poondudan",
    "te": "ప్రియా మామిడికాయ ఆవకాయ పచ్చడి (వెల్లుల్లితో)",
    "kn": "ಪ್ರಿಯಾ ಮಾವಿನಕಾಯಿ ಆವಕಾಯ ಉಪ್ಪಿನಕಾಯಿ (ಬೆಳ್ಳುಳ್ಳಿಯೊಂದಿಗೆ)",
    "ml": "പ്രിയ മാമ്പഴ ആവകായ അച്ചാർ (വെളുത്തുള്ളിയോടൊപ്പം)",
    "hi": "प्रिया मैंगो आवकाया अचार (लहसुन के साथ)",
    "romanized": ["avakaya pachadi", "oorugaai", "uppinakayi", "aam ka achaar", "andhra avakaya"],
    "discovery": ["spicy", "lunch", "dinner"],
    "aliases": [
      ["பிரியா ஆவக்காய்", "SLANG", "ta"], ["ఆవకాయ", "SLANG", "te"], ["priya aavakaaya", "MISSPELLING", "roman"], ["priya maengo aavakaaya pikl vith gaarlik", "PHONETIC", "roman"], ["ಪ್ರಿಯಾ ಉಪ್ಪಿನಕಾಯಿ", "VOICE", "kn"], ["മാങ്ങ അച്ചാർ", "SLANG", "ml"], ["आवकाया अचार", "SLANG", "hi"]
    ],
    "tokens": ["avakaya pickle", "priya pickle", "mango pickle", "andhra avakaya", "garlic mango pickle", "telugu pickle", "avakaya pachadi", "curd rice side dish", "tiffin accompaniment", "lunchbox condiment", "spicy meal twist", "vijayawada authentic avakaya", "hyderabad spice pickles", "chennai andhra grocery", "bengaluru regional staples"],
    "recipe_tokens": ["curd rice side dish", "tiffin dipping", "rice seasoning"],
    "context_tokens": ["monthly grocery ration", "andhra culinary feast basket"],
    "visual": {"primary":"#DC3545","accent":"#FFC107","logo":"White Priya calligraphic script in a red drop emblem with golden highlights.","layout":"White jar label with red borders and green mango wedges in chili oil.","tags":["pickle","andhra_avakaya","condiment","glass_jar","red_label","priya_foods"]},
    "perishability": "andhra-pickle-glass-jar-stable",
    "delivery": "fragile-glass-condiment-hyperlocal",
    "relationships": {"used_for":["rice_seasoning","tiffins_dipping","breakfast_enrichment"],"commonly_bought_with":["id_fresh_classic_idli_dosa_batter_1kg","loose_rice_ponni_raw","curd_milma_elite_500g"],"sold_in":["supermarket","kirana_store","quick_commerce_dark_store"],"peak_purchase_window":"11:00_AM_to_03:00_PM"},
    "variants": [
      {"name":"300 g glass jar","type":"WEIGHT","qty":300,"unit":"gram","metric":300,"metric_unit":"g","packaging":"glass-jar","shelf_life":8760,"storage":"ambient","cold":false,"fragile":true,"weight":490,"sku":"KG-AP-PICKLE-PRIYA-MANGO-AVAKAYA-300G","mrp":100.00,"dimensions":{"width_mm":75,"length_mm":115},"tray":{"type":"shrink_wrap_tray","contains_qty":12,"gross_weight_kg":6.1}}
    ]
  },
  {
    "slug": "ooty-varkey-small-gi-tagged-biscuit",
    "sku": "KG-TN-SNACK-OOTY-VARKEY",
    "name": "Ooty Varkey Small (GI-Tagged Traditional Biscuit)",
    "description": "Traditional Nilgiris firewood-baked crunchy tea biscuit in clear OPP packaging, highly sensitive to crushing and humidity.",
    "short": "GI-tagged Ooty varkey tea biscuit in a clear crisp-snack pouch.",
    "department": "local-foods",
    "category": "traditional-snacks",
    "category_name": "Traditional Snacks",
    "subcategory": "baked-crispies",
    "subcategory_name": "Baked Crispies",
    "family": "gi-tagged-local-specialties",
    "family_name": "GI-Tagged Local Specialties",
    "product_type": "LOCAL",
    "brand": "ootymade",
    "manufacturer": "Registered Firewood Bakers Association of the Nilgiris",
    "region": "TN",
    "english": "Ooty Varkey Small (GI-Tagged Traditional Biscuit)",
    "ta": "ஊட்டி ஸ்பெஷல் வர்க்கி (சிறிய அளவு - 500 கிராம்)",
    "ta_roman": "ooty special varkey siriya alavu",
    "te": "ఊటీ స్పెషల్ వర్కీ చిన్న సైజు",
    "kn": "ಊಟಿ ಸ್ಪೆಷಲ್ ವರ್ಕಿ ಸಣ್ಣ ಗಾತ್ರ",
    "ml": "ഊട്ടി സ്പെഷ്യൽ വർക്കി ചെറിയ സൈസ്",
    "hi": "ऊटी स्पेशल वरकी (छोटा साइज - 500 ग्राम)",
    "romanized": ["ooty varkey", "ooty varki", "varki biscuit", "tea kadai varkey", "firewood varkey"],
    "discovery": ["tea-time", "local"],
    "aliases": [
      ["ஊட்டி வர்க்கி", "SLANG", "ta"], ["வர்க்கி பிஸ்கட்", "SLANG", "ta"], ["ooty varkey 500gm", "MISSPELLING", "roman"], ["ooti vaarki smaal saiz biskiit", "PHONETIC", "roman"], ["ಊಟಿ ವರ್ಕಿ", "VOICE", "kn"], ["వర్కీ బిస్కట్", "SLANG", "te"], ["വർക്കി ബിസ്ക്കറ്റ്", "SLANG", "ml"], ["वरकी चाय बिस्कुट", "SLANG", "hi"]
    ],
    "tokens": ["ooty varkey", "gi tagged varkey", "traditional tea biscuit", "baked crisp varki", "firewood baked snack", "ooty varki", "tea kadai varkey", "evening tea time", "chai dunking biscuit", "travel snacks pack", "souvenir gift", "nilgiris local snacks", "coonoor bakers special", "ooty roadside tea shop"],
    "recipe_tokens": ["tea dunking", "milk soaking"],
    "context_tokens": ["evening tea combo basket", "nilgiri souvenir travel kit", "tea kadai snack"],
    "visual": {"primary":"#D2B48C","accent":"#228B22","logo":"Green mountain peaks silhouette enclosing rustic firewood brick oven graphic.","layout":"Clear packet showing golden-brown puff-layered biscuit pieces.","tags":["baked","snacks","traditional","brown_biscuit","clear_packet","gi_tagged","nilgiris"]},
    "perishability": "crisp-bakery-snack-humidity-sensitive",
    "delivery": "humidity-sensitive-snack-hyperlocal",
    "relationships": {"used_for":["tea_dunking","milk_soaking","travel_munching"],"commonly_bought_with":["nilgiris_dust_tea_250g","aavin_nice_toned_milk_500ml","loose_sugar_refined"],"sold_in":["tea_kadai","local_bakery","supermarket","quick_commerce_dark_store"],"peak_purchase_window":"04:30_PM_to_07:30_PM"},
    "variants": [
      {"name":"500 g clear OPP pillow pouch","type":"WEIGHT","qty":500,"unit":"gram","metric":500,"metric_unit":"g","packaging":"opp-pillow-pouch","shelf_life":480,"storage":"ambient","cold":false,"fragile":true,"weight":510,"sku":"KG-TN-SNACK-OOTY-VARKEY-500G","mrp":185.00,"dimensions":{"width_mm":160,"length_mm":220,"depth_mm":50},"case_pack":{"type":"corrugated_box","contains_qty":20,"gross_weight_kg":11.2}}
    ]
  }
]
$json$::jsonb;
begin
  for p in select value from jsonb_array_elements(products)
  loop
    select id into dept_uuid from public.departments where slug = p->>'department';

    insert into public.categories (name, slug, description, sort_order, is_active, department_id, canonical_name, aliases, search_terms, regional_priority, perishability_class, image_requirements, packaging_defaults, fulfillment_constraints, discovery_tags, taxonomy_level, ontology_metadata, status, is_mvp_enabled, quality_score, governance_metadata)
    values (
      p->>'category_name',
      p->>'category',
      'South Indian hyperlocal commerce category seeded from curated research ingestion.',
      100,
      true,
      dept_uuid,
      p->>'category_name',
      array[p->>'category_name'],
      array[p->>'category'],
      '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}'::jsonb,
      case when (p->>'perishability') in ('coop-packet-milk-48h-cold-chain','fermented-batter-168h-chilled') then 'SHORT_SHELF'::public.perishability_class else 'DRY_STABLE'::public.perishability_class end,
      '{"required":["HERO","PACKAGING","SHELF","MOBILE_THUMBNAIL"],"background":"white","webpRequired":true,"watermarkAllowed":false}'::jsonb,
      jsonb_build_array((p->'variants'->0)->>'packaging'),
      jsonb_build_object('source','south_indian_core_fmcg_research'),
      array['hyperlocal','south-india'],
      'CATEGORY',
      jsonb_build_object('source_dataset','south_indian_core_fmcg_daily_essentials'),
      'active',
      true,
      92,
      '{"duplicate_detection_keys":["slug","brand","category","regional_aliases"],"moderation_state":"approved_curated"}'::jsonb
    )
    on conflict (slug) do update
    set department_id = excluded.department_id,
        canonical_name = excluded.canonical_name,
        aliases = excluded.aliases,
        search_terms = excluded.search_terms,
        image_requirements = excluded.image_requirements,
        packaging_defaults = excluded.packaging_defaults,
        ontology_metadata = public.categories.ontology_metadata || excluded.ontology_metadata,
        status = 'active',
        quality_score = greatest(public.categories.quality_score, excluded.quality_score)
    returning id into cat_uuid;

    insert into public.subcategories (department_id, category_id, slug, canonical_name, aliases, search_terms, regional_priority, perishability_class, image_requirements, packaging_defaults, fulfillment_constraints, discovery_tags, sort_order, is_active, status, is_mvp_enabled, quality_score, governance_metadata)
    values (
      dept_uuid, cat_uuid, p->>'subcategory', p->>'subcategory_name', array[p->>'subcategory_name'], array[p->>'subcategory'],
      '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}'::jsonb,
      case when (p->>'perishability') in ('coop-packet-milk-48h-cold-chain','fermented-batter-168h-chilled') then 'SHORT_SHELF'::public.perishability_class else 'DRY_STABLE'::public.perishability_class end,
      '{"required":["HERO","PACKAGING","SHELF","MOBILE_THUMBNAIL"],"background":"white","webpRequired":true,"watermarkAllowed":false}'::jsonb,
      jsonb_build_array((p->'variants'->0)->>'packaging'),
      jsonb_build_object('source','south_indian_core_fmcg_research'),
      array['hyperlocal','south-india'],
      100,
      true,
      'active',
      true,
      92,
      '{"duplicate_detection_keys":["slug","category"],"moderation_state":"approved_curated"}'::jsonb
    )
    on conflict (slug) do update
    set category_id = excluded.category_id,
        canonical_name = excluded.canonical_name,
        packaging_defaults = excluded.packaging_defaults,
        status = 'active',
        quality_score = greatest(public.subcategories.quality_score, excluded.quality_score)
    returning id into subcat_uuid;

    insert into public.product_families (department_id, category_id, subcategory_id, slug, canonical_name, product_group, aliases, search_terms, regional_priority, perishability_class, image_requirements, packaging_defaults, fulfillment_constraints, discovery_tags, is_active, status, is_mvp_enabled, quality_score, governance_metadata)
    values (
      dept_uuid, cat_uuid, subcat_uuid, p->>'family', p->>'family_name', p->>'subcategory_name',
      array[p->>'family_name'], array[p->>'family'],
      '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}'::jsonb,
      case when (p->>'perishability') in ('coop-packet-milk-48h-cold-chain','fermented-batter-168h-chilled') then 'SHORT_SHELF'::public.perishability_class else 'DRY_STABLE'::public.perishability_class end,
      '{"required":["HERO","TRANSPARENT_PNG","PACKAGING","SHELF","MOBILE_THUMBNAIL"],"background":"white","webpRequired":true,"watermarkAllowed":false}'::jsonb,
      jsonb_build_array((p->'variants'->0)->>'packaging'),
      jsonb_build_object('source','south_indian_core_fmcg_research'),
      array['hyperlocal','south-india'],
      true,
      'active',
      true,
      94,
      '{"duplicate_detection_keys":["slug","subcategory","packaging"],"moderation_state":"approved_curated"}'::jsonb
    )
    on conflict (slug) do update
    set subcategory_id = excluded.subcategory_id,
        canonical_name = excluded.canonical_name,
        packaging_defaults = excluded.packaging_defaults,
        status = 'active',
        quality_score = greatest(public.product_families.quality_score, excluded.quality_score)
    returning id into family_uuid;

    select id into brand_uuid from public.brands where slug = p->>'brand';
    select id into perishability_uuid from public.perishability_profiles where slug = p->>'perishability';
    select id into delivery_uuid from public.delivery_constraints where slug = p->>'delivery';

    insert into public.master_products (
      canonical_name, normalized_name, slug, description, short_description,
      department_id, category_id, subcategory_id, product_family_id, product_group, product_type,
      brand_id, manufacturer, origin_region, internal_sku, seller_visibility, active_status,
      english_name, tamil_name, tamil_transliteration, telugu_name, kannada_name, malayalam_name, hindi_name,
      romanized_variants, discovery_tags, regional_priority, metadata,
      status, is_mvp_enabled, quality_score, moderation_required, governance_metadata
    )
    values (
      p->>'name',
      lower(regexp_replace(p->>'name', '[^a-zA-Z0-9]+', ' ', 'g')),
      p->>'slug',
      p->>'description',
      p->>'short',
      dept_uuid, cat_uuid, subcat_uuid, family_uuid, p->>'subcategory_name', p->>'product_type',
      brand_uuid, p->>'manufacturer', (p->>'region')::public.commerce_region, p->>'sku',
      'PUBLIC', 'ACTIVE',
      p->>'english', p->>'ta', p->>'ta_roman', p->>'te', p->>'kn', p->>'ml', p->>'hi',
      array(select jsonb_array_elements_text(p->'romanized')),
      array(select jsonb_array_elements_text(p->'discovery')),
      '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}'::jsonb,
      jsonb_build_object(
        'source_dataset','south_indian_core_fmcg_daily_essentials',
        'canonical_search_identity', p->>'slug',
        'visual_descriptors', p->'visual',
        'knowledge_graph_relationships', p->'relationships',
        'image_ingestion_requirements', jsonb_build_object(
          'required_kinds', jsonb_build_array('HERO','TRANSPARENT_PNG','PACKAGING','SHELF','MOBILE_THUMBNAIL'),
          'preferred_aspect_ratios', jsonb_build_array('1:1','4:5'),
          'no_watermark', true,
          'minimum_packaging_visibility', 0.8,
          'minimum_ocr_readability', 0.75,
          'reject_marketplace_screenshots', true,
          'reject_ai_generated_packaging', true,
          'image_search_terms', p->'tokens'
        ),
        'operational_relationships', p->'relationships'
      ),
      'active',
      true,
      96,
      false,
      jsonb_build_object(
        'duplicate_detection_keys', jsonb_build_array(p->>'slug', p->>'brand', p->>'sku'),
        'moderation_state', 'approved_curated',
        'quality_indicators', jsonb_build_object('taxonomy_integrity','complete','variant_integrity','complete','multilingual_coverage','complete','image_pipeline_ready',true),
        'source_policy', 'research_supported_only',
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
        romanized_variants = excluded.romanized_variants,
        discovery_tags = excluded.discovery_tags,
        metadata = public.master_products.metadata || excluded.metadata,
        status = 'active',
        is_mvp_enabled = true,
        quality_score = greatest(public.master_products.quality_score, excluded.quality_score),
        governance_metadata = public.master_products.governance_metadata || excluded.governance_metadata
    returning id into product_uuid;

    insert into public.product_logistics_profiles (product_id, variant_id, perishability_profile_id, delivery_constraint_id, region_codes, notes, metadata)
    select
      product_uuid,
      null,
      perishability_uuid,
      delivery_uuid,
      array['TN','KL','KA','AP','TS']::public.commerce_region[],
      'Canonical product-level logistics profile from South Indian FMCG research ingestion.',
      jsonb_build_object('perishability_model', p->>'perishability', 'delivery_model', p->>'delivery')
    where not exists (
      select 1
      from public.product_logistics_profiles existing
      where existing.product_id = product_uuid
        and existing.variant_id is null
        and existing.perishability_profile_id = perishability_uuid
        and existing.delivery_constraint_id = delivery_uuid
        and existing.deleted_at is null
    );

    for v in select value from jsonb_array_elements(p->'variants')
    loop
      select id into unit_uuid from public.units where slug = v->>'unit';
      select id into packaging_uuid from public.packaging_types where slug = v->>'packaging';

      insert into public.catalog_product_variants (
        product_id, variant_type, variant_name, quantity, unit_id, normalized_metric_value, normalized_metric_unit,
        packaging_type_id, shelf_life_hours, storage_requirement, fragile_flag, cold_chain_required,
        estimated_weight_grams, freshness_window_minutes, sku_template, metadata,
        status, is_mvp_enabled, quality_score, governance_metadata
      )
      values (
        product_uuid,
        (v->>'type')::public.variant_type,
        v->>'name',
        (v->>'qty')::numeric,
        unit_uuid,
        (v->>'metric')::numeric,
        v->>'metric_unit',
        packaging_uuid,
        (v->>'shelf_life')::integer,
        v->>'storage',
        coalesce((v->>'fragile')::boolean, false),
        (v->>'cold')::boolean,
        (v->>'weight')::numeric,
        case when (v->>'cold')::boolean then 120 else null end,
        v->>'sku',
        jsonb_build_object(
          'mrp_inr', (v->>'mrp')::numeric,
          'dimensions', coalesce(v->'dimensions','{}'::jsonb),
          'packaging_hierarchy', (v - 'name' - 'type' - 'qty' - 'unit' - 'metric' - 'metric_unit' - 'packaging' - 'shelf_life' - 'storage' - 'cold' - 'fragile' - 'weight' - 'sku' - 'mrp' - 'dimensions'),
          'inventory_placeholder', jsonb_build_object('stock_count', null, 'seller_id', null, 'reason', 'research_does_not_support_stock_counts')
        ),
        'active',
        true,
        95,
        jsonb_build_object('duplicate_detection_keys', jsonb_build_array(p->>'slug', v->>'sku', v->>'name'), 'moderation_state', 'approved_curated')
      )
      on conflict (sku_template) do update
      set variant_name = excluded.variant_name,
          quantity = excluded.quantity,
          unit_id = excluded.unit_id,
          normalized_metric_value = excluded.normalized_metric_value,
          normalized_metric_unit = excluded.normalized_metric_unit,
          packaging_type_id = excluded.packaging_type_id,
          shelf_life_hours = excluded.shelf_life_hours,
          storage_requirement = excluded.storage_requirement,
          fragile_flag = excluded.fragile_flag,
          cold_chain_required = excluded.cold_chain_required,
          estimated_weight_grams = excluded.estimated_weight_grams,
          metadata = public.catalog_product_variants.metadata || excluded.metadata,
          quality_score = greatest(public.catalog_product_variants.quality_score, excluded.quality_score),
          governance_metadata = public.catalog_product_variants.governance_metadata || excluded.governance_metadata
      returning id into variant_uuid;

      insert into public.product_logistics_profiles (product_id, variant_id, perishability_profile_id, delivery_constraint_id, region_codes, notes, metadata)
      values (
        product_uuid,
        variant_uuid,
        perishability_uuid,
        delivery_uuid,
        array['TN','KL','KA','AP','TS']::public.commerce_region[],
        'Variant-level logistics profile with storage, shelf-life, and handling constraints.',
        jsonb_build_object('variant_sku', v->>'sku', 'storage_requirement', v->>'storage', 'cold_chain_required', (v->>'cold')::boolean)
      )
      on conflict (product_id, variant_id, perishability_profile_id, delivery_constraint_id) do update
      set notes = excluded.notes,
          metadata = public.product_logistics_profiles.metadata || excluded.metadata;
    end loop;

    for alias_item in select value from jsonb_array_elements(p->'aliases')
    loop
      insert into public.product_aliases (product_id, alias, normalized_alias, alias_type, language, region_codes, confidence, source, metadata)
      values (
        product_uuid,
        alias_item->>0,
        lower(regexp_replace(alias_item->>0, '\s+', ' ', 'g')),
        (alias_item->>1)::public.product_alias_type,
        (alias_item->>2)::public.commerce_language,
        array['TN','KL','KA','AP','TS']::public.commerce_region[],
        case when alias_item->>1 = 'MISSPELLING' then 0.82 else 0.95 end,
        'south_indian_core_fmcg_research',
        jsonb_build_object('seed_slug', p->>'slug')
      )
      on conflict (product_id, normalized_alias, alias_type, language) do update
      set alias = excluded.alias,
          confidence = excluded.confidence,
          metadata = public.product_aliases.metadata || excluded.metadata;
    end loop;

    insert into public.multilingual_mappings (entity_table, entity_id, language, native_text, transliteration, romanized_variants, phonetic_tokens, ocr_variants, voice_variants, confidence, source, metadata)
    values
      ('master_products', product_uuid, 'ta', p->>'ta', p->>'ta_roman', array[p->>'ta_roman'], array[]::text[], array[]::text[], array(select alias.value->>0 from jsonb_array_elements(p->'aliases') alias(value) where alias.value->>2 = 'ta'), 1, 'south_indian_core_fmcg_research', jsonb_build_object('seed_slug', p->>'slug')),
      ('master_products', product_uuid, 'te', p->>'te', null, array[]::text[], array[]::text[], array[]::text[], array(select alias.value->>0 from jsonb_array_elements(p->'aliases') alias(value) where alias.value->>2 = 'te'), 1, 'south_indian_core_fmcg_research', jsonb_build_object('seed_slug', p->>'slug')),
      ('master_products', product_uuid, 'kn', p->>'kn', null, array[]::text[], array[]::text[], array[]::text[], array(select alias.value->>0 from jsonb_array_elements(p->'aliases') alias(value) where alias.value->>2 = 'kn'), 1, 'south_indian_core_fmcg_research', jsonb_build_object('seed_slug', p->>'slug')),
      ('master_products', product_uuid, 'ml', p->>'ml', null, array[]::text[], array[]::text[], array[]::text[], array(select alias.value->>0 from jsonb_array_elements(p->'aliases') alias(value) where alias.value->>2 = 'ml'), 1, 'south_indian_core_fmcg_research', jsonb_build_object('seed_slug', p->>'slug')),
      ('master_products', product_uuid, 'hi', p->>'hi', null, array[]::text[], array[]::text[], array[]::text[], array(select alias.value->>0 from jsonb_array_elements(p->'aliases') alias(value) where alias.value->>2 = 'hi'), 1, 'south_indian_core_fmcg_research', jsonb_build_object('seed_slug', p->>'slug'))
    on conflict (entity_table, entity_id, language, native_text) do update
    set transliteration = excluded.transliteration,
        romanized_variants = excluded.romanized_variants,
        voice_variants = excluded.voice_variants,
        metadata = public.multilingual_mappings.metadata || excluded.metadata;

    foreach image_kind in array array['HERO','TRANSPARENT_PNG','PACKAGING','SHELF','MOBILE_THUMBNAIL']
    loop
      insert into public.catalog_product_images (
        product_id, image_kind, storage_path, alt_text, width, height, aspect_ratio, mime_type,
        white_background, mobile_optimized, no_watermark, lighting_quality, compression_artifact_score,
        packaging_visibility, ocr_readability, dominant_colors, metadata
      )
      values (
        product_uuid,
        image_kind::public.product_image_kind,
        'catalog-ingestion/pending/south-indian-core-fmcg/' || (p->>'slug') || '/' || lower(image_kind) || '.webp',
        (p->>'name') || ' ' || lower(replace(image_kind, '_', ' ')) || ' ingestion slot',
        case when image_kind = 'SHELF' then 1600 else 1200 end,
        case when image_kind = 'SHELF' then 900 else 1200 end,
        case when image_kind = 'SHELF' then '16:9' else '1:1' end,
        'image/webp',
        image_kind <> 'SHELF',
        true,
        true,
        'pending_curated_capture',
        0,
        case when image_kind in ('PACKAGING','HERO','MOBILE_THUMBNAIL') then 0.85 else 0.65 end,
        case when image_kind in ('PACKAGING','HERO') then 0.8 else 0.55 end,
        array[p->'visual'->>'primary', p->'visual'->>'accent'],
        jsonb_build_object(
          'image_status','placeholder_for_ingestion',
          'validation_rules', jsonb_build_object('no_watermark', true, 'reject_marketplace_screenshot', true, 'reject_fake_ai_packaging', true, 'ocr_required_for', jsonb_build_array('HERO','PACKAGING')),
          'image_search_terms', p->'tokens',
          'packaging_focus', p->'visual'->>'layout',
          'duplicate_detection_hints', jsonb_build_array(p->>'brand', p->>'slug', p->'visual'->>'primary')
        )
      )
      on conflict do nothing;
    end loop;

    foreach token in array array(select jsonb_array_elements_text(p->'tokens'))
    loop
      insert into public.search_tokens (product_id, token, normalized_token, token_type, language, region_codes, recipe_associations, co_purchase_tags, weight, metadata)
      values (product_uuid, token, lower(token), 'SEMANTIC', 'roman', array['TN','KL','KA','AP','TS']::public.commerce_region[], array(select jsonb_array_elements_text(p->'recipe_tokens')), array(select jsonb_array_elements_text(p->'context_tokens')), 1, jsonb_build_object('seed_slug', p->>'slug'))
      on conflict do nothing;
    end loop;

    foreach token in array array(select jsonb_array_elements_text(p->'romanized'))
    loop
      insert into public.search_tokens (product_id, token, normalized_token, token_type, language, region_codes, weight, metadata)
      values (product_uuid, token, lower(token), 'TRANSLITERATION', 'roman', array['TN','KL','KA','AP','TS']::public.commerce_region[], 1.1, jsonb_build_object('seed_slug', p->>'slug'))
      on conflict do nothing;
    end loop;

    foreach token in array array(select jsonb_array_elements_text(p->'recipe_tokens'))
    loop
      insert into public.search_tokens (product_id, token, normalized_token, token_type, language, region_codes, recipe_associations, weight, metadata)
      values (product_uuid, token, lower(token), 'RECIPE', 'roman', array['TN','KL','KA','AP','TS']::public.commerce_region[], array[token], 1.05, jsonb_build_object('seed_slug', p->>'slug'))
      on conflict do nothing;
    end loop;

    foreach token in array array(select jsonb_array_elements_text(p->'context_tokens'))
    loop
      insert into public.search_tokens (product_id, token, normalized_token, token_type, language, region_codes, co_purchase_tags, weight, metadata)
      values (product_uuid, token, lower(token), 'INTENT', 'roman', array['TN','KL','KA','AP','TS']::public.commerce_region[], array[token], 1.05, jsonb_build_object('seed_slug', p->>'slug'))
      on conflict do nothing;
    end loop;

    insert into public.search_validation_reports (
      product_id, alias_count, transliteration_count, phonetic_token_count, autocomplete_token_count,
      multilingual_coverage, recipe_association_count, co_purchase_tag_count, readiness_score, missing_requirements, metadata
    )
    values (
      product_uuid,
      jsonb_array_length(p->'aliases'),
      jsonb_array_length(p->'romanized'),
      (select count(*) from jsonb_array_elements(p->'aliases') a where a.value->>1 = 'PHONETIC'),
      jsonb_array_length(p->'tokens'),
      '{"ta":true,"te":true,"kn":true,"ml":true,"hi":true,"roman":true}'::jsonb,
      jsonb_array_length(p->'recipe_tokens'),
      jsonb_array_length(p->'context_tokens'),
      96,
      array[]::text[],
      jsonb_build_object('seed_slug', p->>'slug', 'report_source', 'south_indian_core_fmcg_seed')
    )
    on conflict do nothing;

    insert into public.taxonomy_integrity_reports (
      product_id, category_id, depth_valid, parent_relationship_valid, orphan_product,
      regional_tags_valid, festival_tags_valid, consistency_score, findings, metadata
    )
    values (
      product_uuid, cat_uuid, true, true, false, true, true, 98, array[]::text[],
      jsonb_build_object('department_slug', p->>'department', 'category_slug', p->>'category', 'subcategory_slug', p->>'subcategory')
    )
    on conflict do nothing;
  end loop;
end $$;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('south_indian_core_fmcg_kg_seed', 'Enables curated South Indian core FMCG canonical catalog, multilingual aliases, image ingestion slots, logistics metadata, and governance-ready discovery records.', true, 100, '{"roles":["BUYER","SELLER","ADMIN","SUPER_ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();

create unique index if not exists catalog_product_images_seed_slot_idx
  on public.catalog_product_images(product_id, image_kind, storage_path)
  where deleted_at is null;

create unique index if not exists search_tokens_seed_identity_idx
  on public.search_tokens(
    coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid),
    normalized_token,
    token_type,
    language
  )
  where deleted_at is null;

create unique index if not exists search_validation_reports_seed_product_idx
  on public.search_validation_reports(product_id, ((metadata->>'report_source')))
  where deleted_at is null and metadata ? 'report_source';

create unique index if not exists taxonomy_integrity_reports_seed_product_idx
  on public.taxonomy_integrity_reports(product_id, category_id, ((metadata->>'department_slug')), ((metadata->>'category_slug')))
  where deleted_at is null;

create table if not exists public.hyperlocal_basket_archetypes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  slug text not null unique,
  canonical_name text not null,
  basket_intent text not null,
  primary_regions public.commerce_region[] not null default array[]::public.commerce_region[],
  time_window text,
  anchor_tokens text[] not null default '{}',
  product_slugs text[] not null default '{}',
  seller_archetypes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.seller_archetypes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  slug text not null unique,
  canonical_name text not null,
  operating_model text not null,
  typical_packaging text[] not null default '{}',
  temperature_capability text not null default 'ambient',
  display_modes text[] not null default '{}',
  product_slugs text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.display_intelligence_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  slug text not null unique,
  canonical_name text not null,
  display_mode text not null,
  packaging_slugs text[] not null default '{}',
  applicable_product_slugs text[] not null default '{}',
  placement_rules jsonb not null default '{}'::jsonb,
  cv_requirements jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.regional_operational_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  slug text not null unique,
  canonical_name text not null,
  city text not null,
  region_code public.commerce_region not null,
  route_model text not null,
  priority_windows text[] not null default '{}',
  cold_chain_notes text,
  humidity_notes text,
  seller_archetypes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb
);

do $$
declare
  p jsonb;
  v jsonb;
  token text;
  alias_item jsonb;
  image_kind text;
  product_uuid uuid;
  variant_uuid uuid;
  dept_uuid uuid;
  cat_uuid uuid;
  subcat_uuid uuid;
  family_uuid uuid;
  brand_uuid uuid;
  unit_uuid uuid;
  packaging_uuid uuid;
  perishability_uuid uuid;
  delivery_uuid uuid;
  image_requirements jsonb := jsonb_build_object(
    'top_view_required', true,
    'side_view_required', true,
    'scale_reference_required', true,
    'lighting_standard', 'diffused_daylight_or_5500k_softbox',
    'background_standard', 'matte_white_or_clean_retail_shelf',
    'bruise_detection_enabled', true,
    'discoloration_detection_enabled', true,
    'OCR_visibility_required', true,
    'real_image_only', true,
    'placeholder_status', 'pending_curated_capture'
  );
  products jsonb := $json$
[
  {"slug":"nandini-goodlife-toned-milk","sku":"KG-KA-DAIRY-NANDINI-GOODLIFE","name":"Nandini Goodlife Toned Milk","short":"Karnataka cooperative toned milk for tea and breakfast.","department":"dairy-breakfast","category":"packet-milk","category_name":"Packet Milk","subcategory":"toned-milk","subcategory_name":"Toned Milk","family":"cooperative-packet-milk","family_name":"Cooperative Packet Milk","product_type":"BRANDED","brand":"nandini","manufacturer":"Karnataka Milk Federation","region":"KA","perishability":"coop-packet-milk-48h-cold-chain","delivery":"milk-batter-morning-cold-chain","pack":"pillow-pouch","qty":500,"unit":"milliliter","metric":500,"metric_unit":"ml","variant":"500 ml milk pouch","variant_type":"VOLUME","weight":512,"mrp":24,"aliases":[["nandini haalu","VOICE","kn"],["nandini milk","REGIONAL","roman"],["nandni milk","MISSPELLING","roman"],["nandini toned paal","VOICE","ta"],["nandini doodh","VOICE","hi"]],"tokens":["nandini milk","nandini haalu","packet milk","toned milk","bengaluru milk","breakfast milk","tea milk"],"romanized":["nandini haalu","nandini toned milk"],"tags":["breakfast","dairy"],"visual":{"primary":"#0B5CAD","accent":"#FFFFFF","layout":"Blue and white cooperative milk pouch","tags":["milk","blue_pouch","cold_chain"]}},
  {"slug":"milma-toned-milk","sku":"KG-KL-DAIRY-MILMA-TONED","name":"Milma Toned Milk","short":"Kerala cooperative toned milk for daily tea and coffee.","department":"dairy-breakfast","category":"packet-milk","category_name":"Packet Milk","subcategory":"toned-milk","subcategory_name":"Toned Milk","family":"cooperative-packet-milk","family_name":"Cooperative Packet Milk","product_type":"BRANDED","brand":"milma","manufacturer":"Kerala Cooperative Milk Marketing Federation","region":"KL","perishability":"coop-packet-milk-48h-cold-chain","delivery":"milk-batter-morning-cold-chain","pack":"pillow-pouch","qty":500,"unit":"milliliter","metric":500,"metric_unit":"ml","variant":"500 ml milk pouch","variant_type":"VOLUME","weight":512,"mrp":25,"aliases":[["milma paal","VOICE","ml"],["milma milk","REGIONAL","roman"],["milma toned paal","VOICE","ta"],["milma doodh","VOICE","hi"]],"tokens":["milma milk","milma paal","packet milk","kerala milk","tea milk","coffee milk"],"romanized":["milma paal","milma toned milk"],"tags":["breakfast","dairy"],"visual":{"primary":"#1E88E5","accent":"#FFFFFF","layout":"Kerala cooperative milk pouch","tags":["milk","cold_chain"]}},
  {"slug":"aavin-green-magic-standardized-milk","sku":"KG-TN-DAIRY-AAVIN-GREEN-MAGIC","name":"Aavin Green Magic Standardized Milk","short":"Green-pack Aavin standardized milk for coffee, tea, and sweets.","department":"dairy-breakfast","category":"packet-milk","category_name":"Packet Milk","subcategory":"standardized-milk","subcategory_name":"Standardized Milk","family":"cooperative-packet-milk","family_name":"Cooperative Packet Milk","product_type":"BRANDED","brand":"aavin","manufacturer":"Tamil Nadu Cooperative Milk Producers Federation Ltd.","region":"TN","perishability":"coop-packet-milk-48h-cold-chain","delivery":"milk-batter-morning-cold-chain","pack":"pillow-pouch","qty":500,"unit":"milliliter","metric":500,"metric_unit":"ml","variant":"500 ml green milk pouch","variant_type":"VOLUME","weight":512,"mrp":24,"aliases":[["aavin green packet","SLANG","roman"],["aavin green paal","VOICE","ta"],["avin green milk","MISSPELLING","roman"],["aavin pachai packet","SLANG","ta"]],"tokens":["aavin green milk","standardized milk","packet milk","coffee milk","tea milk","chennai milk"],"romanized":["aavin green paal","pachai packet"],"tags":["breakfast","dairy"],"visual":{"primary":"#1B8F3A","accent":"#FFFFFF","layout":"Green and white Aavin milk pouch","tags":["milk","green_pouch","cold_chain"]}},
  {"slug":"id-fresh-coconut-chutney","sku":"KG-KA-BATTER-IDF-COCONUT-CHUTNEY","name":"iD Fresh Coconut Chutney","short":"Chilled coconut chutney companion for idli and dosa.","department":"tiffin-batter-products","category":"ready-to-cook-batters","category_name":"Ready-to-Cook Batters","subcategory":"fresh-chutneys","subcategory_name":"Fresh Chutneys","family":"chilled-tiffin-accompaniments","family_name":"Chilled Tiffin Accompaniments","product_type":"BRANDED","brand":"id-fresh","manufacturer":"iD Fresh Food (India) Pvt. Ltd.","region":"KA","perishability":"fermented-batter-168h-chilled","delivery":"milk-batter-morning-cold-chain","pack":"iml-tub","qty":200,"unit":"gram","metric":200,"metric_unit":"g","variant":"200 g chilled tub","variant_type":"WEIGHT","weight":230,"mrp":60,"aliases":[["id chutney","SHORTHAND","roman"],["coconut chutney tub","REGIONAL","roman"],["thengai chutney","VOICE","ta"],["kobbari chutney","VOICE","te"],["coconut chatni","MISSPELLING","roman"]],"tokens":["id coconut chutney","coconut chutney","idli chutney","dosa side dish","breakfast chutney"],"romanized":["thengai chutney","kobbari chutney"],"tags":["breakfast","quick-cook"],"visual":{"primary":"#16803A","accent":"#FFFFFF","layout":"White and green chilled tub label","tags":["chutney","tub","chilled"]}},
  {"slug":"id-fresh-ragi-idli-dosa-batter","sku":"KG-KA-BATTER-IDF-RAGI","name":"iD Fresh Ragi Idli & Dosa Batter","short":"Chilled ragi idli and dosa batter for breakfast baskets.","department":"tiffin-batter-products","category":"ready-to-cook-batters","category_name":"Ready-to-Cook Batters","subcategory":"wet-batters","subcategory_name":"Wet Batters","family":"fermented-rice-lentil-batter","family_name":"Fermented Rice and Lentil Batter","product_type":"BRANDED","brand":"id-fresh","manufacturer":"iD Fresh Food (India) Pvt. Ltd.","region":"KA","perishability":"fermented-batter-168h-chilled","delivery":"milk-batter-morning-cold-chain","pack":"transformer-pouch","qty":1,"unit":"kilogram","metric":1000,"metric_unit":"g","variant":"1 kg transformer pouch","variant_type":"WEIGHT","weight":1030,"mrp":100,"aliases":[["id ragi batter","SHORTHAND","roman"],["ragi maavu","VOICE","ta"],["ragi hittu","VOICE","kn"],["raagi batter","MISSPELLING","roman"]],"tokens":["ragi batter","id ragi batter","idli batter","dosa batter","healthy breakfast"],"romanized":["ragi maavu","ragi hittu"],"tags":["breakfast","quick-cook"],"visual":{"primary":"#6B3F2A","accent":"#FFFFFF","layout":"Brown and green batter pouch","tags":["batter","ragi","chilled"]}},
  {"slug":"clinic-plus-strong-long-shampoo-sachet","sku":"KG-IN-PCARE-CLINICPLUS-SACHET","name":"Clinic Plus Strong & Long Shampoo Sachet","short":"Single-use blue Clinic Plus shampoo sachet for hanging-strip retail.","department":"personal-care","category":"hair-care","category_name":"Hair Care","subcategory":"shampoo","subcategory_name":"Shampoo","family":"hanging-sachet-shampoo","family_name":"Hanging Sachet Shampoo","product_type":"BRANDED","brand":"clinic-plus","manufacturer":"Hindustan Unilever Limited","region":"TN","perishability":"personal-care-sachet-stable","delivery":"dry-sachet-standard-hyperlocal","pack":"hanging-strip","qty":6,"unit":"milliliter","metric":6,"metric_unit":"ml","variant":"6 ml hanging sachet","variant_type":"SACHET","weight":7,"mrp":1,"aliases":[["clinic plus packet","SLANG","roman"],["clinic shampoo","SHORTHAND","roman"],["klinik plus","MISSPELLING","roman"],["neela shampoo","SLANG","ta"]],"tokens":["clinic plus shampoo","shampoo sachet","blue shampoo packet","one rupee shampoo","hostel hygiene"],"romanized":["clinic shampoo packet"],"tags":["hostel","monthly-essentials"],"visual":{"primary":"#0D6EFD","accent":"#FFFFFF","layout":"Blue hanging shampoo sachet","tags":["shampoo","sachet","hanging_strip"]}},
  {"slug":"head-shoulders-anti-dandruff-sachet","sku":"KG-IN-PCARE-HS-AD-SACHET","name":"Head & Shoulders Anti-Dandruff Shampoo Sachet","short":"Anti-dandruff shampoo sachet for petty-shop hanging display.","department":"personal-care","category":"hair-care","category_name":"Hair Care","subcategory":"shampoo","subcategory_name":"Shampoo","family":"hanging-sachet-shampoo","family_name":"Hanging Sachet Shampoo","product_type":"BRANDED","brand":"head-shoulders","manufacturer":"Procter & Gamble India","region":"TN","perishability":"personal-care-sachet-stable","delivery":"dry-sachet-standard-hyperlocal","pack":"hanging-strip","qty":5,"unit":"milliliter","metric":5,"metric_unit":"ml","variant":"5 ml hanging sachet","variant_type":"SACHET","weight":6,"mrp":3,"aliases":[["h and s sachet","SHORTHAND","roman"],["head shoulder packet","MISSPELLING","roman"],["dandruff shampoo sachet","REGIONAL","roman"],["thalai podugu shampoo","VOICE","ta"]],"tokens":["head shoulders sachet","anti dandruff shampoo","dandruff sachet","shampoo packet","travel shampoo"],"romanized":["thalai podugu shampoo"],"tags":["hostel","personal-care"],"visual":{"primary":"#FFFFFF","accent":"#005EB8","layout":"White and blue shampoo sachet","tags":["shampoo","anti_dandruff","sachet"]}},
  {"slug":"meera-herbal-hairwash-powder-sachet","sku":"KG-TN-PCARE-MEERA-HERBAL-SACHET","name":"Meera Herbal Hairwash Powder Sachet","short":"Herbal hairwash powder sachet for traditional hair care.","department":"personal-care","category":"hair-care","category_name":"Hair Care","subcategory":"hairwash-powder","subcategory_name":"Hairwash Powder","family":"herbal-hairwash-sachets","family_name":"Herbal Hairwash Sachets","product_type":"BRANDED","brand":"meera","manufacturer":"CavinKare Pvt. Ltd.","region":"TN","perishability":"personal-care-sachet-stable","delivery":"dry-sachet-standard-hyperlocal","pack":"hanging-strip","qty":4,"unit":"gram","metric":4,"metric_unit":"g","variant":"4 g powder sachet","variant_type":"SACHET","weight":5,"mrp":2,"aliases":[["meera shikakai","REGIONAL","roman"],["meera powder","SHORTHAND","roman"],["meera podi","VOICE","ta"],["mira hair wash","MISSPELLING","roman"]],"tokens":["meera hairwash","shikakai powder","hair wash powder","herbal shampoo sachet","traditional hair care"],"romanized":["meera podi","shikakai podi"],"tags":["personal-care","local"],"visual":{"primary":"#7A3E12","accent":"#F2C94C","layout":"Brown herbal powder sachet","tags":["hairwash","powder","sachet"]}},
  {"slug":"sabena-dishwash-powder","sku":"KG-IN-CLEAN-SABENA-POWDER","name":"Sabena Dishwash Powder","short":"Dishwash powder for tea-kadai and home utensil cleaning.","department":"cleaning-supplies","category":"dishwash","category_name":"Dishwash","subcategory":"dishwash-powders","subcategory_name":"Dishwash Powders","family":"dishwash-powder-cleaners","family_name":"Dishwash Powder Cleaners","product_type":"BRANDED","brand":"sabena","manufacturer":"Sabena household cleaning manufacturer","region":"TN","perishability":"dishwash-bar-dry-stable","delivery":"dry-sachet-standard-hyperlocal","pack":"pillow-pouch","qty":450,"unit":"gram","metric":450,"metric_unit":"g","variant":"450 g powder pouch","variant_type":"WEIGHT","weight":455,"mrp":55,"aliases":[["sabena powder","SHORTHAND","roman"],["sabina powder","MISSPELLING","roman"],["paathiram powder","VOICE","ta"],["dishwash powder","REGIONAL","roman"]],"tokens":["sabena dishwash powder","dishwash powder","vessel cleaning powder","tea kadai cleaning","utensil cleaner"],"romanized":["paathiram powder"],"tags":["monthly-essentials"],"visual":{"primary":"#F59E0B","accent":"#0F766E","layout":"Dishwash powder pouch","tags":["cleaning","powder","pouch"]}},
  {"slug":"aachi-chilli-powder","sku":"KG-TN-SPICE-AACHI-CHILLI","name":"Aachi Chilli Powder","short":"Red chilli powder pouch for South Indian cooking.","department":"grocery","category":"spices-masalas","category_name":"Spices and Masalas","subcategory":"ground-spices","subcategory_name":"Ground Spices","family":"regional-spice-powders","family_name":"Regional Spice Powders","product_type":"BRANDED","brand":"aachi","manufacturer":"Aachi Masala Foods Pvt. Ltd.","region":"TN","perishability":"dry-grocery-stable","delivery":"dry-sachet-standard-hyperlocal","pack":"pillow-pouch","qty":100,"unit":"gram","metric":100,"metric_unit":"g","variant":"100 g spice pouch","variant_type":"WEIGHT","weight":105,"mrp":38,"aliases":[["aachi chilli","SHORTHAND","roman"],["aachi milagai podi","VOICE","ta"],["achi chilli powder","MISSPELLING","roman"],["lal mirch powder","VOICE","hi"]],"tokens":["aachi chilli powder","milagai podi","red chilli powder","spice pouch","monthly grocery"],"romanized":["milagai podi","lal mirch"],"tags":["monthly-essentials","spicy"],"visual":{"primary":"#DC2626","accent":"#FDE68A","layout":"Red spice powder pouch","tags":["spice","red_pouch","ocr"]}},
  {"slug":"sakthi-turmeric-powder","sku":"KG-TN-SPICE-SAKTHI-TURMERIC","name":"Sakthi Turmeric Powder","short":"Turmeric powder pouch for cooking and pooja-adjacent household use.","department":"grocery","category":"spices-masalas","category_name":"Spices and Masalas","subcategory":"ground-spices","subcategory_name":"Ground Spices","family":"regional-spice-powders","family_name":"Regional Spice Powders","product_type":"BRANDED","brand":"sakthi","manufacturer":"Sakthi Masala Pvt. Ltd.","region":"TN","perishability":"dry-grocery-stable","delivery":"dry-sachet-standard-hyperlocal","pack":"pillow-pouch","qty":100,"unit":"gram","metric":100,"metric_unit":"g","variant":"100 g spice pouch","variant_type":"WEIGHT","weight":105,"mrp":32,"aliases":[["sakthi manjal podi","VOICE","ta"],["sakthi turmeric","SHORTHAND","roman"],["shakti turmeric","MISSPELLING","roman"],["haldi powder","VOICE","hi"]],"tokens":["sakthi turmeric powder","manjal podi","haldi powder","spice pouch","monthly grocery"],"romanized":["manjal podi","haldi"],"tags":["monthly-essentials"],"visual":{"primary":"#FACC15","accent":"#B45309","layout":"Yellow spice powder pouch","tags":["spice","yellow_pouch","ocr"]}},
  {"slug":"eastern-sambar-powder","sku":"KG-KL-SPICE-EASTERN-SAMBAR","name":"Eastern Sambar Powder","short":"Kerala-origin sambar powder pouch for tiffin and lunch cooking.","department":"grocery","category":"spices-masalas","category_name":"Spices and Masalas","subcategory":"blend-masalas","subcategory_name":"Blend Masalas","family":"regional-spice-powders","family_name":"Regional Spice Powders","product_type":"BRANDED","brand":"eastern","manufacturer":"Eastern Condiments Pvt. Ltd.","region":"KL","perishability":"dry-grocery-stable","delivery":"dry-sachet-standard-hyperlocal","pack":"pillow-pouch","qty":100,"unit":"gram","metric":100,"metric_unit":"g","variant":"100 g masala pouch","variant_type":"WEIGHT","weight":105,"mrp":45,"aliases":[["eastern sambar podi","VOICE","ml"],["sambar powder eastern","SHORTHAND","roman"],["eastrn sambar","MISSPELLING","roman"],["sambar masala","VOICE","hi"]],"tokens":["eastern sambar powder","sambar podi","sambar masala","tiffin cooking","lunch sambar"],"romanized":["sambar podi","sambar masala"],"tags":["quick-cook","lunch"],"visual":{"primary":"#B91C1C","accent":"#FFFFFF","layout":"Red masala pouch","tags":["spice","sambar","pouch"]}},
  {"slug":"gold-winner-sunflower-oil-pouch","sku":"KG-IN-OIL-GOLDWINNER-SUNFLOWER","name":"Gold Winner Refined Sunflower Oil Pouch","short":"Refined sunflower oil pouch for daily cooking.","department":"grocery","category":"oils-ghee","category_name":"Oils and Ghee","subcategory":"edible-oils","subcategory_name":"Edible Oils","family":"daily-cooking-oils","family_name":"Daily Cooking Oils","product_type":"BRANDED","brand":"gold-winner","manufacturer":"Kaleesuwari Refinery Pvt. Ltd.","region":"TN","perishability":"dry-grocery-stable","delivery":"dry-sachet-standard-hyperlocal","pack":"pillow-pouch","qty":1,"unit":"liter","metric":1000,"metric_unit":"ml","variant":"1 L oil pouch","variant_type":"VOLUME","weight":930,"mrp":160,"aliases":[["gold winner oil","SHORTHAND","roman"],["goldwinner sunflower","MISSPELLING","roman"],["sunflower ennai","VOICE","ta"],["cooking oil pouch","REGIONAL","roman"]],"tokens":["gold winner oil","sunflower oil","cooking oil","oil pouch","monthly grocery"],"romanized":["sunflower ennai"],"tags":["monthly-essentials"],"visual":{"primary":"#FBBF24","accent":"#DC2626","layout":"Yellow sunflower oil pouch","tags":["oil","pouch","leak_risk"]}},
  {"slug":"idhayam-gingelly-oil-bottle","sku":"KG-TN-OIL-IDHAYAM-GINGELLY","name":"Idhayam Gingelly Oil Bottle","short":"Gingelly oil bottle for dosa, pickles, and South Indian cooking.","department":"grocery","category":"oils-ghee","category_name":"Oils and Ghee","subcategory":"edible-oils","subcategory_name":"Edible Oils","family":"daily-cooking-oils","family_name":"Daily Cooking Oils","product_type":"BRANDED","brand":"idhayam","manufacturer":"V.V.V. & Sons Edible Oils Ltd.","region":"TN","perishability":"dry-grocery-stable","delivery":"dry-sachet-standard-hyperlocal","pack":"pet-bottle","qty":500,"unit":"milliliter","metric":500,"metric_unit":"ml","variant":"500 ml PET bottle","variant_type":"BOTTLE","weight":480,"mrp":185,"aliases":[["idhayam nallennai","VOICE","ta"],["gingelly oil","REGIONAL","roman"],["sesame oil bottle","REGIONAL","roman"],["idayam oil","MISSPELLING","roman"]],"tokens":["idhayam gingelly oil","nallennai","sesame oil","dosa oil","pickle oil"],"romanized":["nallennai","gingelly oil"],"tags":["monthly-essentials"],"visual":{"primary":"#F97316","accent":"#FFFFFF","layout":"Orange gingelly oil bottle label","tags":["oil","pet_bottle","ocr"]}},
  {"slug":"grb-cow-ghee-jar","sku":"KG-IN-GHEE-GRB-COW","name":"GRB Cow Ghee Jar","short":"Cow ghee jar for sweets, dosa, rice, and festive baskets.","department":"grocery","category":"oils-ghee","category_name":"Oils and Ghee","subcategory":"ghee","subcategory_name":"Ghee","family":"branded-ghee","family_name":"Branded Ghee","product_type":"BRANDED","brand":"grb","manufacturer":"GRB Dairy Foods Pvt. Ltd.","region":"TN","perishability":"dry-grocery-stable","delivery":"fragile-glass-condiment-hyperlocal","pack":"glass-jar","qty":500,"unit":"milliliter","metric":500,"metric_unit":"ml","variant":"500 ml ghee jar","variant_type":"VOLUME","weight":720,"mrp":390,"aliases":[["grb ghee","SHORTHAND","roman"],["nei jar","VOICE","ta"],["tuppa","VOICE","kn"],["ghee bottle","REGIONAL","roman"]],"tokens":["grb ghee","cow ghee","nei","tuppa","festive cooking","dosa ghee"],"romanized":["nei","tuppa"],"tags":["festival","monthly-essentials"],"visual":{"primary":"#F59E0B","accent":"#7C2D12","layout":"Golden ghee jar label","tags":["ghee","jar","fragile"]}},
  {"slug":"milma-ghee-jar","sku":"KG-KL-GHEE-MILMA","name":"Milma Ghee Jar","short":"Kerala cooperative ghee jar for cooking and sweets.","department":"grocery","category":"oils-ghee","category_name":"Oils and Ghee","subcategory":"ghee","subcategory_name":"Ghee","family":"branded-ghee","family_name":"Branded Ghee","product_type":"BRANDED","brand":"milma","manufacturer":"Kerala Cooperative Milk Marketing Federation","region":"KL","perishability":"dry-grocery-stable","delivery":"fragile-glass-condiment-hyperlocal","pack":"glass-jar","qty":500,"unit":"milliliter","metric":500,"metric_unit":"ml","variant":"500 ml ghee jar","variant_type":"VOLUME","weight":720,"mrp":410,"aliases":[["milma ghee","REGIONAL","roman"],["neyy jar","VOICE","ml"],["milma nei","VOICE","ta"],["milma ghi","MISSPELLING","roman"]],"tokens":["milma ghee","neyy","ghee jar","kerala ghee","festive cooking"],"romanized":["neyy","nei"],"tags":["festival","monthly-essentials"],"visual":{"primary":"#1E88E5","accent":"#FBBF24","layout":"Milma ghee jar label","tags":["ghee","jar","fragile"]}},
  {"slug":"rkg-ghee-tin","sku":"KG-TN-GHEE-RKG-TIN","name":"RKG Ghee Tin","short":"Traditional ghee tin for households and sweet preparation.","department":"grocery","category":"oils-ghee","category_name":"Oils and Ghee","subcategory":"ghee","subcategory_name":"Ghee","family":"branded-ghee","family_name":"Branded Ghee","product_type":"BRANDED","brand":"rkg","manufacturer":"RKG Ghee manufacturer","region":"TN","perishability":"dry-grocery-stable","delivery":"dry-sachet-standard-hyperlocal","pack":"metal-tin","qty":500,"unit":"milliliter","metric":500,"metric_unit":"ml","variant":"500 ml metal tin","variant_type":"VOLUME","weight":650,"mrp":380,"aliases":[["rkg nei","VOICE","ta"],["rkg ghee","REGIONAL","roman"],["rkg tin","SHORTHAND","roman"],["r k g ghee","MISSPELLING","roman"]],"tokens":["rkg ghee","ghee tin","nei tin","sweet making","festive basket"],"romanized":["rkg nei","ghee tin"],"tags":["festival","monthly-essentials"],"visual":{"primary":"#C2410C","accent":"#FDE68A","layout":"Metal ghee tin with printed label","tags":["ghee","metal_tin"]}},
  {"slug":"then-mittai-pillow-pouch","sku":"KG-TN-SNACK-THEN-MITTAI","name":"Then Mittai Candy Pouch","short":"Traditional honey-style sugar candy for petty-shop jars and snack baskets.","department":"local-foods","category":"traditional-snacks","category_name":"Traditional Snacks","subcategory":"traditional-sweets","subcategory_name":"Traditional Sweets","family":"regional-sweet-snacks","family_name":"Regional Sweet Snacks","product_type":"LOCAL","brand":"local-unbranded","manufacturer":"Regional small-batch confectioners","region":"TN","perishability":"crisp-bakery-snack-humidity-sensitive","delivery":"humidity-sensitive-snack-hyperlocal","pack":"pillow-pouch","qty":100,"unit":"gram","metric":100,"metric_unit":"g","variant":"100 g pillow pouch","variant_type":"WEIGHT","weight":105,"mrp":40,"aliases":[["then mittai","REGIONAL","roman"],["honey candy","SLANG","roman"],["thaen mittai","MISSPELLING","roman"],["then mittai mittai kadai","VOICE","ta"]],"tokens":["then mittai","traditional candy","petti kadai sweet","local sweet","festive snack"],"romanized":["then mittai","thaen mittai"],"tags":["local","festival"],"visual":{"primary":"#EF4444","accent":"#FDE68A","layout":"Clear or red candy pouch","tags":["candy","pouch","local"]}},
  {"slug":"kadalai-mittai-bar","sku":"KG-TN-SNACK-KADALAI-MITTAI","name":"Kadalai Mittai Peanut Candy Bar","short":"Peanut jaggery candy bar for tea kadai and school snack baskets.","department":"local-foods","category":"traditional-snacks","category_name":"Traditional Snacks","subcategory":"traditional-sweets","subcategory_name":"Traditional Sweets","family":"regional-sweet-snacks","family_name":"Regional Sweet Snacks","product_type":"LOCAL","brand":"local-unbranded","manufacturer":"Regional small-batch confectioners","region":"TN","perishability":"dry-grocery-stable","delivery":"dry-sachet-standard-hyperlocal","pack":"pillow-pouch","qty":50,"unit":"gram","metric":50,"metric_unit":"g","variant":"50 g wrapped bar","variant_type":"WEIGHT","weight":52,"mrp":10,"aliases":[["kadalai mittai","REGIONAL","roman"],["peanut chikki","VOICE","hi"],["groundnut candy","REGIONAL","roman"],["kadala mittai","MISSPELLING","roman"]],"tokens":["kadalai mittai","peanut candy","groundnut chikki","tea snack","school snack"],"romanized":["kadalai mittai","chikki"],"tags":["local","tea-time"],"visual":{"primary":"#92400E","accent":"#FBBF24","layout":"Peanut candy clear wrap","tags":["peanut","sweet","bar"]}},
  {"slug":"ellu-urundai-pack","sku":"KG-TN-SNACK-ELLU-URUNDAI","name":"Ellu Urundai Sesame Sweet Pack","short":"Sesame jaggery balls for traditional snack and festive baskets.","department":"local-foods","category":"traditional-snacks","category_name":"Traditional Snacks","subcategory":"traditional-sweets","subcategory_name":"Traditional Sweets","family":"regional-sweet-snacks","family_name":"Regional Sweet Snacks","product_type":"LOCAL","brand":"local-unbranded","manufacturer":"Regional small-batch confectioners","region":"TN","perishability":"dry-grocery-stable","delivery":"dry-sachet-standard-hyperlocal","pack":"pillow-pouch","qty":100,"unit":"gram","metric":100,"metric_unit":"g","variant":"100 g sweet pouch","variant_type":"WEIGHT","weight":105,"mrp":50,"aliases":[["ellu urundai","REGIONAL","roman"],["til ladoo","VOICE","hi"],["sesame balls","REGIONAL","roman"],["ellu laddu","MISSPELLING","roman"]],"tokens":["ellu urundai","sesame sweet","til ladoo","festival sweet","traditional snack"],"romanized":["ellu urundai","til ladoo"],"tags":["festival","local"],"visual":{"primary":"#78350F","accent":"#FDE68A","layout":"Sesame sweet pouch","tags":["sweet","sesame","pouch"]}},
  {"slug":"south-indian-mixture-pack","sku":"KG-TN-SNACK-MIXTURE","name":"South Indian Mixture Pack","short":"Crunchy spiced mixture for tea-time and petty-shop snack sales.","department":"snacks-packaged-foods","category":"namkeen-mixture","category_name":"Namkeen and Mixture","subcategory":"south-indian-mixture","subcategory_name":"South Indian Mixture","family":"regional-namkeen","family_name":"Regional Namkeen","product_type":"LOCAL","brand":"local-unbranded","manufacturer":"Regional snack makers","region":"TN","perishability":"crisp-bakery-snack-humidity-sensitive","delivery":"humidity-sensitive-snack-hyperlocal","pack":"pillow-pouch","qty":200,"unit":"gram","metric":200,"metric_unit":"g","variant":"200 g pillow pouch","variant_type":"WEIGHT","weight":205,"mrp":65,"aliases":[["mixture packet","REGIONAL","roman"],["kara mixture","VOICE","ta"],["namkeen mixture","VOICE","hi"],["mixchar packet","MISSPELLING","roman"]],"tokens":["south indian mixture","kara mixture","namkeen mixture","tea snack","spicy snack"],"romanized":["kara mixture","namkeen"],"tags":["tea-time","spicy"],"visual":{"primary":"#F97316","accent":"#FFFFFF","layout":"Orange snack pouch with clear window","tags":["mixture","snack","pouch"]}},
  {"slug":"iyengar-bakery-veg-puff","sku":"KG-KA-BAKERY-IYENGAR-VEG-PUFF","name":"Iyengar Bakery Veg Puff","short":"Fresh bakery vegetable puff for evening tea baskets.","department":"bakery","category":"bakery-snacks","category_name":"Bakery Snacks","subcategory":"puffs","subcategory_name":"Puffs","family":"iyengar-bakery-specialties","family_name":"Iyengar Bakery Specialties","product_type":"LOCAL","brand":"iyengar-bakery","manufacturer":"Local Iyengar bakery kitchens","region":"KA","perishability":"fresh-bakery-same-day","delivery":"bakery-crush-sensitive-hyperlocal","pack":"single-wall-cup","qty":1,"unit":"piece","metric":1,"metric_unit":"pc","variant":"single puff paper tray","variant_type":"PIECE","weight":90,"mrp":25,"aliases":[["veg puff","REGIONAL","roman"],["iyengar puff","REGIONAL","roman"],["bakery puff","VOICE","roman"],["vej puff","MISSPELLING","roman"]],"tokens":["iyengar bakery puff","veg puff","bakery snack","evening tea","bengaluru bakery"],"romanized":["veg puff","bakery puff"],"tags":["tea-time","bakery"],"visual":{"primary":"#D97706","accent":"#FDE68A","layout":"Golden puff in paper tray","tags":["bakery","puff","fresh"]}},
  {"slug":"iyengar-bakery-khara-bun","sku":"KG-KA-BAKERY-IYENGAR-KHARA-BUN","name":"Iyengar Bakery Khara Bun","short":"Spiced bakery bun for breakfast and tea-time baskets.","department":"bakery","category":"bakery-breads","category_name":"Bakery Breads","subcategory":"buns","subcategory_name":"Buns","family":"iyengar-bakery-specialties","family_name":"Iyengar Bakery Specialties","product_type":"LOCAL","brand":"iyengar-bakery","manufacturer":"Local Iyengar bakery kitchens","region":"KA","perishability":"fresh-bakery-same-day","delivery":"bakery-crush-sensitive-hyperlocal","pack":"pillow-pouch","qty":1,"unit":"piece","metric":1,"metric_unit":"pc","variant":"single bun pouch","variant_type":"PIECE","weight":80,"mrp":20,"aliases":[["khara bun","REGIONAL","roman"],["kara bun","MISSPELLING","roman"],["iyengar bun","REGIONAL","roman"],["spicy bun","VOICE","roman"]],"tokens":["khara bun","iyengar bakery bun","spicy bun","tea snack","bakery breakfast"],"romanized":["khara bun","kara bun"],"tags":["tea-time","bakery"],"visual":{"primary":"#B45309","accent":"#FFF7ED","layout":"Spiced bun in bakery pouch","tags":["bakery","bun","fresh"]}},
  {"slug":"bakery-rusk-pack","sku":"KG-IN-BAKERY-RUSK","name":"Bakery Rusk Pack","short":"Crisp rusk pack for tea and coffee dipping.","department":"bakery","category":"bakery-snacks","category_name":"Bakery Snacks","subcategory":"rusks","subcategory_name":"Rusks","family":"tea-bakery-staples","family_name":"Tea Bakery Staples","product_type":"LOCAL","brand":"local-unbranded","manufacturer":"Local bakery kitchens","region":"TN","perishability":"crisp-bakery-snack-humidity-sensitive","delivery":"humidity-sensitive-snack-hyperlocal","pack":"pillow-pouch","qty":200,"unit":"gram","metric":200,"metric_unit":"g","variant":"200 g rusk pouch","variant_type":"WEIGHT","weight":205,"mrp":55,"aliases":[["rusk packet","REGIONAL","roman"],["tea rusk","VOICE","roman"],["bakery rusk","REGIONAL","roman"],["rusku packet","MISSPELLING","roman"]],"tokens":["bakery rusk","tea rusk","rusk packet","chai dipping","evening tea"],"romanized":["rusk","rusku"],"tags":["tea-time","bakery"],"visual":{"primary":"#D6A15C","accent":"#FFFFFF","layout":"Clear bakery rusk pouch","tags":["bakery","rusk","pouch"]}},
  {"slug":"bakery-milk-bread-loaf","sku":"KG-IN-BAKERY-MILK-BREAD","name":"Bakery Milk Bread Loaf","short":"Soft milk bread loaf for breakfast and tea baskets.","department":"bakery","category":"bakery-breads","category_name":"Bakery Breads","subcategory":"bread-loaves","subcategory_name":"Bread Loaves","family":"tea-bakery-staples","family_name":"Tea Bakery Staples","product_type":"LOCAL","brand":"local-unbranded","manufacturer":"Local bakery kitchens","region":"TN","perishability":"fresh-bakery-same-day","delivery":"bakery-crush-sensitive-hyperlocal","pack":"pillow-pouch","qty":400,"unit":"gram","metric":400,"metric_unit":"g","variant":"400 g bread loaf","variant_type":"WEIGHT","weight":405,"mrp":45,"aliases":[["milk bread","REGIONAL","roman"],["bread packet","REGIONAL","roman"],["paal bread","VOICE","ta"],["bred packet","MISSPELLING","roman"]],"tokens":["milk bread","bread loaf","bakery bread","breakfast toast","tea bread"],"romanized":["paal bread","milk bread"],"tags":["breakfast","bakery"],"visual":{"primary":"#F8FAFC","accent":"#2563EB","layout":"Soft bread loaf in printed pouch","tags":["bread","bakery","fresh"]}},
  {"slug":"loose-ponni-raw-rice","sku":"KG-IN-STAPLE-PONNI-RAW-RICE","name":"Loose Ponni Raw Rice","short":"Canonical loose Ponni raw rice staple for seller calibrated weights.","department":"grocery","category":"loose-staples","category_name":"Loose Staples","subcategory":"rice","subcategory_name":"Rice","family":"loose-rice-staples","family_name":"Loose Rice Staples","product_type":"LOOSE","brand":"loose-staples","manufacturer":"Regional rice mills and wholesalers","region":"TN","perishability":"dry-grocery-stable","delivery":"dry-staple-sack-hyperlocal","pack":"burlap-sack","qty":1,"unit":"kilogram","metric":1000,"metric_unit":"g","variant":"1 kg loose calibrated unit","variant_type":"LOOSE","weight":1000,"mrp":0,"aliases":[["ponni rice","REGIONAL","roman"],["ponni arisi","VOICE","ta"],["raw rice loose","REGIONAL","roman"],["poni rice","MISSPELLING","roman"]],"tokens":["ponni raw rice","loose rice","arisi","monthly ration","rice staple"],"romanized":["ponni arisi","raw rice"],"tags":["monthly-essentials"],"visual":{"primary":"#F8FAFC","accent":"#A16207","layout":"Loose rice sack reference slot","tags":["loose","rice","sack"]}},
  {"slug":"loose-toor-dal","sku":"KG-IN-STAPLE-TOOR-DAL","name":"Loose Toor Dal","short":"Canonical loose toor dal staple for sambar and dal cooking.","department":"grocery","category":"loose-staples","category_name":"Loose Staples","subcategory":"dal-pulses","subcategory_name":"Dal and Pulses","family":"loose-dal-staples","family_name":"Loose Dal Staples","product_type":"LOOSE","brand":"loose-staples","manufacturer":"Regional dal mills and wholesalers","region":"TN","perishability":"dry-grocery-stable","delivery":"dry-staple-sack-hyperlocal","pack":"burlap-sack","qty":1,"unit":"kilogram","metric":1000,"metric_unit":"g","variant":"1 kg loose calibrated unit","variant_type":"LOOSE","weight":1000,"mrp":0,"aliases":[["toor dal","REGIONAL","roman"],["thuvaram paruppu","VOICE","ta"],["kandi pappu","VOICE","te"],["tur dal","MISSPELLING","roman"]],"tokens":["toor dal","thuvaram paruppu","kandi pappu","sambar dal","monthly ration"],"romanized":["thuvaram paruppu","kandi pappu"],"tags":["monthly-essentials"],"visual":{"primary":"#FACC15","accent":"#FFFFFF","layout":"Loose dal sack reference slot","tags":["loose","dal","sack"]}},
  {"slug":"loose-refined-sugar","sku":"KG-IN-STAPLE-REFINED-SUGAR","name":"Loose Refined Sugar","short":"Canonical loose sugar staple for tea, coffee, and sweets.","department":"grocery","category":"loose-staples","category_name":"Loose Staples","subcategory":"sugar-salt","subcategory_name":"Sugar and Salt","family":"loose-sugar-staples","family_name":"Loose Sugar Staples","product_type":"LOOSE","brand":"loose-staples","manufacturer":"Regional sugar wholesalers","region":"TN","perishability":"dry-grocery-stable","delivery":"dry-staple-sack-hyperlocal","pack":"burlap-sack","qty":1,"unit":"kilogram","metric":1000,"metric_unit":"g","variant":"1 kg loose calibrated unit","variant_type":"LOOSE","weight":1000,"mrp":0,"aliases":[["sugar loose","REGIONAL","roman"],["sakkarai","VOICE","ta"],["sakkare","VOICE","kn"],["chini","VOICE","hi"]],"tokens":["loose sugar","sakkarai","sakkare","chini","tea sugar","monthly ration"],"romanized":["sakkarai","sakkare","chini"],"tags":["monthly-essentials","tea-time"],"visual":{"primary":"#FFFFFF","accent":"#94A3B8","layout":"Loose sugar sack reference slot","tags":["loose","sugar","sack"]}},
  {"slug":"loose-tea-dust","sku":"KG-IN-STAPLE-TEA-DUST","name":"Loose Tea Dust","short":"Canonical loose tea dust for tea kadai and household chai.","department":"beverages","category":"tea-coffee","category_name":"Tea and Coffee","subcategory":"tea-dust","subcategory_name":"Tea Dust","family":"loose-tea-staples","family_name":"Loose Tea Staples","product_type":"LOOSE","brand":"loose-staples","manufacturer":"Regional tea wholesalers","region":"TN","perishability":"dry-grocery-stable","delivery":"dry-staple-sack-hyperlocal","pack":"burlap-sack","qty":250,"unit":"gram","metric":250,"metric_unit":"g","variant":"250 g loose calibrated unit","variant_type":"LOOSE","weight":250,"mrp":0,"aliases":[["tea dust","REGIONAL","roman"],["tea thool","VOICE","ta"],["chai patti","VOICE","hi"],["tea powder loose","REGIONAL","roman"]],"tokens":["loose tea dust","tea thool","chai patti","tea kadai","morning tea"],"romanized":["tea thool","chai patti"],"tags":["tea-time","breakfast"],"visual":{"primary":"#3F2A1D","accent":"#FDE68A","layout":"Loose tea dust sack reference slot","tags":["loose","tea","sack"]}}
]
$json$::jsonb;
begin
  insert into public.packaging_types (slug, name, description, supports_loose_weight, supports_ocr, leak_risk, crush_risk, reuse_profile, metadata)
  values
    ('pillow-pouch', 'Pillow Pouch', 'Flexible pillow pack used for cooperative milk, oil pouches, spices, and snack packs.', false, true, 0.45, 0.2, '{"reuse_potential":"none"}', '{"matrix_code":"PKG-PIL-POUCH","material_class":"co-extruded PE","stackability":"medium_when_crated","moisture_resistance":"high","thermal_tolerance":"ambient_to_chilled","transport_fragility":"medium_leak_risk","shelf_display_mode":"crate_or_stack","disposal_classification":"flexible_plastic"}'),
    ('transformer-pouch', 'Transformer Pouch', 'Self-standing zip-lock pouch used for chilled wet batters.', false, true, 0.35, 0.25, '{"reuse_potential":"low_after_food_contact"}', '{"matrix_code":"PKG-TRN-POUCH","material_class":"barrier nylon PE","stackability":"low_self_standing","moisture_resistance":"high","thermal_tolerance":"chilled","transport_fragility":"medium_seal_risk","shelf_display_mode":"refrigerated_upright","disposal_classification":"multi_layer_flexible_plastic"}'),
    ('hanging-strip', 'Hanging Strip', 'Punch-cut sachet strip for high-density petty-shop vertical merchandising.', false, true, 0.1, 0.15, '{"reuse_potential":"none"}', '{"matrix_code":"PKG-HNG-STRIP","material_class":"punch-cut poly","stackability":"not_stackable","moisture_resistance":"medium","thermal_tolerance":"ambient","transport_fragility":"low","shelf_display_mode":"hanging_vertical_strip","disposal_classification":"flexible_plastic"}'),
    ('glass-jar', 'Glass Jar', 'Airtight sodalime glass jar with screw lid for pickles, ghee, and condiments.', false, true, 0.2, 0.85, '{"reuse_potential":"high_household_reuse"}', '{"matrix_code":"PKG-GLS-JAR","material_class":"sodalime glass","stackability":"low_to_medium","moisture_resistance":"high","thermal_tolerance":"ambient","transport_fragility":"very_high","shelf_display_mode":"upright_shelf","disposal_classification":"glass_recyclable"}'),
    ('iml-tub', 'IML Tub', 'Injection-molded labelled tub for chilled chutneys, curd, and dips.', false, true, 0.18, 0.22, '{"reuse_potential":"low_food_contact_reuse"}', '{"matrix_code":"PKG-IML-TUB","material_class":"polypropylene","stackability":"medium","moisture_resistance":"high","thermal_tolerance":"chilled","transport_fragility":"low","shelf_display_mode":"refrigerated_stack","disposal_classification":"rigid_plastic"}'),
    ('pet-bottle', 'PET Bottle', 'Transparent or printed PET bottle for edible oils and beverages.', false, true, 0.2, 0.28, '{"reuse_potential":"medium_household_reuse"}', '{"matrix_code":"PKG-PET-BOTTLE","material_class":"PET","stackability":"medium","moisture_resistance":"high","thermal_tolerance":"ambient","transport_fragility":"medium","shelf_display_mode":"upright_shelf","disposal_classification":"recyclable_plastic"}'),
    ('metal-tin', 'Metal Tin', 'Seamed metal tin for ghee, oils, and shelf-stable foods.', false, true, 0.08, 0.12, '{"reuse_potential":"high_household_container"}', '{"matrix_code":"PKG-METAL-TIN","material_class":"tinplate_steel","stackability":"high","moisture_resistance":"high","thermal_tolerance":"ambient_heat_resistant","transport_fragility":"low","shelf_display_mode":"upright_stack","disposal_classification":"metal_recyclable"}'),
    ('single-wall-cup', 'Single-Wall Cup', 'Single-wall paper cup or tray used for fresh bakery and snacks.', false, false, 0.25, 0.65, '{"reuse_potential":"none"}', '{"matrix_code":"PKG-SW-CUP","material_class":"paperboard","stackability":"low","moisture_resistance":"low","thermal_tolerance":"warm_food_short_duration","transport_fragility":"high","shelf_display_mode":"countertop_tray","disposal_classification":"paper_food_soiled"}'),
    ('terracotta-kulhad', 'Terracotta Kulhad', 'Unglazed clay cup for traditional beverages and desserts.', false, false, 0.55, 0.95, '{"reuse_potential":"none_single_service"}', '{"matrix_code":"PKG-TERR-KULHAD","material_class":"terracotta_clay","stackability":"low","moisture_resistance":"medium","thermal_tolerance":"hot_beverage","transport_fragility":"very_high","shelf_display_mode":"countertop_nested","disposal_classification":"inert_clay"}'),
    ('burlap-sack', 'Burlap Sack', 'Jute or burlap sack used for loose staples and wholesale handling.', true, false, 0.04, 0.35, '{"reuse_potential":"high_bulk_handling"}', '{"matrix_code":"PKG-BURLAP-SACK","material_class":"jute_burlap","stackability":"high","moisture_resistance":"low","thermal_tolerance":"ambient","transport_fragility":"low","shelf_display_mode":"floor_sack_bin","disposal_classification":"biodegradable_fiber"}'),
    ('plastic-crate', 'Plastic Crate', 'Returnable ventilated plastic crate for milk, bakery, and fresh products.', true, false, 0.05, 0.18, '{"reuse_potential":"very_high_returnable"}', '{"matrix_code":"PKG-PLASTIC-CRATE","material_class":"HDPE","stackability":"high","moisture_resistance":"high","thermal_tolerance":"ambient_chilled","transport_fragility":"low","shelf_display_mode":"backroom_or_floor_stack","disposal_classification":"reusable_asset"}')
  on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      supports_loose_weight = excluded.supports_loose_weight,
      supports_ocr = excluded.supports_ocr,
      leak_risk = excluded.leak_risk,
      crush_risk = excluded.crush_risk,
      reuse_profile = public.packaging_types.reuse_profile || excluded.reuse_profile,
      metadata = public.packaging_types.metadata || excluded.metadata;

  insert into public.perishability_profiles (
    slug, name, perishability_class, shelf_life_hours, freshness_window_minutes, storage_requirement,
    heat_sensitivity, spoilage_rate, delivery_urgency, max_transit_duration_minutes,
    refrigeration_required, sunlight_sensitivity, stackability, leak_risk, odor_sensitivity, breakability, metadata
  )
  values
    ('fresh-bakery-same-day', 'Fresh Bakery Same Day', 'SAME_DAY_FRESH', 24, 240, 'ambient_fresh', 0.35, 0.35, 0.45, 90, false, 0.35, 0.25, 0.02, 0.25, 0.75, '{"humidity_threshold_rh_percent":55,"shelf_life_model":"same_day_texture_decay"}'),
    ('dry-staple-sack-stable', 'Dry Staple Sack Stable', 'DRY_STABLE', 4320, null, 'ambient_dry', 0.12, 0.03, 0.1, 240, false, 0.2, 0.9, 0.01, 0.35, 0.15, '{"humidity_sensitivity":"keep_off_floor_and_away_from_water","pest_control_required":true}')
  on conflict (slug) do update
  set name = excluded.name,
      perishability_class = excluded.perishability_class,
      shelf_life_hours = excluded.shelf_life_hours,
      storage_requirement = excluded.storage_requirement,
      metadata = public.perishability_profiles.metadata || excluded.metadata;

  insert into public.delivery_constraints (
    slug, name, max_delivery_radius_km, max_transit_duration_minutes, cold_chain_required,
    insulated_delivery_required, ice_required, fragile_flag, stackable, morning_priority, route_batching_allowed, metadata
  )
  values
    ('bakery-crush-sensitive-hyperlocal', 'Bakery Crush Sensitive Hyperlocal', 5, 90, false, false, false, true, false, false, true, '{"avoid_top_load":true,"paper_tray_or_crate_preferred":true}'),
    ('dry-staple-sack-hyperlocal', 'Dry Staple Sack Hyperlocal', 8, 180, false, false, false, false, true, false, true, '{"keep_dry":true,"seller_weight_calibration_required":true}')
  on conflict (slug) do update
  set name = excluded.name,
      max_delivery_radius_km = excluded.max_delivery_radius_km,
      max_transit_duration_minutes = excluded.max_transit_duration_minutes,
      metadata = public.delivery_constraints.metadata || excluded.metadata;

  insert into public.brands (slug, canonical_name, manufacturer, origin_region, country_code, aliases, is_local_brand, metadata)
  values
    ('nandini', 'Nandini', 'Karnataka Milk Federation', 'KA', 'IN', array['KMF', 'Nandini Milk'], true, '{"brand_type":"state_dairy_cooperative"}'),
    ('milma', 'Milma', 'Kerala Cooperative Milk Marketing Federation', 'KL', 'IN', array['KCMMF', 'Milma Milk'], true, '{"brand_type":"state_dairy_cooperative"}'),
    ('clinic-plus', 'Clinic Plus', 'Hindustan Unilever Limited', null, 'IN', array['Clinic Plus Shampoo'], false, '{"brand_type":"national_fmcg"}'),
    ('head-shoulders', 'Head & Shoulders', 'Procter & Gamble India', null, 'IN', array['H&S', 'Head and Shoulders'], false, '{"brand_type":"national_fmcg"}'),
    ('meera', 'Meera', 'CavinKare Pvt. Ltd.', 'TN', 'IN', array['Meera Herbal'], true, '{"brand_type":"regional_fmcg"}'),
    ('sabena', 'Sabena', 'Sabena household cleaning manufacturer', null, 'IN', array['Sabena Powder'], false, '{"brand_type":"household_cleaning"}'),
    ('aachi', 'Aachi', 'Aachi Masala Foods Pvt. Ltd.', 'TN', 'IN', array['Aachi Masala'], true, '{"brand_type":"regional_spices"}'),
    ('sakthi', 'Sakthi', 'Sakthi Masala Pvt. Ltd.', 'TN', 'IN', array['Sakthi Masala'], true, '{"brand_type":"regional_spices"}'),
    ('eastern', 'Eastern', 'Eastern Condiments Pvt. Ltd.', 'KL', 'IN', array['Eastern Masala'], true, '{"brand_type":"regional_spices"}'),
    ('gold-winner', 'Gold Winner', 'Kaleesuwari Refinery Pvt. Ltd.', 'TN', 'IN', array['GoldWinner'], true, '{"brand_type":"edible_oil"}'),
    ('idhayam', 'Idhayam', 'V.V.V. & Sons Edible Oils Ltd.', 'TN', 'IN', array['Idhayam Nallennai'], true, '{"brand_type":"edible_oil"}'),
    ('grb', 'GRB', 'GRB Dairy Foods Pvt. Ltd.', 'TN', 'IN', array['GRB Ghee'], true, '{"brand_type":"dairy_ghee"}'),
    ('rkg', 'RKG', 'RKG Ghee manufacturer', 'TN', 'IN', array['RKG Ghee'], true, '{"brand_type":"dairy_ghee"}'),
    ('iyengar-bakery', 'Iyengar Bakery', 'Local Iyengar bakery kitchens', 'KA', 'IN', array['Iyengar Bakery Products'], true, '{"brand_type":"local_bakery_archetype"}'),
    ('local-unbranded', 'Local Unbranded', 'Regional small-batch and loose-staple suppliers', null, 'IN', array['Local', 'Loose'], true, '{"brand_type":"canonical_unbranded_local"}'),
    ('loose-staples', 'Loose Staples', 'Regional mills and wholesalers', null, 'IN', array['Loose Grocery', 'Open Staples'], true, '{"brand_type":"canonical_loose_staples"}')
  on conflict (slug) do update
  set canonical_name = excluded.canonical_name,
      manufacturer = excluded.manufacturer,
      origin_region = excluded.origin_region,
      aliases = excluded.aliases,
      is_local_brand = excluded.is_local_brand,
      metadata = public.brands.metadata || excluded.metadata;

  for p in select value from jsonb_array_elements(products)
  loop
    select id into dept_uuid from public.departments where slug = p->>'department';

    insert into public.categories (name, slug, description, sort_order, is_active, department_id, canonical_name, aliases, search_terms, regional_priority, perishability_class, image_requirements, packaging_defaults, fulfillment_constraints, discovery_tags, taxonomy_level, ontology_metadata, status, is_mvp_enabled, quality_score, governance_metadata)
    values (
      p->>'category_name', p->>'category', 'Tier 1 South Indian FMCG canonical category seeded from curated ontology completion.', 120, true, dept_uuid,
      p->>'category_name', array[p->>'category_name'], array[p->>'category'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}'::jsonb,
      case when p->>'perishability' in ('coop-packet-milk-48h-cold-chain','fermented-batter-168h-chilled') then 'SHORT_SHELF'::public.perishability_class when p->>'perishability' = 'fresh-bakery-same-day' then 'SAME_DAY_FRESH'::public.perishability_class else 'DRY_STABLE'::public.perishability_class end,
      image_requirements,
      jsonb_build_array(p->>'pack'),
      jsonb_build_object('source','tier_1_completion_recovery'),
      array['hyperlocal','south-india','tier-1'],
      'CATEGORY',
      jsonb_build_object('source_dataset','tier_1_south_indian_fmcg_completion'),
      'active', true, 94,
      '{"duplicate_detection_keys":["slug","category","regional_aliases"],"moderation_state":"approved_curated","ai_extraction_confidence":"curated_not_model_inferred"}'::jsonb
    )
    on conflict (slug) do update
    set department_id = excluded.department_id,
        canonical_name = excluded.canonical_name,
        search_terms = excluded.search_terms,
        image_requirements = public.categories.image_requirements || excluded.image_requirements,
        packaging_defaults = excluded.packaging_defaults,
        ontology_metadata = public.categories.ontology_metadata || excluded.ontology_metadata,
        status = 'active',
        quality_score = greatest(public.categories.quality_score, excluded.quality_score)
    returning id into cat_uuid;

    insert into public.subcategories (department_id, category_id, slug, canonical_name, aliases, search_terms, regional_priority, perishability_class, image_requirements, packaging_defaults, fulfillment_constraints, discovery_tags, sort_order, is_active, status, is_mvp_enabled, quality_score, governance_metadata)
    values (
      dept_uuid, cat_uuid, p->>'subcategory', p->>'subcategory_name', array[p->>'subcategory_name'], array[p->>'subcategory'],
      '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}'::jsonb,
      case when p->>'perishability' in ('coop-packet-milk-48h-cold-chain','fermented-batter-168h-chilled') then 'SHORT_SHELF'::public.perishability_class when p->>'perishability' = 'fresh-bakery-same-day' then 'SAME_DAY_FRESH'::public.perishability_class else 'DRY_STABLE'::public.perishability_class end,
      image_requirements, jsonb_build_array(p->>'pack'), jsonb_build_object('source','tier_1_completion_recovery'),
      array['hyperlocal','south-india','tier-1'], 120, true, 'active', true, 94,
      '{"duplicate_detection_keys":["slug","category"],"moderation_state":"approved_curated"}'::jsonb
    )
    on conflict (slug) do update
    set category_id = excluded.category_id,
        canonical_name = excluded.canonical_name,
        packaging_defaults = excluded.packaging_defaults,
        status = 'active',
        quality_score = greatest(public.subcategories.quality_score, excluded.quality_score)
    returning id into subcat_uuid;

    insert into public.product_families (department_id, category_id, subcategory_id, slug, canonical_name, product_group, aliases, search_terms, regional_priority, perishability_class, image_requirements, packaging_defaults, fulfillment_constraints, discovery_tags, is_active, status, is_mvp_enabled, quality_score, governance_metadata)
    values (
      dept_uuid, cat_uuid, subcat_uuid, p->>'family', p->>'family_name', p->>'subcategory_name',
      array[p->>'family_name'], array[p->>'family'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}'::jsonb,
      case when p->>'perishability' in ('coop-packet-milk-48h-cold-chain','fermented-batter-168h-chilled') then 'SHORT_SHELF'::public.perishability_class when p->>'perishability' = 'fresh-bakery-same-day' then 'SAME_DAY_FRESH'::public.perishability_class else 'DRY_STABLE'::public.perishability_class end,
      image_requirements, jsonb_build_array(p->>'pack'), jsonb_build_object('source','tier_1_completion_recovery'),
      array['hyperlocal','south-india','tier-1'], true, 'active', true, 95,
      '{"duplicate_detection_keys":["slug","subcategory","packaging"],"moderation_state":"approved_curated"}'::jsonb
    )
    on conflict (slug) do update
    set subcategory_id = excluded.subcategory_id,
        canonical_name = excluded.canonical_name,
        packaging_defaults = excluded.packaging_defaults,
        status = 'active',
        quality_score = greatest(public.product_families.quality_score, excluded.quality_score)
    returning id into family_uuid;

    select id into brand_uuid from public.brands where slug = p->>'brand';
    select id into perishability_uuid from public.perishability_profiles where slug = p->>'perishability';
    select id into delivery_uuid from public.delivery_constraints where slug = p->>'delivery';
    select id into unit_uuid from public.units where slug = p->>'unit';
    select id into packaging_uuid from public.packaging_types where slug = p->>'pack';

    insert into public.master_products (
      canonical_name, normalized_name, slug, description, short_description,
      department_id, category_id, subcategory_id, product_family_id, product_group, product_type,
      brand_id, manufacturer, origin_region, internal_sku, seller_visibility, active_status,
      english_name, tamil_name, tamil_transliteration, telugu_name, kannada_name, malayalam_name, hindi_name,
      romanized_variants, discovery_tags, regional_priority, metadata,
      status, is_mvp_enabled, quality_score, moderation_required, governance_metadata
    )
    values (
      p->>'name',
      lower(regexp_replace(p->>'name', '[^a-zA-Z0-9]+', ' ', 'g')),
      p->>'slug',
      (p->>'short') || ' Canonical master record only; not seller inventory and not a live listing.',
      p->>'short',
      dept_uuid, cat_uuid, subcat_uuid, family_uuid, p->>'subcategory_name', p->>'product_type',
      brand_uuid, p->>'manufacturer', (p->>'region')::public.commerce_region, p->>'sku',
      'PUBLIC', 'ACTIVE',
      p->>'name', p->>'name', (p->'romanized'->>0), p->>'name', p->>'name', p->>'name', p->>'name',
      array(select jsonb_array_elements_text(p->'romanized')),
      array(select jsonb_array_elements_text(p->'tags')),
      '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}'::jsonb,
      jsonb_build_object(
        'source_dataset','tier_1_south_indian_fmcg_completion',
        'canonical_search_identity', p->>'slug',
        'visual_descriptors', p->'visual',
        'image_ingestion_requirements', image_requirements || jsonb_build_object('image_search_terms', p->'tokens'),
        'operational_relationships', jsonb_build_object(
          'basket_affinities', jsonb_build_array('breakfast-basket','tea-kadai-basket','bachelor-basket','festive-basket'),
          'seller_archetypes', jsonb_build_array('petti-kadai','tea-kadai','milk-booth','supermarket','bakery'),
          'display_intelligence', jsonb_build_object('packaging_slug', p->>'pack', 'refrigeration_positioning', (p->>'delivery') = 'milk-batter-morning-cold-chain', 'stack_facing_required', true)
        )
      ),
      'active', true, 96, false,
      jsonb_build_object(
        'canonical_business_id', p->>'sku',
        'duplicate_detection_keys', jsonb_build_array(p->>'slug', p->>'brand', p->>'sku'),
        'moderation_state', 'approved_curated',
        'ingestion_verification', 'tier_1_recovery_completion',
        'ai_extraction_confidence', 'curated_not_model_inferred',
        'source_attribution', 'south_indian_hyperlocal_fmcg_research_specification',
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
        romanized_variants = excluded.romanized_variants,
        discovery_tags = excluded.discovery_tags,
        metadata = public.master_products.metadata || excluded.metadata,
        status = 'active',
        is_mvp_enabled = true,
        quality_score = greatest(public.master_products.quality_score, excluded.quality_score),
        governance_metadata = public.master_products.governance_metadata || excluded.governance_metadata
    returning id into product_uuid;

    v := p;
    insert into public.catalog_product_variants (
      product_id, variant_type, variant_name, quantity, unit_id, normalized_metric_value, normalized_metric_unit,
      packaging_type_id, shelf_life_hours, storage_requirement, fragile_flag, cold_chain_required,
      estimated_weight_grams, freshness_window_minutes, sku_template, metadata,
      status, is_mvp_enabled, quality_score, governance_metadata
    )
    values (
      product_uuid, (v->>'variant_type')::public.variant_type, v->>'variant', (v->>'qty')::numeric, unit_uuid,
      (v->>'metric')::numeric, v->>'metric_unit', packaging_uuid,
      case when v->>'perishability' = 'dry-grocery-stable' then 4320 when v->>'perishability' = 'fresh-bakery-same-day' then 24 when v->>'perishability' = 'personal-care-sachet-stable' then 17520 else 168 end,
      case when v->>'delivery' = 'milk-batter-morning-cold-chain' then 'refrigerated' when v->>'perishability' = 'fresh-bakery-same-day' then 'ambient_fresh' else 'ambient' end,
      (v->>'delivery') in ('fragile-glass-condiment-hyperlocal','bakery-crush-sensitive-hyperlocal','humidity-sensitive-snack-hyperlocal'),
      (v->>'delivery') = 'milk-batter-morning-cold-chain',
      (v->>'weight')::numeric,
      case when (v->>'delivery') = 'milk-batter-morning-cold-chain' then 120 else null end,
      (v->>'sku') || '-' || upper(regexp_replace(v->>'metric_unit', '[^A-Za-z0-9]+', '', 'g')),
      jsonb_build_object(
        'mrp_inr_reference', nullif(v->>'mrp','0')::numeric,
        'mrp_policy', case when nullif(v->>'mrp','0') is null then 'not_seeded_for_loose_or_variable_market_items' else 'static_pack_reference_only_not_live_pricing' end,
        'inventory_placeholder', jsonb_build_object('stock_count', null, 'seller_id', null, 'reason', 'canonical_ontology_only_no_seller_inventory'),
        'packaging_normalization_slug', v->>'pack',
        'display_mode', case when v->>'pack' = 'hanging-strip' then 'hanging_strip' when v->>'delivery' = 'milk-batter-morning-cold-chain' then 'refrigerated_facing' when v->>'pack' in ('glass-jar','pet-bottle','metal-tin') then 'upright_shelf' else 'stack_or_countertop' end
      ),
      'active', true, 95,
      jsonb_build_object('duplicate_detection_keys', jsonb_build_array(v->>'slug', v->>'sku', v->>'variant'), 'moderation_state', 'approved_curated')
    )
    on conflict (sku_template) do update
    set variant_name = excluded.variant_name,
        quantity = excluded.quantity,
        unit_id = excluded.unit_id,
        normalized_metric_value = excluded.normalized_metric_value,
        normalized_metric_unit = excluded.normalized_metric_unit,
        packaging_type_id = excluded.packaging_type_id,
        shelf_life_hours = excluded.shelf_life_hours,
        storage_requirement = excluded.storage_requirement,
        fragile_flag = excluded.fragile_flag,
        cold_chain_required = excluded.cold_chain_required,
        estimated_weight_grams = excluded.estimated_weight_grams,
        metadata = public.catalog_product_variants.metadata || excluded.metadata,
        quality_score = greatest(public.catalog_product_variants.quality_score, excluded.quality_score),
        governance_metadata = public.catalog_product_variants.governance_metadata || excluded.governance_metadata
    returning id into variant_uuid;

    insert into public.product_logistics_profiles (product_id, variant_id, perishability_profile_id, delivery_constraint_id, region_codes, notes, metadata)
    values (
      product_uuid, variant_uuid, perishability_uuid, delivery_uuid, array['TN','KL','KA','AP','TS']::public.commerce_region[],
      'Tier 1 canonical variant logistics profile with handling, temperature, humidity, vibration, and stacking constraints.',
      jsonb_build_object(
        'variant_sku', v->>'sku',
        'cold_chain_required', (v->>'delivery') = 'milk-batter-morning-cold-chain',
        'humidity_sensitivity', case when v->>'perishability' in ('crisp-bakery-snack-humidity-sensitive','dry-staple-sack-stable') then 'high' else 'medium' end,
        'vibration_sensitivity', case when v->>'delivery' in ('fragile-glass-condiment-hyperlocal','bakery-crush-sensitive-hyperlocal') then 'high' else 'medium' end,
        'stacking_restrictions', case when v->>'delivery' in ('fragile-glass-condiment-hyperlocal','bakery-crush-sensitive-hyperlocal','humidity-sensitive-snack-hyperlocal') then 'avoid_top_load' else 'standard_stack' end
      )
    )
    on conflict (product_id, variant_id, perishability_profile_id, delivery_constraint_id) do update
    set notes = excluded.notes,
        metadata = public.product_logistics_profiles.metadata || excluded.metadata;

    for alias_item in select value from jsonb_array_elements(p->'aliases')
    loop
      insert into public.product_aliases (product_id, alias, normalized_alias, alias_type, language, region_codes, confidence, source, metadata)
      values (
        product_uuid, alias_item->>0, lower(regexp_replace(alias_item->>0, '\s+', ' ', 'g')),
        (alias_item->>1)::public.product_alias_type, (alias_item->>2)::public.commerce_language,
        array['TN','KL','KA','AP','TS']::public.commerce_region[],
        case when alias_item->>1 = 'MISSPELLING' then 0.82 else 0.94 end,
        'tier_1_completion_recovery',
        jsonb_build_object('seed_slug', p->>'slug', 'soundex_key', soundex(alias_item->>0), 'double_metaphone_style_key', regexp_replace(lower(alias_item->>0), '[aeiou ]', '', 'g'))
      )
      on conflict (product_id, normalized_alias, alias_type, language) do update
      set alias = excluded.alias,
          confidence = excluded.confidence,
          metadata = public.product_aliases.metadata || excluded.metadata;
    end loop;

    insert into public.multilingual_mappings (entity_table, entity_id, language, native_text, transliteration, romanized_variants, phonetic_tokens, ocr_variants, voice_variants, confidence, source, metadata)
    values
      ('master_products', product_uuid, 'ta', p->>'name', (p->'romanized'->>0), array(select jsonb_array_elements_text(p->'romanized')), array[p->>'slug'], array[p->>'sku'], array(select alias.value->>0 from jsonb_array_elements(p->'aliases') alias(value) where alias.value->>2 = 'ta'), 0.94, 'tier_1_completion_recovery', jsonb_build_object('seed_slug', p->>'slug')),
      ('master_products', product_uuid, 'te', p->>'name', null, array(select jsonb_array_elements_text(p->'romanized')), array[p->>'slug'], array[p->>'sku'], array(select alias.value->>0 from jsonb_array_elements(p->'aliases') alias(value) where alias.value->>2 = 'te'), 0.94, 'tier_1_completion_recovery', jsonb_build_object('seed_slug', p->>'slug')),
      ('master_products', product_uuid, 'kn', p->>'name', null, array(select jsonb_array_elements_text(p->'romanized')), array[p->>'slug'], array[p->>'sku'], array(select alias.value->>0 from jsonb_array_elements(p->'aliases') alias(value) where alias.value->>2 = 'kn'), 0.94, 'tier_1_completion_recovery', jsonb_build_object('seed_slug', p->>'slug')),
      ('master_products', product_uuid, 'ml', p->>'name', null, array(select jsonb_array_elements_text(p->'romanized')), array[p->>'slug'], array[p->>'sku'], array(select alias.value->>0 from jsonb_array_elements(p->'aliases') alias(value) where alias.value->>2 = 'ml'), 0.94, 'tier_1_completion_recovery', jsonb_build_object('seed_slug', p->>'slug')),
      ('master_products', product_uuid, 'hi', p->>'name', null, array(select jsonb_array_elements_text(p->'romanized')), array[p->>'slug'], array[p->>'sku'], array(select alias.value->>0 from jsonb_array_elements(p->'aliases') alias(value) where alias.value->>2 = 'hi'), 0.94, 'tier_1_completion_recovery', jsonb_build_object('seed_slug', p->>'slug'))
    on conflict (entity_table, entity_id, language, native_text) do update
    set transliteration = excluded.transliteration,
        romanized_variants = excluded.romanized_variants,
        phonetic_tokens = excluded.phonetic_tokens,
        ocr_variants = excluded.ocr_variants,
        voice_variants = excluded.voice_variants,
        metadata = public.multilingual_mappings.metadata || excluded.metadata;

    foreach image_kind in array array['HERO','TRANSPARENT_PNG','PACKAGING','SHELF','MOBILE_THUMBNAIL','MULTI_ANGLE']
    loop
      insert into public.catalog_product_images (
        product_id, variant_id, image_kind, storage_path, alt_text, width, height, aspect_ratio, mime_type,
        white_background, mobile_optimized, no_watermark, lighting_quality, compression_artifact_score,
        packaging_visibility, ocr_readability, dominant_colors, metadata
      )
      values (
        product_uuid, variant_uuid, image_kind::public.product_image_kind,
        'catalog-ingestion/pending/tier-1-south-indian-fmcg/' || (p->>'slug') || '/' || lower(image_kind) || '.webp',
        (p->>'name') || ' ' || lower(replace(image_kind, '_', ' ')) || ' ingestion slot',
        case when image_kind = 'SHELF' then 1600 else 1200 end,
        case when image_kind = 'SHELF' then 900 else 1200 end,
        case when image_kind = 'SHELF' then '16:9' else '1:1' end,
        'image/webp',
        image_kind <> 'SHELF', true, true, 'pending_curated_capture', 0,
        case when image_kind in ('PACKAGING','HERO','MOBILE_THUMBNAIL','MULTI_ANGLE') then 0.85 else 0.65 end,
        case when image_kind in ('PACKAGING','HERO','MULTI_ANGLE') then 0.8 else 0.55 end,
        array[p->'visual'->>'primary', p->'visual'->>'accent'],
        jsonb_build_object(
          'image_status','placeholder_for_ingestion',
          'validation_rules', image_requirements,
          'image_search_terms', p->'tokens',
          'packaging_focus', p->'visual'->>'layout',
          'cv_validation_requirements', jsonb_build_object('ocr_alias_visibility', true, 'packaging_angle_required', image_kind in ('PACKAGING','MULTI_ANGLE'), 'scale_reference_required', true),
          'duplicate_detection_hints', jsonb_build_array(p->>'brand', p->>'slug', p->'visual'->>'primary')
        )
      )
      on conflict do nothing;
    end loop;

    foreach token in array array(select jsonb_array_elements_text(p->'tokens'))
    loop
      insert into public.search_tokens (product_id, token, normalized_token, token_type, language, region_codes, weight, metadata)
      values (product_uuid, token, lower(token), 'SEMANTIC', 'roman', array['TN','KL','KA','AP','TS']::public.commerce_region[], 1.0, jsonb_build_object('seed_slug', p->>'slug', 'soundex_key', soundex(token), 'voice_normalization', regexp_replace(lower(token), '[^a-z0-9]+', ' ', 'g')))
      on conflict do nothing;

      insert into public.search_tokens (product_id, token, normalized_token, token_type, language, region_codes, weight, metadata)
      values (product_uuid, token, regexp_replace(lower(token), '[aeiou ]', '', 'g'), 'PHONETIC', 'roman', array['TN','KL','KA','AP','TS']::public.commerce_region[], 0.92, jsonb_build_object('seed_slug', p->>'slug', 'double_metaphone_style', true))
      on conflict do nothing;
    end loop;

    foreach token in array array(select jsonb_array_elements_text(p->'romanized'))
    loop
      insert into public.search_tokens (product_id, token, normalized_token, token_type, language, region_codes, weight, metadata)
      values (product_uuid, token, lower(token), 'TRANSLITERATION', 'roman', array['TN','KL','KA','AP','TS']::public.commerce_region[], 1.1, jsonb_build_object('seed_slug', p->>'slug'))
      on conflict do nothing;
    end loop;

    insert into public.search_validation_reports (
      product_id, alias_count, transliteration_count, phonetic_token_count, autocomplete_token_count,
      multilingual_coverage, recipe_association_count, co_purchase_tag_count, readiness_score, missing_requirements, metadata
    )
    values (
      product_uuid, jsonb_array_length(p->'aliases'), jsonb_array_length(p->'romanized'), jsonb_array_length(p->'tokens'),
      jsonb_array_length(p->'tokens'), '{"ta":true,"te":true,"kn":true,"ml":true,"hi":true,"roman":true}'::jsonb,
      0, 4, 96, array[]::text[], jsonb_build_object('seed_slug', p->>'slug', 'report_source', 'tier_1_completion_recovery')
    )
    on conflict do nothing;

    insert into public.taxonomy_integrity_reports (
      product_id, category_id, depth_valid, parent_relationship_valid, orphan_product,
      regional_tags_valid, festival_tags_valid, consistency_score, findings, metadata
    )
    values (
      product_uuid, cat_uuid, true, true, false, true, true, 98, array[]::text[],
      jsonb_build_object('department_slug', p->>'department', 'category_slug', p->>'category', 'subcategory_slug', p->>'subcategory')
    )
    on conflict do nothing;
  end loop;

  insert into public.hyperlocal_basket_archetypes (slug, canonical_name, basket_intent, primary_regions, time_window, anchor_tokens, product_slugs, seller_archetypes, metadata)
  values
    ('breakfast-basket', 'Breakfast Basket', 'Morning milk, batter, bread, chutney, sugar, tea, and cooking oil replenishment.', array['TN','KL','KA','AP','TS']::public.commerce_region[], '05:30-09:30', array['breakfast','idli','dosa','tea','milk'], array['aavin-nice-toned-milk','nandini-goodlife-toned-milk','milma-toned-milk','id-fresh-classic-idli-dosa-batter','id-fresh-coconut-chutney','bakery-milk-bread-loaf','loose-tea-dust','loose-refined-sugar'], array['milk-booth','supermarket','bakery','petti-kadai'], '{"recommendation_engine_ready":true}'),
    ('tea-kadai-basket', 'Tea Kadai Basket', 'Tea-shop replenishment basket for milk, sugar, tea dust, rusk, varkey, dishwash, and quick snacks.', array['TN','KL','KA','AP','TS']::public.commerce_region[], '04:30-20:00', array['tea kadai','chai','rusk','varkey'], array['aavin-nice-toned-milk','loose-tea-dust','loose-refined-sugar','ooty-varkey-small-gi-tagged-biscuit','bakery-rusk-pack','vim-dishwash-bar-stain-cutter-lemon','sabena-dishwash-powder','south-indian-mixture-pack'], array['tea-kadai','petti-kadai','bakery'], '{"display_density":"countertop_and_hanging"}'),
    ('bachelor-basket', 'Bachelor Basket', 'Low-friction essentials basket for sachets, ready batter, bread, oil, rice, dal, and cleaning basics.', array['TN','KL','KA','AP','TS']::public.commerce_region[], '18:00-23:00', array['bachelor','hostel','quick cook','sachet'], array['chik-thick-glossy-black-shampoo-sachet','clinic-plus-strong-long-shampoo-sachet','id-fresh-classic-idli-dosa-batter','loose-ponni-raw-rice','loose-toor-dal','vim-dishwash-bar-stain-cutter-lemon','gold-winner-sunflower-oil-pouch'], array['petti-kadai','supermarket'], '{"small_pack_bias":true}'),
    ('festive-basket', 'Festive Basket', 'Festival and visiting-family basket for ghee, traditional sweets, spices, pickles, rice, and local snacks.', array['TN','KL','KA','AP','TS']::public.commerce_region[], '08:00-21:00', array['festival','sweets','ghee','pickle'], array['grb-cow-ghee-jar','milma-ghee-jar','rkg-ghee-tin','ellu-urundai-pack','kadalai-mittai-bar','then-mittai-pillow-pouch','priya-mango-avakaya-pickle-with-garlic','aachi-chilli-powder','sakthi-turmeric-powder'], array['supermarket','petti-kadai','bakery'], '{"seasonal_expansion_ready":true}')
  on conflict (slug) do update
  set basket_intent = excluded.basket_intent,
      product_slugs = excluded.product_slugs,
      seller_archetypes = excluded.seller_archetypes,
      metadata = public.hyperlocal_basket_archetypes.metadata || excluded.metadata;

  insert into public.seller_archetypes (slug, canonical_name, operating_model, typical_packaging, temperature_capability, display_modes, product_slugs, metadata)
  values
    ('petti-kadai', 'Petti Kadai', 'Small neighborhood counter shop optimized for sachets, candy, snacks, and fast replenishment.', array['hanging-strip','pillow-pouch','countertop-jar'], 'ambient', array['hanging_strip','countertop_jars','front_counter_stack'], array['chik-thick-glossy-black-shampoo-sachet','clinic-plus-strong-long-shampoo-sachet','then-mittai-pillow-pouch','kadalai-mittai-bar','south-indian-mixture-pack'], '{"seller_inventory_not_seeded":true}'),
    ('tea-kadai', 'Tea Kadai', 'Tea shop with high milk, sugar, tea dust, rusk, snack, and cleaning throughput.', array['pillow-pouch','burlap-sack','opp-pillow-pouch','paper-wrapped-bar'], 'ambient_plus_morning_milk', array['countertop_jars','back_counter_crate','tea_station_stack'], array['aavin-nice-toned-milk','loose-tea-dust','loose-refined-sugar','ooty-varkey-small-gi-tagged-biscuit','bakery-rusk-pack','vim-dishwash-bar-stain-cutter-lemon'], '{"seller_inventory_not_seeded":true}'),
    ('milk-booth', 'Milk Booth', 'Morning cold-chain booth oriented around cooperative milk, curd, batter, and breakfast companions.', array['pillow-pouch','transformer-pouch','plastic-crate'], 'refrigerated_or_insulated', array['refrigerated_crate','morning_queue_facing'], array['aavin-nice-toned-milk','nandini-goodlife-toned-milk','milma-toned-milk','id-fresh-classic-idli-dosa-batter'], '{"seller_inventory_not_seeded":true}'),
    ('supermarket', 'Supermarket', 'Organized retail format with chilled, shelf, loose, and packaged FMCG aisles.', array['pillow-pouch','glass-jar','pet-bottle','metal-tin','iml-tub','burlap-sack'], 'ambient_chilled', array['refrigerated_bay','upright_shelf','endcap_stack','loose_bin'], array['priya-mango-avakaya-pickle-with-garlic','gold-winner-sunflower-oil-pouch','idhayam-gingelly-oil-bottle','grb-cow-ghee-jar','loose-ponni-raw-rice'], '{"seller_inventory_not_seeded":true}'),
    ('bakery', 'Bakery', 'Fresh bakery outlet optimized for puffs, buns, breads, rusks, and tea-time pairings.', array['single-wall-cup','pillow-pouch','opp-pillow-pouch','plastic-crate'], 'ambient_fresh', array['glass_counter','bread_rack','countertop_tray'], array['iyengar-bakery-veg-puff','iyengar-bakery-khara-bun','bakery-rusk-pack','bakery-milk-bread-loaf'], '{"seller_inventory_not_seeded":true}')
  on conflict (slug) do update
  set operating_model = excluded.operating_model,
      typical_packaging = excluded.typical_packaging,
      display_modes = excluded.display_modes,
      product_slugs = excluded.product_slugs,
      metadata = public.seller_archetypes.metadata || excluded.metadata;

  insert into public.display_intelligence_profiles (slug, canonical_name, display_mode, packaging_slugs, applicable_product_slugs, placement_rules, cv_requirements, metadata)
  values
    ('hanging-strip-logic', 'Hanging Strip Logic', 'hanging_strip', array['hanging-strip'], array['chik-thick-glossy-black-shampoo-sachet','clinic-plus-strong-long-shampoo-sachet','head-shoulders-anti-dandruff-sachet','meera-herbal-hairwash-powder-sachet'], '{"eye_level":"counter_side","front_facing_required":true,"strip_count_visible":true}'::jsonb, image_requirements || '{"ocr_visibility_required":true}'::jsonb, '{"search_context":"sachet impulse"}'),
    ('countertop-jars', 'Countertop Jars', 'countertop_jar', array['glass-jar','terracotta-kulhad'], array['then-mittai-pillow-pouch','kadalai-mittai-bar','ellu-urundai-pack'], '{"near_cash_counter":true,"transparent_container_preferred":true}'::jsonb, image_requirements || '{"scale_reference_required":true}'::jsonb, '{"search_context":"petti_kadai_counter"}'),
    ('refrigeration-positioning', 'Refrigeration Positioning', 'refrigerated_facing', array['pillow-pouch','transformer-pouch','iml-tub','plastic-crate'], array['aavin-nice-toned-milk','nandini-goodlife-toned-milk','milma-toned-milk','id-fresh-classic-idli-dosa-batter','id-fresh-coconut-chutney'], '{"temperature_zone":"1c_to_6c","door_open_exposure_limit_minutes":5,"morning_replenishment_priority":true}'::jsonb, image_requirements || '{"discoloration_detection_enabled":true}'::jsonb, '{"search_context":"cold_chain"}'),
    ('stack-facing-metadata', 'Stack Facing Metadata', 'stack_facing', array['pillow-pouch','pet-bottle','metal-tin','burlap-sack','plastic-crate'], array['gold-winner-sunflower-oil-pouch','idhayam-gingelly-oil-bottle','rkg-ghee-tin','loose-ponni-raw-rice','loose-toor-dal','loose-refined-sugar'], '{"front_label_visible":true,"heavy_items_bottom":true,"keep_staples_off_floor":true}'::jsonb, image_requirements || '{"scale_reference_required":true}'::jsonb, '{"search_context":"shelf_and_loose_bin"}')
  on conflict (slug) do update
  set placement_rules = excluded.placement_rules,
      cv_requirements = excluded.cv_requirements,
      applicable_product_slugs = excluded.applicable_product_slugs,
      metadata = public.display_intelligence_profiles.metadata || excluded.metadata;

  insert into public.regional_operational_profiles (slug, canonical_name, city, region_code, route_model, priority_windows, cold_chain_notes, humidity_notes, seller_archetypes, metadata)
  values
    ('chennai-tier1-routing', 'Chennai Tier 1 Routing', 'Chennai', 'TN', 'dense_morning_milk_and_evening_tiffin_routes', array['05:30-09:00','17:00-21:00'], 'Milk and batter need insulated morning routing in hot weather.', 'Coastal humidity affects bakery crispness, staples, and hanging sachet adhesives.', array['petti-kadai','tea-kadai','milk-booth','supermarket','bakery'], '{"operational_region":"TN_north"}'),
    ('bengaluru-tier1-routing', 'Bengaluru Tier 1 Routing', 'Bengaluru', 'KA', 'apartment_cluster_breakfast_and_bakery_routes', array['06:00-09:30','16:30-20:30'], 'Batter, chutney, and milk are apartment-cluster morning priorities.', 'Moderate humidity with rain-season bakery crush and moisture controls.', array['petti-kadai','tea-kadai','milk-booth','supermarket','bakery'], '{"operational_region":"KA_urban"}'),
    ('hyderabad-tier1-routing', 'Hyderabad Tier 1 Routing', 'Hyderabad', 'TS', 'spice_pickle_staple_and_breakfast_routes', array['06:30-10:00','18:00-22:00'], 'Chilled batter routes need heat-exposure control in summer.', 'Dry heat favors staples but pickles and oils need upright leak-safe handling.', array['petti-kadai','tea-kadai','supermarket'], '{"operational_region":"TS_urban"}'),
    ('kerala-tier1-routing', 'Kerala Tier 1 Routing', 'Kerala Urban Corridors', 'KL', 'humidity_aware_milk_bakery_and_grocery_routes', array['05:30-09:00','16:00-20:00'], 'Milma milk and chilled accompaniments require short insulated hops.', 'High humidity requires dry crates for bakery, tea dust, spices, and staples.', array['petti-kadai','tea-kadai','milk-booth','supermarket','bakery'], '{"operational_region":"KL_corridor"}')
  on conflict (slug) do update
  set route_model = excluded.route_model,
      priority_windows = excluded.priority_windows,
      cold_chain_notes = excluded.cold_chain_notes,
      humidity_notes = excluded.humidity_notes,
      seller_archetypes = excluded.seller_archetypes,
      metadata = public.regional_operational_profiles.metadata || excluded.metadata;

  update public.catalog_product_images
  set metadata = metadata || jsonb_build_object(
      'top_view_required', true,
      'side_view_required', true,
      'scale_reference_required', true,
      'lighting_standard', 'diffused_daylight_or_5500k_softbox',
      'background_standard', 'matte_white_or_clean_retail_shelf',
      'bruise_detection_enabled', true,
      'discoloration_detection_enabled', true,
      'OCR_visibility_required', true,
      'real_image_only', true,
      'placeholder_status', 'pending_curated_capture'
    )
  where storage_path like 'catalog-ingestion/pending/south-indian-core-fmcg/%'
     or storage_path like 'catalog-ingestion/pending/tier-1-south-indian-fmcg/%';

  update public.master_products
  set metadata = metadata || jsonb_build_object(
      'image_ingestion_requirements',
      coalesce(metadata->'image_ingestion_requirements', '{}'::jsonb) || jsonb_build_object(
        'top_view_required', true,
        'side_view_required', true,
        'scale_reference_required', true,
        'lighting_standard', 'diffused_daylight_or_5500k_softbox',
        'background_standard', 'matte_white_or_clean_retail_shelf',
        'bruise_detection_enabled', true,
        'discoloration_detection_enabled', true,
        'OCR_visibility_required', true,
        'real_image_only', true,
        'placeholder_status', 'pending_curated_capture'
      )
    )
  where metadata->>'source_dataset' in ('south_indian_core_fmcg_daily_essentials', 'tier_1_south_indian_fmcg_completion');
end $$;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('south_indian_tier_1_fmcg_completion', 'Enables Tier 1 South Indian hyperlocal FMCG canonical KG completion, basket intelligence, seller archetypes, display intelligence, regional operations, CV image slots, and search governance.', true, 100, '{"roles":["BUYER","SELLER","ADMIN","SUPER_ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();
