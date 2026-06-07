#!/usr/bin/env python3
"""
VendorHub Product Universe Generator (PP-C2)
============================================
Generates a fully self-contained, idempotent, rollback-safe SQL migration that:
  1. Bootstraps its own auth users + profiles + vendors (no dependency on seed files).
  2. Adds any missing categories/brands required for full search coverage (Health/OTC etc.).
  3. Generates 50,000+ REAL, deterministic products distributed across multiple vendors.
  4. Creates inventory rows so products render as in-stock.

Deterministic: same input -> identical UUIDs (uuid5), so reruns are idempotent via ON CONFLICT.
No placeholder/"Regional Brand N" filler. Only real brands and realistic product names.
"""
import json
import re
import uuid
import hashlib
import random
import os

NS = uuid.UUID("11111111-2222-3333-4444-555555555555")  # stable namespace


def uid(kind: str, key: str) -> str:
    return str(uuid.uuid5(NS, f"{kind}:{key}"))


def slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"-+", "-", s).strip("-")


def sql_str(s: str) -> str:
    return "'" + str(s).replace("'", "''") + "'"


def sql_arr(items):
    seen, out = set(), []
    for it in items:
        it = str(it).strip()
        if it and it.lower() not in seen:
            seen.add(it.lower())
            out.append(it)
    return "ARRAY[" + ",".join(sql_str(x) for x in out) + "]::text[]"


# Deterministic pseudo-random price per slug (stable across runs)
def price_for(slug: str, lo: int, hi: int) -> int:
    h = int(hashlib.md5(slug.encode()).hexdigest(), 16)
    span = max(1, hi - lo)
    val = lo + (h % span)
    # round to nearest sensible value
    if val >= 1000:
        return int(round(val / 50.0) * 50)
    if val >= 100:
        return int(round(val / 5.0) * 5)
    return val


# ---------------------------------------------------------------------------
# Reference data: departments & categories (existing UUIDs from PP-A migration)
# ---------------------------------------------------------------------------
DEPARTMENTS = {
    "grocery": ("246b5b35-3752-4a6d-9bc7-8a8c028e0dbe", "Grocery"),
    "dairy-breakfast": ("043395db-1df5-4a53-afcc-ee9ff845a16f", "Dairy & Breakfast"),
    "personal-care": ("d7838e79-a2dd-419c-bba8-42b1a143d991", "Personal Care"),
    "beauty": ("24b7c598-eb95-4f16-9eec-1fb1b6508ac5", "Beauty"),
    "fashion": ("6a054c44-26f0-41b1-b5f6-a9c2cb5c5268", "Fashion"),
    "electronics": ("39976707-11be-482b-8f08-2240e4f332c5", "Electronics"),
    "home-kitchen": ("2dda0bcb-9b5d-4694-b361-856766e0b1f7", "Home & Kitchen"),
    # NEW departments added by this migration
    "health": (uid("dept", "health"), "Health & Wellness"),
    "household": (uid("dept", "household"), "Household & Cleaning"),
    "baby-care": (uid("dept", "baby-care"), "Baby Care"),
    "snacks": (uid("dept", "snacks"), "Snacks & Branded Foods"),
}

# category_slug -> (uuid, department_slug, name)
CATEGORIES = {
    "atta-rice-dal": ("5952630e-248f-495d-ac57-e819aad89e33", "grocery", "Atta, Rice & Dal"),
    "oil-ghee": ("bbfb1e9c-7551-441a-a961-d6103a845ff2", "grocery", "Oil & Ghee"),
    "masalas-spices": ("b8ff7575-c5e9-4c0a-b37e-068c33467cf3", "grocery", "Masalas & Spices"),
    "salt-sugar-jaggery": ("a171d357-0e94-4cae-abc2-76b6f9f80784", "grocery", "Salt, Sugar & Jaggery"),
    "dry-fruits-nuts": ("2cdfbccb-60dc-4ef0-bb39-dd1f9c2cd414", "grocery", "Dry Fruits & Nuts"),
    "beverages": ("7b749205-88ae-4872-85b6-95a25a3ef331", "grocery", "Beverages"),
    "milk-curd": ("9ed43ddb-e373-4110-85ca-69bb75fa1f38", "dairy-breakfast", "Milk & Curd"),
    "butter-cheese": ("3a30d1f3-4a94-4299-a2e4-407f2dddcf94", "dairy-breakfast", "Butter & Cheese"),
    "breakfast-cereals": ("decc885b-f08e-45de-9fea-9c08fbeda132", "dairy-breakfast", "Breakfast Cereals"),
    "bath-body": ("7bd61b36-0374-4945-a3a9-6fa04d3c8148", "personal-care", "Bath & Body"),
    "hair-care": ("a0537f22-6088-45f4-8b88-93cab7b22b27", "personal-care", "Hair Care"),
    "oral-care": ("fff6e56a-2ec3-45ab-b2c1-fc8bbdc2093a", "personal-care", "Oral Care"),
    "makeup": ("397d0012-9bc7-4652-8e1d-e0ad66152a6f", "beauty", "Makeup"),
    "fragrances": ("9adc5440-39b1-4d3d-b33e-4fcbd09b535d", "beauty", "Fragrances"),
    "men": ("ca58f5be-3339-4f76-ab84-ad7e7eeea366", "fashion", "Men"),
    "women": ("c1d3f772-b4d7-4867-922e-22d418c48ea9", "fashion", "Women"),
    "footwear": ("59ca89b9-423f-4308-acec-5c9f59f4898c", "fashion", "Footwear"),
    "mobiles": ("d59aa796-0caf-4424-975c-bc84373a8b73", "electronics", "Mobiles"),
    "computers": ("ff0c0e02-0907-4a36-9c6b-ea56799ca8f5", "electronics", "Computers"),
    "kitchen": ("cb33eafc-a0fd-4477-9e2d-780e2092483d", "home-kitchen", "Kitchen"),
    "home-decor": ("7a00a33f-aa09-4113-ab10-e9901957909e", "home-kitchen", "Home Decor"),
    # NEW categories
    "watches": (uid("cat", "watches"), "fashion", "Watches"),
    "bags-luggage": (uid("cat", "bags-luggage"), "fashion", "Bags & Luggage"),
    "ice-cream": (uid("cat", "ice-cream"), "dairy-breakfast", "Ice Cream & Desserts"),
    "cameras": (uid("cat", "cameras"), "electronics", "Cameras"),
    "otc-medicine": (uid("cat", "otc-medicine"), "health", "OTC Medicine"),
    "health-supplements": (uid("cat", "health-supplements"), "health", "Health Supplements"),
    "appliances": (uid("cat", "appliances"), "electronics", "Appliances"),
    "audio-accessories": (uid("cat", "audio-accessories"), "electronics", "Audio & Accessories"),
    "cleaning": (uid("cat", "cleaning"), "household", "Cleaning & Laundry"),
    "baby-essentials": (uid("cat", "baby-essentials"), "baby-care", "Baby Essentials"),
    "snacks-namkeen": (uid("cat", "snacks-namkeen"), "snacks", "Snacks & Namkeen"),
    "biscuits-chocolates": (uid("cat", "biscuits-chocolates"), "snacks", "Biscuits & Chocolates"),
    "instant-foods": (uid("cat", "instant-foods"), "snacks", "Instant & Ready Foods"),
}

# ---------------------------------------------------------------------------
# Brands: load real brands (id, slug, name) from the existing PP-B universe
# ---------------------------------------------------------------------------
_HERE = os.path.dirname(__file__)
_BRANDS_PATH = next(
    (p for p in (os.path.join(_HERE, "real_brands.json"),
                 os.path.join(_HERE, "..", "..", "real_brands.json"))
     if os.path.exists(p)),
    os.path.join(_HERE, "real_brands.json"),
)
REAL = json.load(open(_BRANDS_PATH))
BRAND = {b["slug"]: {"id": b["id"], "name": b["name"]} for b in REAL}

# Regional cooperative / mill / farmer brands (legit hyperlocal Indian brands)
COOP_MILK = sorted(s for s in BRAND if s.endswith("-cooperative-milk"))
COOP_RICE = sorted(s for s in BRAND if s.endswith("-rice-mills"))
COOP_FARM = sorted(s for s in BRAND if s.endswith("-organic-farmers"))

# NEW brands required for coverage (real Indian brands not in PP-B)
NEW_BRANDS = [
    ("realme", "Realme"), ("vivo", "Vivo"), ("oppo", "Oppo"), ("motorola", "Motorola"),
    ("nokia", "Nokia"), ("nothing", "Nothing"), ("iqoo", "iQOO"), ("poco", "Poco"),
    ("maggi", "Maggi"), ("kelloggs", "Kellogg's"), ("quaker", "Quaker"), ("saffola", "Saffola"),
    ("fortune", "Fortune"), ("dhara", "Dhara"), ("gemini", "Gemini"), ("freedom", "Freedom"),
    ("everest", "Everest"), ("mdh", "MDH"), ("catch", "Catch"), ("eastern", "Eastern"),
    ("dolo", "Dolo"), ("crocin", "Crocin"), ("calpol", "Calpol"), ("vicks", "Vicks"),
    ("volini", "Volini"), ("digene", "Digene"), ("eno", "Eno"), ("electral", "Electral"),
    ("benadryl", "Benadryl"), ("strepsils", "Strepsils"), ("moov", "Moov"), ("iodex", "Iodex"),
    ("revital", "Revital"), ("ensure", "Ensure"), ("protinex", "Protinex"), ("pediasure", "Pediasure"),
    ("johnsons-baby", "Johnson's Baby"), ("pampers", "Pampers"), ("huggies", "Huggies"),
    ("mamy-poko", "MamyPoko"), ("cerelac", "Cerelac"), ("sebamed", "Sebamed"),
    ("lays", "Lay's"), ("haldiram", "Haldiram's"), ("balaji", "Balaji"), ("uncle-chips", "Uncle Chips"),
    ("amul-choco", "Amul Chocolate"), ("cadbury", "Cadbury"), ("nestle-kitkat", "KitKat"),
    ("dairy-milk", "Dairy Milk"), ("munch", "Munch"), ("perk", "Perk"), ("five-star", "5 Star"),
    ("good-day", "Good Day"), ("marie-gold", "Marie Gold"), ("hide-seek", "Hide & Seek"),
    ("monaco", "Monaco"), ("krackjack", "Krack Jack"), ("bourbon", "Bourbon"),
    ("rajdhani", "Rajdhani"), ("daawat", "Daawat"), ("india-gate", "India Gate"),
    ("kohinoor", "Kohinoor"), ("fortune-rice", "Fortune Biryani"),
    ("tata-sampann", "Tata Sampann"), ("24-mantra", "24 Mantra Organic"),
    ("santoor", "Santoor"), ("medimix", "Medimix"), ("cinthol", "Cinthol"), ("mysore-sandal", "Mysore Sandal"),
    ("vaseline", "Vaseline"), ("boroplus", "Boroplus"), ("fair-lovely", "Glow & Lovely"),
    ("gillette", "Gillette"), ("old-spice", "Old Spice"), ("park-avenue-g", "Park Avenue Grooming"),
    ("set-wet", "Set Wet"), ("axe", "Axe"), ("wild-stone", "Wild Stone"), ("fogg", "Fogg"),
    ("engage", "Engage"), ("denver", "Denver"),
    ("tide", "Tide"), ("ghadi", "Ghadi"), ("ezee", "Ezee"), ("ujala", "Ujala"), ("rin-bar", "Rin Bar"),
    ("lizol", "Lizol"), ("colin", "Colin"), ("domex", "Domex"), ("scotch-brite", "Scotch Brite"),
    ("good-knight", "Good Knight"), ("all-out", "All Out"), ("mortein", "Mortein"), ("hit", "HIT"),
    ("real-juice", "Real Activ"), ("bisleri", "Bisleri"), ("kinley", "Kinley"), ("aquafina", "Aquafina"),
    ("tata-tea", "Tata Tea"), ("red-label", "Red Label"), ("taj-mahal", "Taj Mahal Tea"),
    ("three-roses", "3 Roses"), ("society-tea", "Society Tea"), ("wagh-bakri", "Wagh Bakri"),
    ("tetley", "Tetley"), ("lipton", "Lipton"), ("davidoff", "Davidoff Coffee"),
]

# ---------------------------------------------------------------------------
# Vendors (self-contained: auth user + profile + vendor) distributed by city
# ---------------------------------------------------------------------------
VENDOR_DEFS = [
    ("vh-chennai-mega-mart", "VendorHub Chennai Mega Mart", "Chennai", "T. Nagar", 13.0418, 80.2341),
    ("vh-coimbatore-fresh", "Coimbatore Fresh Bazaar", "Coimbatore", "RS Puram", 11.0061, 76.9499),
    ("vh-bengaluru-daily", "Bengaluru Daily Essentials", "Bengaluru", "Indiranagar", 12.9719, 77.6412),
    ("vh-madurai-supermart", "Madurai Super Mart", "Madurai", "Anna Nagar", 9.9252, 78.1198),
    ("vh-hyderabad-grocers", "Hyderabad City Grocers", "Hyderabad", "Banjara Hills", 17.4126, 78.4480),
    ("vh-mumbai-electronics", "Mumbai Electronics Hub", "Mumbai", "Andheri", 19.1197, 72.8468),
    ("vh-delhi-wellness", "Delhi Wellness & Care", "Delhi", "Connaught Place", 28.6315, 77.2167),
    ("vh-pune-lifestyle", "Pune Lifestyle Store", "Pune", "Koregaon Park", 18.5362, 73.8939),
    ("vh-kochi-bazaar", "Kochi Family Bazaar", "Kochi", "Marine Drive", 9.9785, 76.2799),
    ("vh-trichy-pantry", "Trichy Neighbourhood Pantry", "Trichy", "Srirangam", 10.8624, 78.6970),
    ("vh-salem-foods", "Salem Foods & More", "Salem", "Fairlands", 11.6791, 78.1199),
    ("vh-vizag-mart", "Vizag Coastal Mart", "Visakhapatnam", "MVP Colony", 17.7400, 83.3350),
]
VENDORS = []
for slug, name, city, area, lat, lon in VENDOR_DEFS:
    vid = uid("vendor", slug)
    oid = uid("owner", slug)  # profile id == auth user id
    VENDORS.append({
        "id": vid, "owner": oid, "slug": slug, "name": name,
        "city": city, "area": area, "lat": lat, "lon": lon,
        "email": f"owner+{slug}@vendorhub.in",
    })


def pick_vendor(slug: str):
    h = int(hashlib.md5(("v:" + slug).encode()).hexdigest(), 16)
    return VENDORS[h % len(VENDORS)]


# ===========================================================================
# CATEGORY SPECS  -> realistic product families
# Each family: dict(name, [variants], units=[(unit,[sizes])], price=(lo,hi),
#                    aliases=[regional/synonym terms], brands=[slugs] (optional override))
# ===========================================================================
def F(name, variants, units, price, aliases=None, brands=None):
    return {"name": name, "variants": variants, "units": units,
            "price": price, "aliases": aliases or [], "brands": brands}


# Realistic SKU dimensions (genuine variants real catalogs carry as distinct SKUs)
APPAREL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"]
APPAREL_COLORS = ["Black", "White", "Navy", "Maroon", "Grey", "Olive"]
WOMEN_COLORS = ["Black", "Maroon", "Teal", "Mustard", "Navy", "Pink"]
SHOE_SIZES = ["UK6", "UK7", "UK8", "UK9", "UK10", "UK11"]
SHOE_COLORS = ["Black", "White", "Brown", "Blue"]


SPEC = {}

# ---- Grocery: Atta, Rice & Dal ----
SPEC["atta-rice-dal"] = {
    "brands": ["aashirvaad", "tata", "tata-sampann", "patanjali", "24-mantra", "fortune",
               "daawat", "india-gate", "kohinoor", "rajdhani", "aachi", "sakthi"]
              + COOP_RICE + COOP_FARM,
    "families": [
        F("Whole Wheat Atta", ["Chakki Fresh", "Select", "Multigrain", ""], [("kg", [1, 5, 10])], (55, 480),
          ["atta", "wheat flour", "godhumai maavu", "gehu atta"]),
        F("Basmati Rice", ["Classic", "Premium", "Long Grain", "Biryani"], [("kg", [1, 5])], (90, 950),
          ["rice", "arisi", "chawal", "basmati"]),
        F("Sona Masoori Rice", ["Raw", "Steamed", "Premium"], [("kg", [5, 10, 25])], (250, 1600),
          ["rice", "arisi", "ponni rice"]),
        F("Idli Rice", ["Boiled", "Premium"], [("kg", [5, 10])], (260, 700), ["idli arisi", "rice"]),
        F("Toor Dal", ["Polished", "Unpolished", "Organic"], [("kg", [0.5, 1])], (90, 230),
          ["thuvaram paruppu", "arhar dal", "dal", "pulses"]),
        F("Urad Dal", ["Whole", "Split", "Gota"], [("kg", [0.5, 1])], (110, 260),
          ["ulutham paruppu", "dal", "pulses"]),
        F("Moong Dal", ["Yellow", "Whole Green", "Split"], [("kg", [0.5, 1])], (95, 220),
          ["pasi paruppu", "dal", "pulses"]),
        F("Chana Dal", ["Premium", "Organic"], [("kg", [0.5, 1])], (80, 180), ["kadalai paruppu", "dal"]),
        F("Besan", ["Fine", "Premium"], [("kg", [0.5, 1])], (60, 150), ["gram flour", "kadalai maavu"]),
        F("Maida", ["Refined", "Premium"], [("kg", [0.5, 1])], (45, 120), ["all purpose flour"]),
        F("Rava / Sooji", ["Bombay", "Fine", "Roasted"], [("kg", [0.5, 1])], (45, 130), ["semolina", "rava"]),
        F("Poha", ["Thick", "Thin"], [("g", [500]), ("kg", [1])], (40, 110), ["aval", "flattened rice"]),
    ],
}

# ---- Grocery: Oil & Ghee ----
SPEC["oil-ghee"] = {
    "brands": ["fortune", "saffola", "dhara", "gemini", "freedom", "tata", "patanjali",
               "amul", "aavin", "nandini", "aachi", "marico"] + COOP_FARM + COOP_MILK,
    "families": [
        F("Sunflower Oil", ["Refined", "Heart", "Gold"], [("L", [1, 5])], (140, 1150),
          ["oil", "ennai", "tel", "sunflower"]),
        F("Groundnut Oil", ["Filtered", "Cold Pressed"], [("L", [1, 5])], (180, 1400),
          ["oil", "kadalai ennai", "peanut oil"]),
        F("Mustard Oil", ["Kachi Ghani", "Pure"], [("L", [1, 5])], (150, 1100), ["sarson oil", "oil"]),
        F("Coconut Oil", ["Pure", "Cold Pressed", "Edible"], [("ml", [500]), ("L", [1])], (160, 650),
          ["thengai ennai", "nariyal tel", "oil"]),
        F("Gingelly / Sesame Oil", ["Wood Pressed", "Pure"], [("ml", [500]), ("L", [1])], (200, 700),
          ["nallennai", "til oil", "sesame", "oil"]),
        F("Soyabean Oil", ["Refined"], [("L", [1, 5])], (130, 900), ["oil"]),
        F("Rice Bran Oil", ["Physically Refined", "Healthy"], [("L", [1, 5])], (160, 1050), ["oil"]),
        F("Cow Ghee", ["Pure", "Premium", "A2"], [("ml", [200, 500]), ("L", [1])], (140, 1100),
          ["ghee", "nei", "clarified butter", "neyyi"]),
        F("Buffalo Ghee", ["Pure", "Premium"], [("ml", [500]), ("L", [1])], (260, 950), ["ghee", "nei"]),
        F("Vanaspati", ["Premium"], [("kg", [1])], (130, 220), ["dalda", "vanaspati"]),
    ],
}

# ---- Grocery: Masalas & Spices ----
SPEC["masalas-spices"] = {
    "brands": ["aachi", "sakthi", "everest", "mdh", "catch", "eastern", "tata-sampann",
               "patanjali", "mtr", "24-mantra"] + COOP_FARM,
    "families": [
        F("Turmeric Powder", ["Pure", "Organic"], [("g", [100, 200, 500])], (35, 220),
          ["manjal podi", "haldi", "turmeric"]),
        F("Red Chilli Powder", ["Hot", "Kashmiri", "Sambar"], [("g", [100, 200, 500])], (45, 320),
          ["milagai podi", "lal mirch", "chilli"]),
        F("Coriander Powder", ["Pure"], [("g", [100, 200, 500])], (40, 240), ["dhania", "kothamalli podi"]),
        F("Sambar Powder", ["Authentic", "Homestyle"], [("g", [100, 200, 500])], (50, 280),
          ["sambar podi", "sambar masala"]),
        F("Rasam Powder", ["Traditional"], [("g", [100, 200])], (50, 180), ["rasam podi"]),
        F("Garam Masala", ["Classic", "Premium"], [("g", [50, 100, 200])], (45, 260), ["garam masala"]),
        F("Chicken Masala", ["Spicy"], [("g", [100, 200])], (50, 190), ["chicken masala"]),
        F("Biryani Masala", ["Hyderabadi", "Special"], [("g", [50, 100])], (45, 200), ["biryani masala"]),
        F("Cumin Seeds", ["Whole"], [("g", [100, 200, 500])], (60, 380), ["jeera", "seeragam"]),
        F("Mustard Seeds", ["Whole"], [("g", [100, 200])], (30, 120), ["kadugu", "rai"]),
        F("Black Pepper", ["Whole", "Powder"], [("g", [50, 100, 200])], (90, 650), ["milagu", "kali mirch"]),
        F("Cardamom", ["Green", "Premium"], [("g", [25, 50, 100])], (180, 1400), ["elaichi", "elakkai"]),
        F("Asafoetida / Hing", ["Compounded", "Strong"], [("g", [25, 50, 100])], (60, 420), ["perungayam", "hing"]),
    ],
}

# ---- Grocery: Salt, Sugar & Jaggery ----
SPEC["salt-sugar-jaggery"] = {
    "brands": ["tata", "tata-sampann", "aashirvaad", "patanjali", "24-mantra", "freedom", "aachi"]
              + COOP_FARM,
    "families": [
        F("Iodized Salt", ["Crystal", "Vacuum Evaporated"], [("kg", [1])], (22, 45),
          ["salt", "uppu", "namak"]),
        F("Rock Salt", ["Sendha"], [("kg", [1])], (40, 90), ["sendha namak", "salt"]),
        F("Black Salt", ["Powder"], [("g", [200, 500])], (35, 110), ["kala namak", "salt"]),
        F("Sugar", ["Refined", "Sulphurless"], [("kg", [1, 5])], (45, 280), ["sugar", "sakkarai", "cheeni"]),
        F("Brown Sugar", ["Natural"], [("g", [500]), ("kg", [1])], (60, 160), ["brown sugar"]),
        F("Jaggery", ["Block", "Powder", "Organic"], [("g", [500]), ("kg", [1])], (55, 220),
          ["vellam", "gud", "jaggery"]),
        F("Palm Jaggery", ["Karupatti"], [("g", [250, 500])], (90, 280), ["karupatti", "palm jaggery"]),
        F("Honey", ["Pure", "Raw", "Organic"], [("g", [250, 500]), ("kg", [1])], (120, 650), ["honey", "thaen", "shahad"]),
    ],
}

# ---- Grocery: Dry Fruits & Nuts ----
SPEC["dry-fruits-nuts"] = {
    "brands": ["tata-sampann", "happilo" if "happilo" in BRAND else "haldirams", "haldirams",
               "patanjali", "24-mantra", "nutraj" if "nutraj" in BRAND else "haldiram"],
    "families": [
        F("Almonds", ["California", "Premium", "Roasted"], [("g", [250, 500]), ("kg", [1])], (250, 1300),
          ["badam", "almonds"]),
        F("Cashews", ["Whole", "W320", "Roasted Salted"], [("g", [250, 500]), ("kg", [1])], (280, 1500),
          ["mundhiri", "kaju", "cashew"]),
        F("Raisins", ["Indian", "Golden", "Black"], [("g", [250, 500])], (90, 420), ["kishmish", "ulla draksha"]),
        F("Pistachios", ["Roasted Salted", "Premium"], [("g", [200, 500])], (350, 1600), ["pista"]),
        F("Walnuts", ["Inshell", "Kernels"], [("g", [250, 500])], (300, 1400), ["akhrot", "walnuts"]),
        F("Dates", ["Seeded", "Pitted", "Premium"], [("g", [250, 500]), ("kg", [1])], (90, 650), ["khajur", "pERichchai"]),
        F("Mixed Dry Fruits", ["Trail Mix", "Premium"], [("g", [200, 500])], (250, 900), ["dry fruits"]),
    ],
}

# ---- Grocery / Beverages (tea, coffee, juices, soft drinks, water) ----
SPEC["beverages"] = {
    "brands": ["bru", "nescafe", "davidoff", "tata-tea", "red-label", "taj-mahal", "three-roses",
               "society-tea", "wagh-bakri", "tetley", "lipton", "real", "tropicana", "real-juice",
               "paper-boat", "frooti", "maaza", "slice", "pepsi", "coca-cola", "sprite", "thums-up",
               "mountain-dew", "limca", "fanta", "mirinda", "7up", "bisleri", "kinley", "aquafina",
               "red-bull", "monster", "gatorade", "bournvita" if "bournvita" in BRAND else "boost",
               "horlicks", "boost", "complan"],
    "families": [
        F("Instant Coffee", ["Gold", "Classic", "Strong", "Filter"], [("g", [50, 100, 200])], (90, 650),
          ["coffee", "kaapi", "kapi", "filter coffee"], brands=["bru", "nescafe", "davidoff"]),
        F("Filter Coffee Powder", ["Pure", "Peaberry", "80:20"], [("g", [200, 500])], (120, 600),
          ["filter coffee", "kaapi podi", "coffee"], brands=["bru", "nescafe"]),
        F("Tea Powder", ["Premium", "Strong", "Gold", "Leaf"], [("g", [250, 500]), ("kg", [1])], (90, 720),
          ["tea", "chai", "thaneer"], brands=["tata-tea", "red-label", "taj-mahal", "three-roses",
                                              "society-tea", "wagh-bakri", "tetley", "lipton"]),
        F("Green Tea", ["Classic", "Lemon", "Tulsi"], [("g", [100]), ("pc", [25])], (110, 420),
          ["green tea"], brands=["lipton", "tetley", "tata-tea"]),
        F("Health Drink", ["Original", "Chocolate", "Kesar Badam"], [("g", [200, 500]), ("kg", [1])], (110, 620),
          ["malt drink", "health drink", "energy drink"], brands=["horlicks", "boost", "complan"]),
        F("Fruit Juice", ["Mixed Fruit", "Mango", "Orange", "Apple", "Litchi"], [("ml", [200, 1000])], (20, 130),
          ["juice", "fruit juice"], brands=["real", "tropicana", "real-juice", "paper-boat",
                                            "frooti", "maaza", "slice"]),
        F("Soft Drink", ["Original", "Can"], [("ml", [250, 750]), ("L", [1.25, 2])], (20, 100),
          ["cola", "soft drink", "cooldrink"], brands=["pepsi", "coca-cola", "sprite", "thums-up",
                                                       "mountain-dew", "limca", "fanta", "mirinda", "7up"]),
        F("Packaged Water", ["Mineral"], [("ml", [500]), ("L", [1, 2])], (10, 30),
          ["water", "drinking water"], brands=["bisleri", "kinley", "aquafina"]),
        F("Energy Drink", ["Original", "Sugar Free"], [("ml", [250, 350])], (50, 130),
          ["energy drink"], brands=["red-bull", "monster", "gatorade"]),
    ],
}

# ---- Dairy: Milk & Curd ----
SPEC["milk-curd"] = {
    "brands": ["amul", "aavin", "nandini", "mother-dairy", "milma", "vijaya", "verka", "saras",
               "heritage"] + COOP_MILK,
    "families": [
        F("Toned Milk", ["Fresh", "Long Life", "Standardised"], [("ml", [200, 500]), ("L", [1])], (24, 80),
          ["milk", "paal", "doodh"]),
        F("Full Cream Milk", ["Rich", "Premium"], [("ml", [500]), ("L", [1])], (30, 90), ["milk", "paal", "doodh"]),
        F("Double Toned Milk", ["Slim", "Healthy"], [("ml", [500]), ("L", [1])], (24, 74), ["milk", "paal"]),
        F("Curd", ["Fresh", "Set", "Probiotic"], [("g", [200, 400]), ("kg", [1])], (25, 95),
          ["curd", "thayir", "dahi", "yogurt"]),
        F("Buttermilk", ["Spiced", "Plain", "Masala"], [("ml", [200, 500])], (10, 40),
          ["buttermilk", "moru", "chaas"]),
        F("Lassi", ["Sweet", "Mango", "Plain"], [("ml", [200, 500])], (15, 55), ["lassi"]),
        F("Paneer", ["Fresh", "Malai"], [("g", [200, 500])], (75, 320), ["paneer", "cottage cheese"]),
        F("Flavoured Milk", ["Badam", "Chocolate", "Rose"], [("ml", [180, 200])], (20, 55), ["flavoured milk"]),
    ],
}

# ---- Dairy: Butter & Cheese ----
SPEC["butter-cheese"] = {
    "brands": ["amul", "aavin", "nandini", "mother-dairy", "britannia", "milma", "heritage"],
    "families": [
        F("Salted Butter", ["", "Table"], [("g", [100, 200, 500])], (50, 280),
          ["butter", "vennai", "makhan"]),
        F("Unsalted Butter", ["White", "Cooking"], [("g", [100, 500])], (55, 300), ["butter", "vennai"]),
        F("Cheese Slices", ["", "Cheddar"], [("g", [100, 200])], (75, 250), ["cheese"]),
        F("Cheese Block", ["Processed", "Cheddar"], [("g", [200, 400])], (110, 420), ["cheese"]),
        F("Cheese Spread", ["Plain", "Pepper", "Garlic"], [("g", [100, 200])], (60, 220), ["cheese spread"]),
        F("Mozzarella Cheese", ["Pizza", "Shredded"], [("g", [200])], (140, 360), ["mozzarella", "cheese"]),
    ],
}

# ---- Dairy: Breakfast Cereals ----
SPEC["breakfast-cereals"] = {
    "brands": ["kelloggs", "quaker", "saffola", "bagrrys" if "bagrrys" in BRAND else "kelloggs",
               "patanjali", "mtr"],
    "families": [
        F("Corn Flakes", ["Original", "Honey", "Real Almond"], [("g", [250, 475, 875])], (90, 420),
          ["corn flakes", "cereal", "breakfast"]),
        F("Oats", ["Rolled", "Masala", "Instant"], [("g", [400, 1000])], (60, 280),
          ["oats", "breakfast"]),
        F("Muesli", ["Fruit & Nut", "Crunchy", "No Added Sugar"], [("g", [400, 750])], (180, 560),
          ["muesli", "breakfast"]),
        F("Choco Cereal", ["Chocos", "Kids"], [("g", [250, 700])], (110, 380), ["chocos", "cereal"]),
        F("Idli/Dosa Mix", ["Instant"], [("g", [200, 500])], (45, 160), ["idli mix", "dosa mix", "breakfast"]),
        F("Upma Mix", ["Rava", "Instant"], [("g", [200, 500])], (45, 150), ["upma mix", "breakfast"]),
    ],
}

# ---- Personal Care: Bath & Body ----
SPEC["bath-body"] = {
    "brands": ["dove", "lux", "lifebuoy", "pears", "santoor", "medimix", "cinthol", "mysore-sandal",
               "dettol", "vaseline", "nivea", "boroplus", "fair-lovely", "ponds", "himalaya",
               "patanjali", "mamaearth", "vicco"],
    "families": [
        F("Bathing Soap", ["", "Sandal", "Rose", "Lime", "Glycerine"], [("g", [100, 125]), ("pc", [3, 4])], (25, 220),
          ["soap", "sabun", "bath soap"]),
        F("Body Wash", ["Moisturising", "Refreshing"], [("ml", [200, 250])], (90, 380), ["body wash", "shower gel"]),
        F("Hand Wash", ["Liquid", "Refill"], [("ml", [200, 750])], (45, 220), ["hand wash", "handwash"]),
        F("Body Lotion", ["Nourishing", "Cocoa", "Aloe"], [("ml", [100, 200, 400])], (80, 420),
          ["lotion", "moisturiser", "body lotion"]),
        F("Talcum Powder", ["Cool", "Sandal"], [("g", [100, 300])], (45, 230), ["talc", "powder"]),
        F("Face Wash", ["Neem", "Charcoal", "Aloe", "Oil Clear"], [("g", [50, 100])], (75, 350),
          ["face wash", "facewash"]),
        F("Cold Cream", ["Winter", "Moisturising"], [("g", [30, 60, 100])], (40, 180), ["cold cream", "cream"]),
    ],
}

# ---- Personal Care: Hair Care ----
SPEC["hair-care"] = {
    "brands": ["clinic-plus", "dove", "pantene", "head-shoulders", "garnier", "loreal", "himalaya",
               "patanjali", "marico", "dabur", "biotique", "mamaearth", "wow-skin-science"],
    "families": [
        F("Shampoo", ["Anti-Dandruff", "Smooth & Silky", "Total Damage Care", "Black"],
          [("ml", [80, 180, 340, 650])], (40, 480), ["shampoo"]),
        F("Conditioner", ["Smooth", "Repair"], [("ml", [180, 340])], (90, 420), ["conditioner"]),
        F("Hair Oil", ["Coconut", "Amla", "Almond", "Bhringraj"], [("ml", [100, 200, 500])], (45, 340),
          ["hair oil", "ennai", "tel"]),
        F("Hair Serum", ["Smooth", "Frizz Control"], [("ml", [50, 100])], (120, 420), ["hair serum", "serum"]),
        F("Hair Colour", ["Natural Black", "Brown", "Burgundy"], [("g", [20]), ("ml", [70])], (40, 320),
          ["hair colour", "hair dye"]),
    ],
}

# ---- Personal Care: Oral Care ----
SPEC["oral-care"] = {
    "brands": ["colgate", "closeup", "oral-b", "pepsodent" if "pepsodent" in BRAND else "colgate",
               "dabur", "patanjali", "himalaya", "sensodyne" if "sensodyne" in BRAND else "colgate"],
    "families": [
        F("Toothpaste", ["Strong Teeth", "Total", "Whitening", "Salt", "Herbal"], [("g", [100, 150, 200])], (45, 240),
          ["toothpaste", "paste", "pal podi"]),
        F("Toothbrush", ["Soft", "Medium", "Sensitive"], [("pc", [1, 3, 4])], (20, 180), ["toothbrush", "brush"]),
        F("Mouthwash", ["Fresh Mint", "Antiseptic"], [("ml", [250, 500])], (90, 320), ["mouthwash"]),
        F("Tooth Powder", ["Red", "Herbal"], [("g", [50, 100, 200])], (35, 150), ["tooth powder", "pal podi"]),
    ],
}

# ---- Beauty: Makeup ----
SPEC["makeup"] = {
    "brands": ["lakme", "maybelline", "loreal", "revlon", "colorbar", "mamaearth", "nivea", "ponds",
               "garnier"],
    "families": [
        F("Lipstick", ["Matte", "Creme", "Long Wear"], [("pc", [1])], (180, 1200), ["lipstick"]),
        F("Compact Powder", ["Matte", "Radiance"], [("g", [9, 15])], (160, 850), ["compact", "face powder"]),
        F("Kajal", ["Intense Black", "Smudge Proof"], [("g", [0.35]), ("pc", [1])], (90, 450), ["kajal", "kohl"]),
        F("Foundation", ["Matte", "Dewy", "Liquid"], [("ml", [18, 30])], (250, 1500), ["foundation"]),
        F("Eyeliner", ["Black", "Waterproof"], [("ml", [3]), ("pc", [1])], (120, 700), ["eyeliner"]),
        F("Nail Polish", ["Glossy", "Matte"], [("ml", [6, 9])], (80, 450), ["nail polish", "nail paint"]),
    ],
}

# ---- Beauty: Fragrances ----
SPEC["fragrances"] = {
    "brands": ["fogg", "engage", "denver", "axe", "wild-stone", "set-wet", "park-avenue-g", "old-spice",
               "nivea", "davidoff" if "davidoff" in BRAND else "fogg"],
    "families": [
        F("Deodorant Spray", ["No Gas", "Body Spray", "Long Lasting"], [("ml", [120, 150, 165])], (120, 380),
          ["deodorant", "deo", "body spray"]),
        F("Perfume", ["Eau de Parfum", "Pocket Perfume"], [("ml", [18, 50, 100])], (150, 1500), ["perfume", "attar"]),
        F("Roll On", ["Fresh", "Cool"], [("ml", [40, 50])], (90, 260), ["roll on", "deodorant"]),
    ],
}

# ---- Fashion: Men ----
SPEC["men"] = {
    "brands": ["peter-england", "louis-philippe", "van-heusen", "allen-solly", "raymond", "park-avenue",
               "pepe-jeans", "wrangler", "spykar", "mufti", "killer", "flying-machine", "jockey",
               "puma", "nike", "adidas", "reebok", "united-colors-of-benetton", "zara", "hnm",
               "manyavar", "fabindia", "colorplus", "parx", "oxemberg", "monte-carlo", "siyarams",
               "duke", "raymond-b12e"],
    "families": [
        F("Formal Shirt", ["Slim Fit", "Regular Fit", "Checked", "Solid"], [("pc", [1])], (699, 2999), ["shirt"]),
        F("Casual Shirt", ["Printed", "Denim", "Linen"], [("pc", [1])], (599, 2499), ["shirt", "casual"]),
        F("Round Neck T-Shirt", ["Solid", "Printed", "Half Sleeve"], [("pc", [1])], (299, 1499), ["t-shirt", "tshirt", "tee"]),
        F("Polo T-Shirt", ["Solid", "Striped"], [("pc", [1])], (499, 1999), ["polo", "t-shirt"]),
        F("Slim Fit Jeans", ["Blue", "Black", "Stretchable"], [("pc", [1])], (899, 3499), ["jeans", "denim"]),
        F("Chinos", ["Slim", "Regular"], [("pc", [1])], (799, 2499), ["trousers", "chinos"]),
        F("Formal Trousers", ["Slim", "Regular"], [("pc", [1])], (799, 2999), ["trousers", "pants"]),
        F("Track Pants", ["Jogger", "Regular"], [("pc", [1])], (499, 1799), ["track pants", "joggers"]),
        F("Kurta", ["Cotton", "Festive"], [("pc", [1])], (699, 2999), ["kurta", "ethnic"]),
        F("Innerwear Vest", ["Pack of 3"], [("pc", [3])], (299, 799), ["vest", "innerwear", "banian"]),
    ],
}

# ---- Fashion: Women ----
SPEC["women"] = {
    "brands": ["biba", "w", "aurelia", "fabindia", "zivame", "enamor", "jockey", "puma", "nike",
               "adidas", "zara", "hnm", "marks-spencer", "van-heusen-f0b0", "allen-solly",
               "united-colors-of-benetton", "pepe-jeans", "triumph", "monte-carlo"],
    "families": [
        F("Anarkali Kurta", ["Printed", "Solid", "Festive"], [("pc", [1])], (799, 3499), ["kurti", "kurta", "ethnic"]),
        F("Straight Kurta", ["Cotton", "Printed"], [("pc", [1])], (599, 2499), ["kurti", "kurta"]),
        F("Kurta Set", ["With Palazzo", "With Dupatta"], [("pc", [1])], (1199, 4999), ["kurta set", "suit"]),
        F("Leggings", ["Ankle Length", "Churidar"], [("pc", [1])], (299, 999), ["leggings"]),
        F("Saree", ["Cotton", "Silk Blend", "Georgette"], [("pc", [1])], (899, 5999), ["saree", "sari"]),
        F("Round Neck T-Shirt", ["Solid", "Printed"], [("pc", [1])], (299, 1299), ["t-shirt", "top"]),
        F("Skinny Jeans", ["Blue", "Black", "High Rise"], [("pc", [1])], (899, 2999), ["jeans", "denim"]),
        F("A-Line Dress", ["Printed", "Solid"], [("pc", [1])], (799, 2999), ["dress", "frock"]),
        F("Sports Bra", ["Medium Impact", "High Impact"], [("pc", [1])], (399, 1499), ["sports bra", "innerwear"]),
    ],
}

# ---- Fashion: Footwear ----
SPEC["footwear"] = {
    "brands": ["bata", "liberty", "metro", "mochi", "puma", "nike", "adidas", "reebok", "woodland"
               if "woodland" in BRAND else "bata", "sparx" if "sparx" in BRAND else "liberty"],
    "families": [
        F("Running Shoes", ["Mesh", "Lightweight"], [("pc", [1])], (999, 5999), ["shoes", "running shoes", "sneakers"]),
        F("Sneakers", ["Casual", "Lace Up"], [("pc", [1])], (799, 4999), ["sneakers", "shoes"]),
        F("Formal Shoes", ["Derby", "Oxford", "Slip On"], [("pc", [1])], (999, 4499), ["formal shoes", "shoes"]),
        F("Sports Sandals", ["Floater", "Adjustable"], [("pc", [1])], (499, 2499), ["sandals", "floaters"]),
        F("Flip Flops", ["Slipper", "Casual"], [("pc", [1])], (199, 999), ["slippers", "flip flops", "chappal"]),
        F("Loafers", ["Suede", "Leather"], [("pc", [1])], (899, 3499), ["loafers", "shoes"]),
        F("Ballerinas", ["Casual", "Bellies"], [("pc", [1])], (399, 1799), ["bellies", "flats", "ballerinas"]),
    ],
}

# ---- Electronics: Mobiles (curated brand->models for realism) ----
MOBILE_MODELS = {
    "samsung": ["Galaxy S24 Ultra", "Galaxy S24", "Galaxy A55", "Galaxy A35", "Galaxy A15",
                "Galaxy M35", "Galaxy M15", "Galaxy F15", "Galaxy Z Flip 6"],
    "apple": ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15", "iPhone 14",
              "iPhone 13", "iPhone SE"],
    "xiaomi": ["Redmi Note 13 Pro", "Redmi Note 13", "Redmi 13C", "Redmi 12", "Xiaomi 14",
               "Poco X6 Pro"],
    "realme": ["Realme 12 Pro+", "Realme 12 Pro", "Realme 12", "Realme Narzo 70", "Realme C67",
               "Realme C55"],
    "oneplus": ["OnePlus 12", "OnePlus 12R", "OnePlus Nord CE4", "OnePlus Nord 4", "OnePlus Nord CE3 Lite"],
    "vivo": ["Vivo V30 Pro", "Vivo V30", "Vivo Y200", "Vivo T3", "Vivo Y28"],
    "oppo": ["Oppo Reno 12 Pro", "Oppo Reno 12", "Oppo F27 Pro", "Oppo A79", "Oppo A59"],
    "motorola": ["Moto Edge 50 Pro", "Moto Edge 50 Fusion", "Moto G84", "Moto G64", "Moto G34"],
    "iqoo": ["iQOO 12", "iQOO Neo 9 Pro", "iQOO Z9", "iQOO Z7"],
    "poco": ["Poco X6 Pro", "Poco X6", "Poco M6 Pro", "Poco C65"],
    "nothing": ["Nothing Phone 2a", "Nothing Phone 2", "CMF Phone 1"],
    "nokia": ["Nokia G42", "Nokia C32", "Nokia 105"],
}
MOBILE_STORAGE = ["6GB/128GB", "8GB/128GB", "8GB/256GB", "12GB/256GB"]
MOBILE_COLORS = ["Midnight Black", "Ocean Blue", "Titanium Grey", "Pearl White"]

# ---- Electronics: Computers (laptops) ----
LAPTOP_MODELS = {
    "hp": ["HP Pavilion 15", "HP Victus 15", "HP Envy 14", "HP 15s", "HP Omen 16", "HP ProBook 450"],
    "dell": ["Dell Inspiron 15", "Dell XPS 13", "Dell G15 Gaming", "Dell Latitude 3540", "Dell Vostro 14"],
    "lenovo": ["Lenovo IdeaPad Slim 3", "Lenovo Legion 5", "Lenovo ThinkPad E14", "Lenovo Yoga Slim 6",
               "Lenovo LOQ 15"],
    "asus": ["Asus VivoBook 15", "Asus ROG Strix G16", "Asus Zenbook 14", "Asus TUF Gaming F15",
             "Asus ExpertBook B1"],
    "apple": ["MacBook Air M3 13", "MacBook Air M2 13", "MacBook Pro 14 M3", "MacBook Pro 16 M3"],
}
LAPTOP_CONFIG = ["i3 8GB 512GB SSD", "i5 16GB 512GB SSD", "i7 16GB 1TB SSD", "Ryzen 5 16GB 512GB SSD"]

# ---- Electronics: Appliances ----
SPEC["appliances"] = {
    "brands": ["samsung", "lg", "whirlpool", "haier", "godrej-65a7", "voltas", "blue-star", "havells",
               "bajaj", "usha", "crompton", "philips", "panasonic", "sony"],
    "families": [
        F("LED TV", ['32" HD', '43" Full HD', '50" 4K', '55" 4K'], [("pc", [1])], (12999, 79999),
          ["tv", "television", "led tv", "smart tv"]),
        F("Refrigerator", ["190L Single Door", "253L Double Door", "340L Frost Free"], [("pc", [1])], (12999, 54999),
          ["fridge", "refrigerator"]),
        F("Washing Machine", ["6.5kg Top Load", "7kg Front Load", "8kg Fully Automatic"], [("pc", [1])], (10999, 42999),
          ["washing machine"]),
        F("Air Conditioner", ["1.0 Ton 3 Star", "1.5 Ton 3 Star", "1.5 Ton 5 Star Inverter"], [("pc", [1])], (26999, 55999),
          ["ac", "air conditioner", "split ac"]),
        F("Microwave Oven", ["20L Solo", "23L Convection", "28L Convection"], [("pc", [1])], (5499, 18999),
          ["microwave", "oven"]),
        F("Mixer Grinder", ["500W", "750W 3 Jar"], [("pc", [1])], (1999, 6999), ["mixer", "grinder", "mixie"]),
        F("Ceiling Fan", ["1200mm", "Energy Saver", "BLDC"], [("pc", [1])], (1299, 4999), ["fan", "ceiling fan"]),
        F("Water Heater", ["15L Storage", "3L Instant", "25L Storage"], [("pc", [1])], (2999, 12999),
          ["geyser", "water heater"]),
        F("Iron Box", ["Dry", "Steam"], [("pc", [1])], (599, 2999), ["iron", "iron box"]),
    ],
}

# ---- Electronics: Audio & Accessories ----
SPEC["audio-accessories"] = {
    "brands": ["boat", "noise", "jbl", "sony", "sennheiser", "bose", "logitech", "razer", "corsair",
               "sandisk", "kingston", "western-digital", "seagate", "tp-link", "d-link", "syska",
               "philips"],
    "families": [
        F("Wireless Earbuds", ["TWS", "ANC", "Gaming"], [("pc", [1])], (799, 12999),
          ["earbuds", "tws", "earphones", "airdopes"], brands=["boat", "noise", "jbl", "sony", "bose"]),
        F("Bluetooth Headphones", ["Over Ear", "On Ear", "ANC"], [("pc", [1])], (999, 24999),
          ["headphones", "headset"], brands=["boat", "noise", "jbl", "sony", "sennheiser", "bose"]),
        F("Neckband Earphones", ["Bassheads", "Magnetic"], [("pc", [1])], (599, 3999),
          ["neckband", "earphones"], brands=["boat", "noise", "jbl"]),
        F("Bluetooth Speaker", ["Portable", "Party"], [("pc", [1])], (999, 14999),
          ["speaker", "bluetooth speaker"], brands=["boat", "jbl", "sony", "bose"]),
        F("Smartwatch", ["Bluetooth Calling", "AMOLED", "Fitness"], [("pc", [1])], (1299, 9999),
          ["smartwatch", "watch"], brands=["boat", "noise"]),
        F("Power Bank", ["10000mAh", "20000mAh", "Fast Charge"], [("pc", [1])], (799, 3499),
          ["power bank", "powerbank"], brands=["syska", "philips"]),
        F("Pendrive", ["32GB", "64GB", "128GB", "USB 3.0"], [("pc", [1])], (299, 1499),
          ["pendrive", "usb", "flash drive"], brands=["sandisk", "kingston"]),
        F("MicroSD Card", ["64GB", "128GB", "256GB"], [("pc", [1])], (499, 2499),
          ["memory card", "sd card"], brands=["sandisk", "kingston"]),
        F("External Hard Drive", ["1TB", "2TB"], [("pc", [1])], (3999, 7999),
          ["hard disk", "hdd", "external drive"], brands=["western-digital", "seagate"]),
        F("Wireless Mouse", ["Optical", "Silent"], [("pc", [1])], (399, 2999),
          ["mouse"], brands=["logitech", "razer"]),
        F("Mechanical Keyboard", ["RGB", "TKL"], [("pc", [1])], (1499, 8999),
          ["keyboard"], brands=["logitech", "razer", "corsair"]),
        F("WiFi Router", ["AC1200", "Dual Band", "Mesh"], [("pc", [1])], (1299, 5999),
          ["router", "wifi router"], brands=["tp-link", "d-link"]),
    ],
}

# ---- Home & Kitchen: Kitchen ----
SPEC["kitchen"] = {
    "brands": ["prestige", "hawkins", "butterfly", "preethi", "pigeon", "wonderchef", "cello", "milton",
               "borosil", "bajaj", "philips", "usha"],
    "families": [
        F("Pressure Cooker", ["3L", "5L", "Induction Base"], [("pc", [1])], (899, 3999), ["cooker", "pressure cooker"]),
        F("Non-Stick Tawa", ["Dosa", "Roti", "28cm"], [("pc", [1])], (399, 1999), ["tawa", "dosa pan"]),
        F("Non-Stick Kadai", ["With Lid", "Deep"], [("pc", [1])], (599, 2499), ["kadai", "wok"]),
        F("Stainless Steel Bottle", ["1L", "750ml", "Vacuum"], [("pc", [1])], (299, 1499), ["water bottle", "bottle"]),
        F("Casserole Set", ["3 Pcs", "Insulated"], [("pc", [1])], (599, 2499), ["casserole", "hot pot"]),
        F("Mixer Jar Set", ["3 Jar", "Stainless"], [("pc", [1])], (499, 1999), ["mixer jar"]),
        F("Gas Stove", ["2 Burner", "3 Burner", "Glass Top"], [("pc", [1])], (1499, 5999), ["gas stove", "stove"]),
        F("Dinner Set", ["18 Pcs", "Melamine"], [("pc", [1])], (799, 3499), ["dinner set", "plates"]),
        F("Electric Kettle", ["1.5L", "1.8L"], [("pc", [1])], (599, 2499), ["kettle", "electric kettle"]),
    ],
}

# ---- Home & Kitchen: Home Decor ----
SPEC["home-decor"] = {
    "brands": ["philips", "havells", "wonderchef", "cello", "milton", "borosil", "bajaj"],
    "families": [
        F("LED Bulb", ["9W", "12W", "Cool Day Light"], [("pc", [1, 4])], (79, 599), ["bulb", "led bulb", "light"]),
        F("LED Batten", ["20W", "Tube Light"], [("pc", [1])], (199, 799), ["tube light", "batten"]),
        F("Wall Clock", ["Analog", "Silent Sweep"], [("pc", [1])], (199, 1499), ["clock", "wall clock"]),
        F("Photo Frame", ["Set of 3", "Collage"], [("pc", [1])], (299, 1499), ["photo frame", "frame"]),
        F("Table Lamp", ["LED", "Study"], [("pc", [1])], (399, 1999), ["lamp", "table lamp"]),
        F("Door Mat", ["Anti-Slip", "Cotton"], [("pc", [1])], (149, 799), ["door mat", "mat"]),
        F("Curtain Set", ["Door", "Window", "Blackout"], [("pc", [2])], (499, 2499), ["curtains", "curtain"]),
    ],
}

# ---- Health: OTC Medicine ----
SPEC["otc-medicine"] = {
    "brands": ["dolo", "crocin", "calpol", "vicks", "volini", "digene", "eno", "electral", "benadryl",
               "strepsils", "moov", "iodex", "dettol", "himalaya", "dabur", "zandu", "amrutanjan"],
    "families": [
        F("Paracetamol Tablets", ["500mg", "650mg"], [("pc", [10, 15])], (15, 60),
          ["paracetamol", "fever", "pain relief", "crocin", "dolo"], brands=["dolo", "crocin", "calpol"]),
        F("Cold & Cough Syrup", ["Dry Cough", "Wet Cough"], [("ml", [100, 200])], (60, 180),
          ["cough syrup", "cold", "cough"], brands=["benadryl", "vicks", "dabur"]),
        F("Pain Relief Spray", ["Fast Relief", "Active"], [("g", [35, 55])], (90, 320),
          ["pain spray", "pain relief", "muscle pain"], brands=["volini", "moov"]),
        F("Pain Balm", ["Strong", "Cool"], [("g", [8, 25, 50])], (35, 180),
          ["balm", "pain balm", "headache"], brands=["amrutanjan", "vicks", "zandu", "iodex", "moov"]),
        F("Antacid", ["Mint", "Orange", "Gel"], [("pc", [10]), ("ml", [170])], (40, 160),
          ["antacid", "acidity", "gas"], brands=["digene", "eno"]),
        F("ORS Powder", ["Orange", "Lemon"], [("g", [21]), ("pc", [1])], (20, 80),
          ["ors", "electrolyte", "dehydration"], brands=["electral"]),
        F("Antiseptic Liquid", ["Original", "First Aid"], [("ml", [100, 250, 550])], (60, 280),
          ["antiseptic", "dettol", "wound care"], brands=["dettol"]),
        F("Lozenges", ["Honey Lemon", "Orange", "Menthol"], [("pc", [10])], (30, 90),
          ["lozenges", "sore throat", "throat"], brands=["strepsils", "vicks"]),
        F("Vapour Rub", ["Original"], [("g", [25, 50])], (60, 200),
          ["vapour rub", "cold", "congestion"], brands=["vicks"]),
    ],
}

# ---- Health: Supplements ----
SPEC["health-supplements"] = {
    "brands": ["revital", "ensure", "protinex", "pediasure", "horlicks", "boost", "complan", "himalaya",
               "dabur", "patanjali", "zandu", "wow-skin-science", "mamaearth"],
    "families": [
        F("Protein Powder", ["Chocolate", "Vanilla", "Unflavoured"], [("g", [200, 400]), ("kg", [1])], (320, 1600),
          ["protein", "whey", "supplement"], brands=["protinex", "ensure"]),
        F("Multivitamin Capsules", ["Daily", "Men", "Women"], [("pc", [30, 60])], (180, 650),
          ["multivitamin", "vitamins", "supplement"], brands=["revital", "himalaya"]),
        F("Health Drink", ["Original", "Chocolate", "Kesar"], [("g", [400]), ("kg", [1])], (180, 620),
          ["health drink", "malt"], brands=["horlicks", "boost", "complan", "pediasure"]),
        F("Chyawanprash", ["Classic", "Sugar Free"], [("g", [500]), ("kg", [1])], (180, 520),
          ["chyawanprash", "immunity"], brands=["dabur", "patanjali", "zandu"]),
        F("Vitamin C Tablets", ["Orange", "Effervescent"], [("pc", [10, 20])], (90, 320),
          ["vitamin c", "immunity"], brands=["revital", "himalaya"]),
    ],
}

# ---- Household: Cleaning & Laundry ----
SPEC["cleaning"] = {
    "brands": ["surf-excel", "ariel", "tide", "ghadi", "wheel", "rin", "rin-bar", "comfort", "ezee",
               "ujala", "vim", "harpic", "lizol", "colin", "domex", "scotch-brite", "good-knight",
               "all-out", "mortein", "hit"],
    "families": [
        F("Detergent Powder", ["Top Load", "Front Load", "Matic"], [("kg", [1, 2, 4])], (60, 520),
          ["detergent", "washing powder", "soap powder"], brands=["surf-excel", "ariel", "tide", "ghadi", "wheel", "rin"]),
        F("Detergent Liquid", ["Matic", "Front Load"], [("ml", [500]), ("L", [1, 2])], (110, 480),
          ["liquid detergent", "detergent"], brands=["surf-excel", "ariel", "tide"]),
        F("Detergent Bar", ["", "Pack of 3"], [("g", [200, 250]), ("pc", [3])], (20, 90),
          ["detergent bar", "washing soap"], brands=["rin-bar", "wheel", "ghadi"]),
        F("Fabric Conditioner", ["Lily Fresh", "Morning Fresh"], [("ml", [200, 800]), ("L", [1])], (90, 320),
          ["fabric conditioner", "softener"], brands=["comfort"]),
        F("Dishwash Gel", ["Lemon", "Anti-Smell"], [("ml", [500]), ("L", [1])], (90, 280),
          ["dishwash", "dish gel"], brands=["vim"]),
        F("Dishwash Bar", ["", "Pack of 3"], [("g", [200, 300]), ("pc", [3])], (10, 60),
          ["dishwash bar", "vim bar"], brands=["vim"]),
        F("Toilet Cleaner", ["Original", "Power Plus"], [("ml", [500, 1000])], (75, 260),
          ["toilet cleaner", "harpic"], brands=["harpic", "domex"]),
        F("Floor Cleaner", ["Citrus", "Floral", "Lemon"], [("ml", [500]), ("L", [1, 2])], (90, 320),
          ["floor cleaner", "lizol", "phenyl"], brands=["lizol", "domex"]),
        F("Glass Cleaner", ["Regular", "Refill"], [("ml", [250, 500])], (60, 180),
          ["glass cleaner", "colin"], brands=["colin"]),
        F("Mosquito Repellent", ["Liquid Vapouriser", "Coil", "Spray"], [("ml", [45, 400]), ("pc", [10])], (45, 280),
          ["mosquito", "repellent", "coil"], brands=["good-knight", "all-out", "mortein", "hit"]),
        F("Scrub Pad", ["Pack of 3", "Sponge Wipe"], [("pc", [3, 5])], (30, 120),
          ["scrub pad", "scrubber"], brands=["scotch-brite"]),
    ],
}

# ---- Baby Care ----
SPEC["baby-essentials"] = {
    "brands": ["johnsons-baby", "pampers", "huggies", "mamy-poko", "cerelac", "himalaya", "sebamed",
               "mamaearth", "pediasure"],
    "families": [
        F("Baby Diapers", ["Small", "Medium", "Large", "XL"], [("pc", [24, 48, 76])], (199, 1299),
          ["diapers", "diaper", "nappy"], brands=["pampers", "huggies", "mamy-poko"]),
        F("Baby Wipes", ["Fragrance Free", "Aloe"], [("pc", [72, 80])], (99, 320),
          ["baby wipes", "wipes"], brands=["pampers", "huggies", "johnsons-baby", "himalaya"]),
        F("Baby Soap", ["Moisturising"], [("g", [75, 100])], (45, 180),
          ["baby soap", "soap"], brands=["johnsons-baby", "himalaya", "sebamed", "mamaearth"]),
        F("Baby Lotion", ["Moisturising"], [("ml", [100, 200])], (90, 320),
          ["baby lotion", "lotion"], brands=["johnsons-baby", "himalaya", "sebamed"]),
        F("Baby Shampoo", ["No More Tears", "Gentle"], [("ml", [100, 200])], (90, 320),
          ["baby shampoo", "shampoo"], brands=["johnsons-baby", "himalaya", "sebamed"]),
        F("Baby Cereal", ["Wheat Apple", "Rice", "Mixed Fruit"], [("g", [300])], (160, 360),
          ["baby food", "cerelac", "cereal"], brands=["cerelac"]),
        F("Baby Powder", ["Soothing"], [("g", [100, 200])], (60, 240),
          ["baby powder", "powder"], brands=["johnsons-baby", "himalaya"]),
    ],
}

# ---- Snacks: Namkeen & Chips ----
SPEC["snacks-namkeen"] = {
    "brands": ["haldirams", "haldiram", "balaji", "lays", "kurkure", "bingo", "uncle-chips", "too-yumm",
               "act-ii", "cornitos", "doritos", "pringles", "bikanervala", "aachi"],
    "families": [
        F("Potato Chips", ["Classic Salted", "Magic Masala", "Cream & Onion", "Tomato"], [("g", [52, 90, 150])], (20, 80),
          ["chips", "wafers", "potato chips"], brands=["lays", "uncle-chips", "bingo", "pringles", "balaji"]),
        F("Namkeen Mixture", ["Aloo Bhujia", "Bhujia Sev", "Navratan", "South Special"], [("g", [200, 400, 1000])], (45, 220),
          ["mixture", "namkeen", "bhujia"], brands=["haldirams", "haldiram", "balaji", "bikanervala"]),
        F("Cheese Balls / Puffs", ["Cheese", "Masala"], [("g", [60, 90])], (20, 70),
          ["puffs", "cheese balls", "snacks"], brands=["kurkure", "bingo", "cornitos"]),
        F("Popcorn", ["Butter", "Cheese", "Microwave"], [("g", [60, 90])], (25, 90),
          ["popcorn"], brands=["act-ii"]),
        F("Nachos", ["Cheese", "Salsa"], [("g", [60, 150])], (40, 160),
          ["nachos", "chips"], brands=["cornitos", "doritos"]),
        F("Roasted Snacks", ["Multigrain", "Baked"], [("g", [60, 90])], (25, 80),
          ["roasted snacks", "baked chips"], brands=["too-yumm"]),
    ],
}

# ---- Snacks: Biscuits & Chocolates ----
SPEC["biscuits-chocolates"] = {
    "brands": ["parle", "britannia", "sunfeast", "good-day", "marie-gold", "hide-seek", "monaco",
               "krackjack", "bourbon", "cadbury", "dairy-milk", "nestle-kitkat", "munch", "perk",
               "five-star", "amul-choco", "nestle"],
    "families": [
        F("Glucose Biscuits", ["Original"], [("g", [60, 120, 250])], (10, 45),
          ["biscuit", "glucose", "parle g"], brands=["parle", "britannia"]),
        F("Cream Biscuits", ["Chocolate", "Orange", "Bourbon", "Vanilla"], [("g", [60, 120])], (10, 50),
          ["cream biscuit", "biscuit"], brands=["sunfeast", "britannia", "parle", "bourbon"]),
        F("Cookies", ["Butter", "Cashew", "Choco Chip"], [("g", [75, 150, 250])], (25, 90),
          ["cookies", "biscuit"], brands=["good-day", "sunfeast", "britannia"]),
        F("Marie Biscuits", ["Light"], [("g", [120, 250])], (20, 60),
          ["marie", "biscuit"], brands=["marie-gold", "britannia", "sunfeast"]),
        F("Salted Crackers", ["Classic", "Cheese"], [("g", [60, 120])], (10, 45),
          ["crackers", "biscuit", "monaco"], brands=["monaco", "krackjack", "parle"]),
        F("Chocolate Bar", ["Milk", "Fruit & Nut", "Crackle", "Silk"], [("g", [13, 40, 80, 150])], (10, 220),
          ["chocolate", "dairy milk"], brands=["cadbury", "dairy-milk", "nestle-kitkat", "amul-choco"]),
        F("Wafer Chocolate", ["Crispy"], [("g", [25, 37])], (10, 50),
          ["chocolate", "wafer", "kitkat"], brands=["nestle-kitkat", "munch", "perk"]),
        F("Chocolate Bites", ["Pouch", "Home Pack"], [("g", [100, 130])], (60, 220),
          ["chocolate", "candy"], brands=["cadbury", "nestle"]),
    ],
}

# ---- Snacks: Instant & Ready Foods ----
SPEC["instant-foods"] = {
    "brands": ["maggi", "sunfeast", "mtr", "aachi", "patanjali", "tata-sampann", "haldirams",
               "knorr" if "knorr" in BRAND else "maggi"],
    "families": [
        F("Instant Noodles", ["Masala", "Chicken", "Cheese", "Atta"], [("g", [70, 140, 280, 560])], (12, 96),
          ["noodles", "maggi", "instant noodles"], brands=["maggi", "sunfeast"]),
        F("Cup Noodles", ["Masala", "Chilli"], [("g", [70])], (35, 70),
          ["cup noodles", "noodles"], brands=["maggi"]),
        F("Instant Pasta", ["Masala", "Cheese", "Tomato"], [("g", [65, 130])], (15, 70),
          ["pasta", "instant pasta"], brands=["maggi", "sunfeast"]),
        F("Ready Mix Gulab Jamun", ["Instant"], [("g", [200, 500])], (60, 180),
          ["gulab jamun", "sweet mix", "ready mix"], brands=["mtr", "aachi"]),
        F("Ready to Eat Curry", ["Dal Makhani", "Paneer Butter Masala", "Chana Masala"], [("g", [285, 300])], (75, 180),
          ["ready to eat", "instant curry", "rte"], brands=["mtr", "haldirams"]),
        F("Soup", ["Tomato", "Sweet Corn", "Mixed Veg"], [("g", [50, 65])], (35, 90),
          ["soup", "instant soup"], brands=["maggi", "knorr" if "knorr" in BRAND else "maggi"]),
        F("Idli Dosa Batter Mix", ["Instant"], [("g", [200, 500])], (45, 150),
          ["batter mix", "idli mix", "dosa mix"], brands=["mtr", "aachi"]),
    ],
}


# ---- Fashion: Watches ----
SPEC["watches"] = {
    "brands": ["titan", "fastrack", "sonata", "casio", "fossil", "guess", "tommy-hilfiger",
               "calvin-klein"],
    "families": [
        F("Analog Watch", ["Leather Strap", "Metal Strap", "Day Date"], [("pc", [1])], (995, 9995),
          ["watch", "wrist watch", "analog watch"]),
        F("Chronograph Watch", ["Steel", "Sport"], [("pc", [1])], (2495, 14995),
          ["watch", "chronograph", "wrist watch"]),
        F("Digital Watch", ["Sport", "Illuminator"], [("pc", [1])], (795, 5995),
          ["watch", "digital watch"]),
        F("Couple Watch Set", ["His & Her"], [("pc", [1])], (1995, 9995),
          ["watch", "couple watch", "gift set"]),
    ],
}

# ---- Fashion: Bags & Luggage ----
SPEC["bags-luggage"] = {
    "brands": ["american-tourister", "skybags", "safari", "vip", "wildcraft", "puma", "nike",
               "adidas", "fastrack"],
    "families": [
        F("Backpack", ["Casual", "Laptop", "School"], [("pc", [1])], (599, 3999),
          ["bag", "backpack", "school bag"]),
        F("Laptop Bag", ["15.6 inch", "Office"], [("pc", [1])], (799, 3499),
          ["laptop bag", "office bag", "bag"]),
        F("Trolley Suitcase", ['Cabin 55cm', 'Medium 65cm', 'Large 75cm'], [("pc", [1])], (1999, 8999),
          ["suitcase", "trolley", "luggage", "travel bag"]),
        F("Duffle Bag", ["Travel", "Gym"], [("pc", [1])], (699, 2999),
          ["duffle bag", "travel bag", "gym bag"]),
        F("Sling Bag", ["Crossbody", "Mini"], [("pc", [1])], (399, 1999),
          ["sling bag", "bag"]),
    ],
}

# ---- Dairy: Ice Cream & Desserts ----
SPEC["ice-cream"] = {
    "brands": ["amul", "kwality-walls", "vadilal", "mother-dairy", "aavin", "nandini", "heritage",
               "havmor" if "havmor" in BRAND else "amul"],
    "families": [
        F("Vanilla Ice Cream", ["Tub", "Family Pack"], [("ml", [100, 700]), ("L", [1])], (30, 320),
          ["ice cream", "icecream", "vanilla"]),
        F("Chocolate Ice Cream", ["Tub", "Cone"], [("ml", [100, 700])], (30, 280),
          ["ice cream", "chocolate"]),
        F("Butterscotch Ice Cream", ["Tub", "Family Pack"], [("ml", [700]), ("L", [1])], (120, 340),
          ["ice cream", "butterscotch"]),
        F("Kulfi", ["Malai", "Pista", "Stick"], [("pc", [1, 6])], (20, 180),
          ["kulfi", "ice cream", "dessert"]),
        F("Choco Bar", ["Stick", "Multipack"], [("pc", [1, 4])], (15, 160),
          ["choco bar", "ice cream", "ice candy"]),
        F("Cassata / Cup Ice Cream", ["Cup", "Cassata"], [("ml", [100, 125])], (20, 90),
          ["ice cream", "cup ice cream", "cassata"]),
    ],
}

# ---- Electronics: Cameras ----
SPEC["cameras"] = {
    "brands": ["canon", "nikon", "sony", "fujifilm", "panasonic", "gopro" if "gopro" in BRAND else "sony"],
    "families": [
        F("DSLR Camera", ["Body", "18-55mm Kit", "Double Lens Kit"], [("pc", [1])], (32999, 89999),
          ["camera", "dslr", "digital camera"]),
        F("Mirrorless Camera", ["Body", "Kit Lens"], [("pc", [1])], (45999, 159999),
          ["camera", "mirrorless"]),
        F("Point & Shoot Camera", ["Compact", "Zoom"], [("pc", [1])], (8999, 24999),
          ["camera", "point and shoot", "digital camera"]),
        F("Action Camera", ["4K", "Waterproof"], [("pc", [1])], (9999, 39999),
          ["action camera", "camera"]),
        F("Camera Lens", ["50mm", "70-300mm", "18-140mm"], [("pc", [1])], (6999, 49999),
          ["lens", "camera lens"]),
    ],
}

# ===========================================================================
# GENERATION
# ===========================================================================
def gen_generic(cat_slug, spec, products):
    cat_id = CATEGORIES[cat_slug][0]
    cat_name = CATEGORIES[cat_slug][2]
    cat_brands = spec["brands"]

    # Apparel/footwear get real size x colour SKU expansion
    fashion = cat_slug in ("men", "women", "footwear")
    if cat_slug == "footwear":
        sku_sizes, sku_colors, sku_label = SHOE_SIZES, SHOE_COLORS, "Size"
    elif cat_slug == "women":
        sku_sizes, sku_colors, sku_label = APPAREL_SIZES, WOMEN_COLORS, "Size"
    else:
        sku_sizes, sku_colors, sku_label = APPAREL_SIZES, APPAREL_COLORS, "Size"

    for fam in spec["families"]:
        fam_brands = fam["brands"] if fam["brands"] else cat_brands
        for bslug in fam_brands:
            b = BRAND.get(bslug)
            if not b:
                continue
            for variant in fam["variants"]:
                for unit, sizes in fam["units"]:
                    for size in sizes:
                        size_disp = (str(int(size)) if float(size).is_integer() else str(size))
                        size_token = f"{size_disp}{unit}"
                        parts = [b["name"]]
                        if variant:
                            parts.append(variant)
                        parts.append(fam["name"])
                        base_name = " ".join(parts)
                        lo, hi = fam["price"]

                        if fashion:
                            # expand into colour x size SKUs
                            for color in sku_colors:
                                for asize in sku_sizes:
                                    name = f"{base_name} - {color} ({sku_label} {asize})"
                                    slug = slugify(f"{bslug}-{fam['name']}-{variant}-{color}-{asize}")
                                    price = price_for(slug, lo, hi)
                                    terms = [b["name"], fam["name"], cat_name] + fam["aliases"]
                                    terms += [w for w in fam["name"].split() if len(w) > 2]
                                    if variant:
                                        terms.append(variant)
                                    terms += [color, asize]
                                    desc = (f"Genuine {b['name']} {fam['name']}"
                                            f"{(' ' + variant) if variant else ''} in {color}, {sku_label} {asize}. "
                                            f"Authentic {cat_name} product available for hyperlocal delivery.")
                                    products.append({
                                        "slug": slug, "name": name, "cat_id": cat_id,
                                        "brand_id": b["id"], "desc": desc, "unit": "pc",
                                        "size": asize, "price": price, "terms": terms})
                            continue

                        name = f"{base_name} {size_token}"
                        slug = slugify(f"{bslug}-{fam['name']}-{variant}-{size_token}")
                        price = price_for(slug, lo, hi)
                        terms = [b["name"], fam["name"], cat_name] + fam["aliases"]
                        terms += [w for w in fam["name"].split() if len(w) > 2]
                        if variant:
                            terms.append(variant)
                        terms.append(size_token)
                        desc = f"Genuine {b['name']} {fam['name']}{(' ' + variant) if variant else ''} ({size_token}). Authentic {cat_name} product available for hyperlocal delivery."
                        products.append({
                            "slug": slug, "name": name, "cat_id": cat_id, "brand_id": b["id"],
                            "desc": desc, "unit": unit, "size": size_disp, "price": price,
                            "terms": terms,
                        })


def gen_mobiles(products):
    cat_id = CATEGORIES["mobiles"][0]
    for bslug, models in MOBILE_MODELS.items():
        b = BRAND.get(bslug)
        if not b:
            continue
        for model in models:
            for storage in MOBILE_STORAGE:
                # apple iphones don't use the GB/GB ram format the same; simplify
                if bslug == "apple":
                    store_opts = ["128GB", "256GB", "512GB"]
                    if storage != MOBILE_STORAGE[0]:
                        continue
                    for st in store_opts:
                        for color in MOBILE_COLORS[:2]:
                            name = f"{model} ({color}, {st})"
                            slug = slugify(f"{bslug}-{model}-{st}-{color}")
                            price = price_for(slug, 39900, 159900)
                            terms = [b["name"], model, "mobile", "smartphone", "phone", "iphone", st, color]
                            products.append({
                                "slug": slug, "name": name, "cat_id": cat_id, "brand_id": b["id"],
                                "desc": f"{model} smartphone in {color} with {st} storage. Brand new, sealed pack with warranty.",
                                "unit": "pc", "size": "1", "price": price, "terms": terms})
                    continue
                color = MOBILE_COLORS[
                    int(hashlib.md5((model + storage).encode()).hexdigest(), 16) % len(MOBILE_COLORS)]
                name = f"{model} ({color}, {storage})"
                slug = slugify(f"{bslug}-{model}-{storage}-{color}")
                price = price_for(slug, 8999, 89999)
                terms = [b["name"], model, "mobile", "smartphone", "phone", "android", storage, color]
                products.append({
                    "slug": slug, "name": name, "cat_id": cat_id, "brand_id": b["id"],
                    "desc": f"{model} smartphone in {color} with {storage}. Brand new, sealed pack with warranty.",
                    "unit": "pc", "size": "1", "price": price, "terms": terms})


def gen_laptops(products):
    cat_id = CATEGORIES["computers"][0]
    for bslug, models in LAPTOP_MODELS.items():
        b = BRAND.get(bslug)
        if not b:
            continue
        for model in models:
            configs = ["M2 8GB 256GB SSD", "M3 16GB 512GB SSD"] if bslug == "apple" else LAPTOP_CONFIG
            for conf in configs:
                name = f"{model} ({conf})"
                slug = slugify(f"{bslug}-{model}-{conf}")
                price = price_for(slug, 32999, 159999)
                terms = [b["name"], model, "laptop", "notebook", "computer"] + conf.split()
                products.append({
                    "slug": slug, "name": name, "cat_id": cat_id, "brand_id": b["id"],
                    "desc": f"{model} laptop with {conf}. Brand new with manufacturer warranty and GST invoice.",
                    "unit": "pc", "size": "1", "price": price, "terms": terms})


def register_new_brands():
    """Add NEW_BRANDS into the BRAND map BEFORE generation so families that rely
    solely on new brands (e.g. Paracetamol/Dolo, Diapers/Pampers) are produced."""
    for slug, name in NEW_BRANDS:
        if slug not in BRAND:
            BRAND[slug] = {"id": uid("brand", slug), "name": name}


def main():
    register_new_brands()
    products = []
    for cat_slug, spec in SPEC.items():
        gen_generic(cat_slug, spec, products)
    gen_mobiles(products)
    gen_laptops(products)

    # de-duplicate by slug
    seen, uniq = set(), []
    for p in products:
        if p["slug"] in seen:
            continue
        seen.add(p["slug"])
        uniq.append(p)
    products = uniq

    # assign vendor + deterministic product id + inventory
    for p in products:
        v = pick_vendor(p["slug"])
        p["vendor_id"] = v["id"]
        p["id"] = uid("product", p["slug"])
        p["inv_id"] = uid("inventory", p["slug"])
        h = int(hashlib.md5(("stk:" + p["slug"]).encode()).hexdigest(), 16)
        p["stock"] = 15 + (h % 240)

    print(f"TOTAL PRODUCTS: {len(products)}")
    # category distribution
    from collections import Counter
    cat_by_id = {v[0]: k for k, v in CATEGORIES.items()}
    dist = Counter(cat_by_id[p["cat_id"]] for p in products)
    for c, n in sorted(dist.items(), key=lambda x: -x[1]):
        print(f"  {n:6d}  {c}")

    write_sql(products)
    write_top100(products)


def write_sql(products):
    out = os.path.join(os.path.dirname(__file__), "..", "supabase", "migrations",
                       "20260612000000_ppc2_product_universe_repair.sql")
    lines = []
    A = lines.append
    A("-- ============================================================================")
    A("-- PP-C2  PRODUCT UNIVERSE REPAIR & POPULATION")
    A("-- Self-contained, idempotent, rollback-safe.")
    A(f"-- Generated products: {len(products)}")
    A("-- Fixes root cause of products=0: prior migration referenced a vendor that")
    A("-- only existed in the (never-applied) seed file, so its single-transaction")
    A("-- INSERT failed its FK and rolled back to zero rows.")
    A("-- ============================================================================")
    A("BEGIN;")
    A("")
    A("create extension if not exists pgcrypto;")
    A("")
    # ---- schema hardening (defensive; mirrors prior PP-C hardening) ----
    A("-- 1. Ensure target columns exist on products")
    A("ALTER TABLE public.products")
    A("  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,")
    A("  ADD COLUMN IF NOT EXISTS unit text,")
    A("  ADD COLUMN IF NOT EXISTS package_size text,")
    A("  ADD COLUMN IF NOT EXISTS image_url text,")
    A("  ADD COLUMN IF NOT EXISTS search_terms text[] NOT NULL DEFAULT '{}';")
    A("CREATE INDEX IF NOT EXISTS products_brand_id_idx ON public.products(brand_id) WHERE deleted_at IS NULL;")
    A("CREATE INDEX IF NOT EXISTS products_search_terms_gin_idx ON public.products USING GIN (search_terms);")
    A("")
    # ---- departments ----
    A("-- 2. Departments (new ones for full coverage)")
    for slug, (did, name) in DEPARTMENTS.items():
        A(f"INSERT INTO public.departments (id, slug, canonical_name) VALUES "
          f"('{did}', {sql_str(slug)}, {sql_str(name)}) "
          f"ON CONFLICT (slug) DO UPDATE SET canonical_name = EXCLUDED.canonical_name;")
    A("")
    # ---- categories ----
    A("-- 3. Categories (existing + new). Populate both legacy and taxonomy columns.")
    for slug, (cid, dep_slug, name) in CATEGORIES.items():
        # Resolve department_id by slug subquery: a department with this slug may already
        # exist (from tier_1) with a different id, and ON CONFLICT(slug) keeps that id.
        dep_lookup = f"(select id from public.departments where slug = {sql_str(dep_slug)})"
        A(f"INSERT INTO public.categories (id, department_id, name, slug, canonical_name, is_active) VALUES "
          f"('{cid}', {dep_lookup}, {sql_str(name)}, {sql_str(slug)}, {sql_str(name)}, true) "
          f"ON CONFLICT (slug) DO UPDATE SET department_id = EXCLUDED.department_id, "
          f"canonical_name = COALESCE(public.categories.canonical_name, EXCLUDED.canonical_name), "
          f"name = EXCLUDED.name, is_active = true;")
    A("")
    # ---- new brands ----
    A("-- 4. New brands required for coverage (real Indian brands missing from PP-B)")
    existing_slugs = {b["slug"] for b in REAL}
    for slug, name in NEW_BRANDS:
        if slug in existing_slugs:
            continue
        bid = BRAND[slug]["id"]
        meta = '{"category_focus": "Indian Retail", "relationship_tier": "verified", "source": "ppc2"}'
        A(f"INSERT INTO public.brands (id, slug, canonical_name, manufacturer, logo_url, status, metadata) VALUES "
          f"('{bid}', {sql_str(slug)}, {sql_str(name)}, 'Various Manufacturers', "
          f"{sql_str('https://assets.vendorhub.in/brands/' + slug + '.png')}, 'ACTIVE', "
          f"'{meta}'::jsonb) ON CONFLICT (slug) DO UPDATE SET canonical_name = EXCLUDED.canonical_name, "
          f"status = 'ACTIVE';")
    A("")
    # ---- auth users + profiles + vendors ----
    A("-- 5. Self-contained vendors (auth user -> profile -> vendor). No seed dependency.")
    for v in VENDORS:
        A(f"INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, "
          f"email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, "
          f"confirmation_token, email_change, email_change_token_new, recovery_token) VALUES "
          f"('00000000-0000-0000-0000-000000000000', '{v['owner']}', 'authenticated', 'authenticated', "
          f"{sql_str(v['email'])}, extensions.crypt('VendorHub@123!', extensions.gen_salt('bf')), now(), "
          f"'{{\"provider\":\"email\",\"providers\":[\"email\"]}}'::jsonb, "
          f"'{{\"full_name\":{json.dumps(v['name'])}}}'::jsonb, now(), now(), '', '', '', '') "
          f"ON CONFLICT (id) DO NOTHING;")
    A("")
    for v in VENDORS:
        A(f"INSERT INTO public.profiles (id, full_name, email, default_role, onboarding_completed_at) VALUES "
          f"('{v['owner']}', {sql_str(v['name'] + ' Owner')}, {sql_str(v['email'])}, 'SELLER', now()) "
          f"ON CONFLICT (id) DO UPDATE SET default_role = 'SELLER';")
    A("")
    for v in VENDORS:
        meta = json.dumps({"locality": v["area"], "city": v["city"], "latitude": v["lat"],
                           "longitude": v["lon"], "averagePrepMinutes": 20})
        A(f"INSERT INTO public.vendors (id, owner_id, name, slug, description, status, email, "
          f"service_radius_km, rating_average, rating_count, metadata) VALUES "
          f"('{v['id']}', '{v['owner']}', {sql_str(v['name'])}, {sql_str(v['slug'])}, "
          f"{sql_str('Trusted neighbourhood store in ' + v['area'] + ', ' + v['city'] + ' on VendorHub.')}, "
          f"'ACTIVE', {sql_str(v['email'])}, 6, 4.6, 250, '{meta}'::jsonb) "
          f"ON CONFLICT (slug) DO UPDATE SET status = 'ACTIVE', metadata = EXCLUDED.metadata;")
    A("")
    for v in VENDORS:
        A(f"INSERT INTO public.vendor_members (vendor_id, user_id, role, joined_at) VALUES "
          f"('{v['id']}', '{v['owner']}', 'OWNER', now()) "
          f"ON CONFLICT (vendor_id, user_id) DO UPDATE SET role = 'OWNER';")
    A("")
    # ---- products ----
    # Reverse maps so products resolve category_id / brand_id BY SLUG.
    # A category or brand slug may already exist (from tier_1 / south_indian seeds)
    # with a different id; ON CONFLICT(slug) keeps that id, so hardcoded ids can be
    # stale. Slug subqueries are always correct.
    cat_id_to_slug = {cid: slug for slug, (cid, _dep, _name) in CATEGORIES.items()}
    brand_id_to_slug = {v["id"]: s for s, v in BRAND.items()}
    A("-- 6. Products")
    A("INSERT INTO public.products (id, vendor_id, category_id, brand_id, name, slug, description, "
      "status, base_price, currency, unit, package_size, image_url, search_terms, published_at) VALUES")
    rows = []
    for p in products:
        img = f"https://assets.vendorhub.in/products/{p['slug']}.png"
        cat_slug = cat_id_to_slug[p['cat_id']]
        brand_slug = brand_id_to_slug[p['brand_id']]
        cat_ref = f"(select id from public.categories where slug = {sql_str(cat_slug)})"
        brand_ref = f"(select id from public.brands where slug = {sql_str(brand_slug)})"
        rows.append(
            f"  ('{p['id']}', '{p['vendor_id']}', {cat_ref}, {brand_ref}, "
            f"{sql_str(p['name'])}, {sql_str(p['slug'])}, {sql_str(p['desc'])}, 'ACTIVE', "
            f"{p['price']}, 'INR', {sql_str(p['unit'])}, {sql_str(p['size'])}, {sql_str(img)}, "
            f"{sql_arr(p['terms'])}, now())")
    A(",\n".join(rows))
    A("ON CONFLICT (vendor_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, "
      "category_id = EXCLUDED.category_id, brand_id = EXCLUDED.brand_id, base_price = EXCLUDED.base_price, "
      "unit = EXCLUDED.unit, package_size = EXCLUDED.package_size, image_url = EXCLUDED.image_url, "
      "search_terms = EXCLUDED.search_terms, status = 'ACTIVE', published_at = now();")
    A("")
    # ---- inventory ----
    A("-- 7. Inventory (so products render as in-stock)")
    A("INSERT INTO public.inventory (id, vendor_id, product_id, stock_quantity, reserved_quantity, "
      "low_stock_threshold, stock_status) VALUES")
    invrows = []
    for p in products:
        invrows.append(
            f"  ('{p['inv_id']}', '{p['vendor_id']}', '{p['id']}', {p['stock']}, 0, 5, 'IN_STOCK')")
    A(",\n".join(invrows))
    A("ON CONFLICT (id) DO UPDATE SET stock_quantity = EXCLUDED.stock_quantity, "
      "stock_status = 'IN_STOCK';")
    A("")
    A("COMMIT;")
    A("")
    with open(out, "w") as f:
        f.write("\n".join(lines))
    print("WROTE:", os.path.relpath(out))
    print("FILE SIZE (MB): %.2f" % (os.path.getsize(out) / 1e6))

    # rollback script
    rb = os.path.join(os.path.dirname(__file__), "..", "supabase", "migrations",
                      "ROLLBACK_ppc2_product_universe_repair.sql")
    with open(rb, "w") as f:
        f.write(
            "-- ROLLBACK for PP-C2 product universe (run manually if needed)\n"
            "BEGIN;\n"
            "DELETE FROM public.inventory WHERE vendor_id IN (SELECT id FROM public.vendors WHERE slug LIKE 'vh-%');\n"
            "DELETE FROM public.products  WHERE vendor_id IN (SELECT id FROM public.vendors WHERE slug LIKE 'vh-%');\n"
            "DELETE FROM public.vendor_members WHERE vendor_id IN (SELECT id FROM public.vendors WHERE slug LIKE 'vh-%');\n"
            "DELETE FROM public.vendors  WHERE slug LIKE 'vh-%';\n"
            "-- profiles/auth users left intact by default; uncomment to remove:\n"
            "-- DELETE FROM public.profiles WHERE email LIKE 'owner+vh-%@vendorhub.in';\n"
            "-- DELETE FROM auth.users WHERE email LIKE 'owner+vh-%@vendorhub.in';\n"
            "COMMIT;\n")
    print("WROTE:", os.path.relpath(rb))


def write_top100(products):
    out = os.path.join(os.path.dirname(__file__), "..", "..", "top_100_products_sample.txt")
    cat_by_id = {v[0]: v[2] for v in CATEGORIES.values()}
    with open(out, "w") as f:
        f.write("VendorHub PP-C2 — Sample Top 100 Products\n")
        f.write("=" * 60 + "\n")
        for i, p in enumerate(products[:100], 1):
            f.write(f"{i:3d}. {p['name']:55s} | {cat_by_id[p['cat_id']]:20s} | Rs.{p['price']}\n")
    print("WROTE top 100 sample:", os.path.relpath(out))


if __name__ == "__main__":
    main()
