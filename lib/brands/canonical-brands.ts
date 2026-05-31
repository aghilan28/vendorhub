import { slugify } from "@/lib/taxonomy";
import type { BrandIndustry, BrandInput, CompanyInput } from "./types";

/**
 * Canonical Indian brand universe (PP-2). Real brands only — reference/ontology data, NOT products,
 * inventory or sellers. Brands are listed once, under their owning company, and classified into
 * PP-1 taxonomy departments. `buildCanonicalBrandInputs` expands this into engine inputs.
 */

interface CompanySeed {
  name: string;
  industry: BrandIndustry;
  aliases?: string[];
  parent?: string;
  founded?: number;
}

type BrandEntry = string | { name: string; departments?: string[]; aliases?: string[]; industry?: BrandIndustry; local?: boolean };

interface BrandGroup {
  company?: string;
  industry: BrandIndustry;
  departments: string[];
  local?: boolean;
  brands: BrandEntry[];
}

const D = {
  groceries: "groceries",
  fresh: "fresh-produce",
  dairy: "dairy",
  bakery: "bakery",
  beverages: "beverages",
  snacks: "snacks",
  frozen: "frozen-foods",
  personal: "personal-care",
  beauty: "beauty",
  health: "health",
  baby: "baby-care",
  pet: "pet-care",
  household: "household",
  cleaning: "cleaning",
  kitchen: "kitchen",
  electronics: "electronics",
  stationery: "stationery",
  automotive: "automotive",
  sports: "sports",
  fashion: "fashion",
  home: "home-essentials",
  medicine: "medicine",
  regional: "regional-foods",
  local: "local-specialties",
} as const;

export const CANONICAL_COMPANIES: CompanySeed[] = [
  { name: "Hindustan Unilever", industry: "FMCG", aliases: ["HUL", "Hindustan Unilever Limited"], founded: 1933 },
  { name: "Procter & Gamble", industry: "FMCG", aliases: ["P&G", "Procter and Gamble"], founded: 1837 },
  { name: "Nestle India", industry: "FOOD", aliases: ["Nestle"], founded: 1959 },
  { name: "ITC Limited", industry: "CONGLOMERATE", aliases: ["ITC"], founded: 1910 },
  { name: "Britannia Industries", industry: "FOOD", aliases: ["Britannia"], founded: 1892 },
  { name: "Parle Products", industry: "FOOD", aliases: ["Parle"], founded: 1929 },
  { name: "Parle Agro", industry: "BEVERAGES", founded: 1984 },
  { name: "Mondelez India", industry: "FOOD", aliases: ["Cadbury", "Cadbury India"], founded: 1948 },
  { name: "Dabur India", industry: "FMCG", aliases: ["Dabur"], founded: 1884 },
  { name: "Patanjali Ayurved", industry: "FMCG", aliases: ["Patanjali"], founded: 2006 },
  { name: "Marico", industry: "FMCG", founded: 1990 },
  { name: "Godrej Consumer Products", industry: "FMCG", aliases: ["GCPL", "Godrej"], founded: 2001 },
  { name: "Colgate-Palmolive India", industry: "PERSONAL_CARE", aliases: ["Colgate"], founded: 1937 },
  { name: "Reckitt Benckiser", industry: "FMCG", aliases: ["Reckitt"], founded: 1999 },
  { name: "Wipro Consumer Care", industry: "FMCG", aliases: ["Wipro"], founded: 1945 },
  { name: "Emami", industry: "FMCG", founded: 1974 },
  { name: "CavinKare", industry: "FMCG", founded: 1983 },
  { name: "Jyothy Labs", industry: "FMCG", founded: 1983 },
  { name: "Amul", industry: "DAIRY", aliases: ["GCMMF", "Gujarat Cooperative Milk Marketing Federation"], founded: 1946 },
  { name: "Mother Dairy", industry: "DAIRY", founded: 1974 },
  { name: "Hatsun Agro Product", industry: "DAIRY", aliases: ["Hatsun"], founded: 1970 },
  { name: "Parag Milk Foods", industry: "DAIRY", founded: 1992 },
  { name: "Karnataka Milk Federation", industry: "DAIRY", aliases: ["KMF", "Nandini"], founded: 1974 },
  { name: "Aavin", industry: "DAIRY", founded: 1981 },
  { name: "Coca-Cola India", industry: "BEVERAGES", aliases: ["Coca Cola"], founded: 1993 },
  { name: "PepsiCo India", industry: "BEVERAGES", aliases: ["Pepsi"], founded: 1989 },
  { name: "Bisleri International", industry: "BEVERAGES", aliases: ["Bisleri"], founded: 1969 },
  { name: "Tata Consumer Products", industry: "FOOD", aliases: ["Tata", "Tata Global Beverages"], founded: 1962 },
  { name: "Haldiram's", industry: "FOOD", founded: 1937 },
  { name: "Adani Wilmar", industry: "FOOD", aliases: ["Fortune"], founded: 1999 },
  { name: "MTR Foods", industry: "FOOD", aliases: ["MTR"], founded: 1924 },
  { name: "iD Fresh Food", industry: "FOOD", aliases: ["iD"], founded: 2005 },
  { name: "Nirma", industry: "FMCG", founded: 1969 },
  { name: "Samsung India", industry: "ELECTRONICS", aliases: ["Samsung"], founded: 1995 },
  { name: "LG Electronics India", industry: "ELECTRONICS", aliases: ["LG"], founded: 1997 },
  { name: "Sony India", industry: "ELECTRONICS", aliases: ["Sony"], founded: 1994 },
  { name: "Panasonic India", industry: "ELECTRONICS", aliases: ["Panasonic"], founded: 1972 },
  { name: "Whirlpool of India", industry: "APPLIANCES", aliases: ["Whirlpool"], founded: 1987 },
  { name: "Voltas", industry: "APPLIANCES", founded: 1954 },
  { name: "Havells India", industry: "APPLIANCES", aliases: ["Havells"], founded: 1983 },
  { name: "Crompton Greaves Consumer", industry: "APPLIANCES", aliases: ["Crompton"], founded: 1937 },
  { name: "TTK Prestige", industry: "KITCHEN", aliases: ["Prestige"], founded: 1955 },
  { name: "Butterfly Gandhimathi", industry: "KITCHEN", aliases: ["Butterfly"], founded: 1986 },
  { name: "Hamilton Housewares", industry: "KITCHEN", aliases: ["Milton"], founded: 1972 },
  { name: "Imagine Marketing", industry: "ELECTRONICS", aliases: ["boAt"], founded: 2016 },
  { name: "Nexxbase", industry: "ELECTRONICS", aliases: ["Noise"], founded: 2014 },
  { name: "Xiaomi India", industry: "ELECTRONICS", aliases: ["Mi", "Xiaomi"], founded: 2014 },
  { name: "Titan Company", industry: "FASHION", aliases: ["Titan"], founded: 1984 },
  { name: "Bata India", industry: "FOOTWEAR", aliases: ["Bata"], founded: 1931 },
  { name: "Relaxo Footwears", industry: "FOOTWEAR", aliases: ["Relaxo"], founded: 1976 },
  { name: "Aditya Birla Fashion", industry: "FASHION", aliases: ["ABFRL"], founded: 2007 },
  { name: "Page Industries", industry: "FASHION", aliases: ["Jockey India"], founded: 1994 },
  { name: "Rupa & Company", industry: "FASHION", aliases: ["Rupa"], founded: 1985 },
  { name: "Castrol India", industry: "AUTOMOTIVE", aliases: ["Castrol"], founded: 1910 },
  { name: "Pidilite Industries", industry: "OTHER", aliases: ["Pidilite"], founded: 1959 },
  { name: "Kokuyo Camlin", industry: "STATIONERY", aliases: ["Camlin"], founded: 1931 },
  { name: "Navneet Education", industry: "STATIONERY", aliases: ["Navneet"], founded: 1959 },
  { name: "Mars Petcare India", industry: "PET_CARE", aliases: ["Mars"], founded: 1911 },
  { name: "Drools", industry: "PET_CARE", founded: 2010 },
  { name: "Himalaya Wellness", industry: "PERSONAL_CARE", aliases: ["Himalaya"], founded: 1930 },
  { name: "Cipla", industry: "PHARMA", founded: 1935 },
  { name: "Mankind Pharma", industry: "PHARMA", aliases: ["Mankind"], founded: 1991 },
  { name: "Sun Pharma", industry: "PHARMA", founded: 1983 },
  { name: "Abbott India", industry: "PHARMA", aliases: ["Abbott"], founded: 1944 },
  { name: "GlaxoSmithKline", industry: "PHARMA", aliases: ["GSK"], founded: 1715 },
  { name: "Zydus Wellness", industry: "PHARMA", aliases: ["Zydus", "Cadila"], founded: 1995 },
  { name: "Johnson & Johnson India", industry: "PERSONAL_CARE", aliases: ["Johnson and Johnson", "J&J"], founded: 1947 },
  { name: "Honasa Consumer", industry: "BEAUTY", aliases: ["Mamaearth"], founded: 2016 },
  { name: "L'Oreal India", industry: "BEAUTY", aliases: ["Loreal", "L Oreal"], founded: 1991 },
  { name: "Beiersdorf India", industry: "PERSONAL_CARE", aliases: ["Nivea"], founded: 1882 },
];

// Brand groups continue in CANONICAL_BRAND_GROUPS below (appended).
export const CANONICAL_BRAND_GROUPS: BrandGroup[] = [];


CANONICAL_BRAND_GROUPS.push(
  {
    company: "Hindustan Unilever",
    industry: "PERSONAL_CARE",
    departments: [D.personal, D.beauty],
    brands: [
      "Dove", "Lux", "Lifebuoy", "Liril", "Pears", "Hamam", "Rexona", "Sunsilk", "Clinic Plus",
      "Tresemme", "Indulekha", "Vaseline", "Pond's", "Lakme", "Glow & Lovely", "Closeup",
      "Pepsodent", "Axe", "Dollar Shaving Club",
      { name: "Surf Excel", departments: [D.household, D.cleaning] },
      { name: "Rin", departments: [D.household, D.cleaning] },
      { name: "Wheel", departments: [D.household, D.cleaning] },
      { name: "Comfort", departments: [D.household, D.cleaning] },
      { name: "Vim", departments: [D.household, D.cleaning] },
      { name: "Domex", departments: [D.household, D.cleaning] },
      { name: "Cif", departments: [D.cleaning] },
      { name: "Sunlight", departments: [D.household, D.cleaning] },
      { name: "Brooke Bond", departments: [D.beverages], aliases: ["Brooke Bond Red Label"] },
      { name: "Red Label", departments: [D.beverages] },
      { name: "Taj Mahal Tea", departments: [D.beverages] },
      { name: "Bru", departments: [D.beverages] },
      { name: "Lipton", departments: [D.beverages] },
      { name: "3 Roses", departments: [D.beverages] },
      { name: "Taaza", departments: [D.beverages] },
      { name: "Knorr", departments: [D.groceries] },
      { name: "Kissan", departments: [D.groceries] },
      { name: "Annapurna", departments: [D.groceries] },
      { name: "Kwality Wall's", departments: [D.frozen] },
      { name: "Magnum", departments: [D.frozen] },
      { name: "Horlicks", departments: [D.health, D.beverages] },
      { name: "Boost", departments: [D.health, D.beverages] },
      { name: "Pureit", departments: [D.electronics, D.kitchen] },
    ],
  },
  {
    company: "Procter & Gamble",
    industry: "FMCG",
    departments: [D.personal],
    brands: [
      { name: "Ariel", departments: [D.household, D.cleaning] },
      { name: "Tide", departments: [D.household, D.cleaning] },
      "Gillette", "Old Spice", "Head & Shoulders", "Pantene", "Herbal Essences", "Oral-B", "Olay",
      { name: "Pampers", departments: [D.baby] },
      { name: "Whisper", departments: [D.personal, D.health] },
      { name: "Vicks", departments: [D.health, D.medicine] },
      { name: "Ambi Pur", departments: [D.household] },
    ],
  },
  {
    company: "Nestle India",
    industry: "FOOD",
    departments: [D.groceries, D.snacks],
    brands: [
      { name: "Maggi", departments: [D.groceries, D.snacks] },
      "KitKat", "Munch", "Milkybar", "Polo", "Bar-One",
      { name: "Nescafe", departments: [D.beverages] },
      { name: "Milkmaid", departments: [D.dairy, D.groceries] },
      { name: "Everyday", departments: [D.dairy, D.beverages] },
      { name: "Cerelac", departments: [D.baby] },
      { name: "Nestum", departments: [D.baby] },
      { name: "Nan", departments: [D.baby] },
      { name: "Lactogen", departments: [D.baby] },
      { name: "Nestle a+", departments: [D.dairy] },
    ],
  },
  {
    company: "ITC Limited",
    industry: "FMCG",
    departments: [D.groceries],
    brands: [
      { name: "Aashirvaad", departments: [D.groceries] },
      { name: "Sunfeast", departments: [D.snacks, D.bakery] },
      { name: "Bingo", departments: [D.snacks] },
      { name: "YiPPee", departments: [D.groceries, D.snacks] },
      { name: "Dark Fantasy", departments: [D.snacks] },
      { name: "Mom's Magic", departments: [D.snacks] },
      { name: "Candyman", departments: [D.snacks] },
      { name: "Mint-o", departments: [D.snacks] },
      { name: "Kitchens of India", departments: [D.groceries] },
      { name: "B Natural", departments: [D.beverages] },
      { name: "Fabelle", departments: [D.snacks] },
      { name: "Classmate", departments: [D.stationery] },
      { name: "Paperkraft", departments: [D.stationery] },
      { name: "Vivel", departments: [D.personal] },
      { name: "Fiama", departments: [D.personal] },
      { name: "Engage", departments: [D.personal] },
      { name: "Savlon", departments: [D.health, D.personal] },
      { name: "Nimyle", departments: [D.cleaning] },
      { name: "Mangaldeep", departments: ["pooja"] },
    ],
  },
  {
    company: "Britannia Industries",
    industry: "FOOD",
    departments: [D.snacks, D.bakery],
    brands: [
      "Good Day", "Marie Gold", "Tiger", "Bourbon", "Treat", "NutriChoice", "Milk Bikis", "50-50",
      "Little Hearts", "Pure Magic", "Jim Jam",
      { name: "Winkin' Cow", departments: [D.dairy, D.beverages] },
      { name: "Britannia Cheese", departments: [D.dairy] },
      { name: "Daily Bread", departments: [D.bakery] },
    ],
  },
  {
    company: "Parle Products",
    industry: "FOOD",
    departments: [D.snacks],
    brands: [
      "Parle-G", "Monaco", "Krackjack", "Hide & Seek", "Melody", "Mango Bite", "Kismi", "Poppins",
      "Rol-a-Cola", "Parle 20-20", "Happy Happy", "Parle Marie", "Londonderry",
    ],
  },
  {
    company: "Mondelez India",
    industry: "FOOD",
    departments: [D.snacks],
    brands: [
      "Dairy Milk", "5 Star", "Perk", "Gems", "Bournville", "Cadbury Silk", "Oreo", "Celebrations",
      "Toblerone",
      { name: "Bournvita", departments: [D.health, D.beverages] },
      { name: "Tang", departments: [D.beverages] },
      { name: "Halls", departments: [D.health, D.medicine] },
    ],
  },
);


CANONICAL_BRAND_GROUPS.push(
  {
    company: "Dabur India",
    industry: "FMCG",
    departments: [D.health, D.personal],
    brands: [
      { name: "Dabur Honey", departments: [D.groceries, D.health] },
      { name: "Dabur Chyawanprash", departments: [D.health] },
      { name: "Real", departments: [D.beverages] },
      { name: "Real Activ", departments: [D.beverages] },
      { name: "Hajmola", departments: [D.health, D.snacks] },
      { name: "Dabur Amla", departments: [D.personal] },
      { name: "Vatika", departments: [D.personal] },
      { name: "Dabur Red Paste", departments: [D.personal] },
      "Babool", "Meswak",
      { name: "Dabur Lal Tail", departments: [D.baby] },
      { name: "Pudin Hara", departments: [D.medicine, D.health] },
      { name: "Honitus", departments: [D.medicine] },
      { name: "Odomos", departments: [D.household] },
      { name: "Odonil", departments: [D.household] },
      { name: "Sanifresh", departments: [D.cleaning] },
      { name: "Gulabari", departments: [D.beauty] },
      { name: "Fem", departments: [D.beauty] },
    ],
  },
  {
    company: "Patanjali Ayurved",
    industry: "FMCG",
    departments: [D.groceries],
    brands: [
      { name: "Patanjali Atta", departments: [D.groceries] },
      { name: "Patanjali Ghee", departments: [D.dairy, D.groceries] },
      { name: "Patanjali Honey", departments: [D.groceries] },
      { name: "Dant Kanti", departments: [D.personal] },
      { name: "Kesh Kanti", departments: [D.personal] },
      { name: "Patanjali Aloe Vera Gel", departments: [D.beauty] },
      { name: "Divya", departments: [D.medicine, D.health] },
      { name: "Patanjali Noodles", departments: [D.groceries, D.snacks] },
    ],
  },
  {
    company: "Marico",
    industry: "FMCG",
    departments: [D.personal],
    brands: [
      "Parachute", "Nihar", "Hair & Care", "Livon", "Set Wet", "Mediker", "Parachute Advansed",
      "Beardo", "Just Herbs",
      { name: "Saffola", departments: [D.groceries, D.health] },
      { name: "Coco Soul", departments: [D.beauty] },
    ],
  },
  {
    company: "Godrej Consumer Products",
    industry: "FMCG",
    departments: [D.personal],
    brands: [
      "Godrej No.1", "Cinthol", "Godrej Expert", "Godrej Nupur",
      { name: "Godrej Aer", departments: [D.household] },
      { name: "Good Knight", departments: [D.household] },
      { name: "HIT", departments: [D.household] },
      { name: "Ezee", departments: [D.cleaning] },
      { name: "Genteel", departments: [D.cleaning] },
      { name: "Protekt", departments: [D.personal, D.health] },
    ],
  },
  {
    company: "Colgate-Palmolive India",
    industry: "PERSONAL_CARE",
    departments: [D.personal],
    brands: ["Colgate", "Palmolive", "Colgate Total", "Colgate MaxFresh", "Colgate Active Salt", "Cibaca"],
  },
  {
    company: "Reckitt Benckiser",
    industry: "FMCG",
    departments: [D.cleaning, D.household],
    brands: [
      { name: "Dettol", departments: [D.health, D.personal] },
      "Lizol", "Harpic", "Mortein", "Robin", "Vanish", "Finish", "Air Wick", "Cherry Blossom",
      { name: "Veet", departments: [D.beauty, D.personal] },
      { name: "Durex", departments: [D.health] },
      { name: "Strepsils", departments: [D.medicine, D.health] },
      { name: "Disprin", departments: [D.medicine] },
      { name: "Move", departments: [D.medicine, D.health] },
      { name: "Moov", departments: [D.medicine, D.health] },
    ],
  },
  {
    company: "Wipro Consumer Care",
    industry: "FMCG",
    departments: [D.personal],
    brands: [
      "Santoor", "Yardley", "Chandrika",
      { name: "Glucovita", departments: [D.health, D.snacks] },
      { name: "Maxkleen", departments: [D.cleaning] },
      { name: "Safewash", departments: [D.cleaning] },
      { name: "Giffy", departments: [D.cleaning] },
    ],
  },
  {
    company: "Emami",
    industry: "FMCG",
    departments: [D.personal, D.beauty],
    brands: [
      "BoroPlus", "Navratna", "Fair and Handsome", "Kesh King", "He Deodorant",
      { name: "Zandu Balm", departments: [D.medicine, D.health] },
      { name: "Zandu", departments: [D.medicine, D.health] },
      { name: "Mentho Plus", departments: [D.medicine, D.health] },
      { name: "Fast Relief", departments: [D.medicine, D.health] },
    ],
  },
  {
    company: "CavinKare",
    industry: "FMCG",
    departments: [D.personal],
    brands: [
      "Chik", "Meera", "Nyle", "Karthika", "Spinz", "Indica", "Bryl",
      { name: "Chinni's", departments: [D.beauty] },
      { name: "Cavin's", departments: [D.dairy, D.beverages] },
      { name: "Garden Namkeen", departments: [D.snacks] },
    ],
  },
  {
    company: "Jyothy Labs",
    industry: "FMCG",
    departments: [D.cleaning, D.household],
    brands: [
      "Ujala", "Maxo", "Exo", "Pril", "Henko",
      { name: "Margo", departments: [D.personal] },
      { name: "Mr. White", departments: [D.cleaning] },
    ],
  },
  {
    company: "Nirma",
    industry: "FMCG",
    departments: [D.cleaning, D.household],
    brands: ["Nirma", "Nirma Super", "Nima", "Nirma Shudh"],
  },
);


CANONICAL_BRAND_GROUPS.push(
  {
    company: "Amul",
    industry: "DAIRY",
    departments: [D.dairy],
    brands: [
      "Amul Milk", "Amul Butter", "Amul Cheese", "Amul Ghee", "Amul Taaza", "Amul Gold",
      "Amul Lassi", "Amul Masti", "Amul Paneer", "Amul Spray", "Amulya",
      { name: "Amul Ice Cream", departments: [D.frozen] },
      { name: "Amul Kool", departments: [D.beverages, D.dairy] },
      { name: "Amul Chocolate", departments: [D.snacks] },
    ],
  },
  {
    company: "Mother Dairy",
    industry: "DAIRY",
    departments: [D.dairy],
    brands: [
      "Mother Dairy Milk", "Mother Dairy Curd", "Mother Dairy Paneer",
      { name: "Dhara", departments: [D.groceries] },
      { name: "Safal", departments: [D.frozen, D.fresh] },
      { name: "Mother Dairy Ice Cream", departments: [D.frozen] },
    ],
  },
  {
    company: "Hatsun Agro Product",
    industry: "DAIRY",
    departments: [D.dairy],
    brands: [
      "Arokya", "Hatsun Curd", "Hatsun Paneer",
      { name: "Arun Ice Cream", departments: [D.frozen] },
      { name: "Ibaco", departments: [D.frozen] },
      { name: "Hatsun Ghee", departments: [D.dairy, D.groceries] },
    ],
  },
  {
    company: "Parag Milk Foods",
    industry: "DAIRY",
    departments: [D.dairy],
    brands: ["Gowardhan", "Go Cheese", "Pride of Cows", "Topp Up", "Avvatar"],
  },
  {
    company: "Karnataka Milk Federation",
    industry: "DAIRY",
    departments: [D.dairy],
    local: true,
    brands: ["Nandini Milk", "Nandini Ghee", "Nandini Curd", "Nandini Paneer", "Nandini Butter"],
  },
  {
    company: "Aavin",
    industry: "DAIRY",
    departments: [D.dairy],
    local: true,
    brands: ["Aavin Milk", "Aavin Ghee", "Aavin Butter", "Aavin Curd", "Aavin Khoa"],
  },
  {
    industry: "DAIRY",
    departments: [D.dairy],
    local: true,
    brands: [
      "Milma", "Heritage", "Dodla", "Tirumala", "Sangam", "Vijaya Dairy", "Thirumala Milk",
      "Gokul", "Verka", "Saras", "Vita", "Nova Dairy", "Jersey", "Creamline", "Sudha", "Omfed",
      "Aanmol", "Komul", "Hap Dairy", "Akshayakalpa", "Country Delight", "Sid's Farm", "Pavizham Dairy",
    ],
  },
  {
    company: "Coca-Cola India",
    industry: "BEVERAGES",
    departments: [D.beverages],
    brands: [
      "Coca-Cola", "Thums Up", "Sprite", "Fanta", "Limca", "Maaza", "Minute Maid", "Kinley",
      "Schweppes", "Charged", "Georgia", "Smartwater",
    ],
  },
  {
    company: "PepsiCo India",
    industry: "BEVERAGES",
    departments: [D.beverages],
    brands: [
      "Pepsi", "Mountain Dew", "7Up", "Mirinda", "Slice", "Tropicana", "Aquafina", "Sting", "Gatorade",
      { name: "Lay's", departments: [D.snacks] },
      { name: "Kurkure", departments: [D.snacks] },
      { name: "Doritos", departments: [D.snacks] },
      { name: "Cheetos", departments: [D.snacks] },
      { name: "Uncle Chipps", departments: [D.snacks] },
      { name: "Lehar", departments: [D.snacks] },
      { name: "Quaker", departments: [D.groceries, D.health] },
    ],
  },
  {
    company: "Bisleri International",
    industry: "BEVERAGES",
    departments: [D.beverages],
    brands: ["Bisleri", "Bisleri Vedica", "Limonata", "Spyci", "Bisleri Soda"],
  },
  {
    company: "Parle Agro",
    industry: "BEVERAGES",
    departments: [D.beverages],
    brands: ["Frooti", "Appy", "Appy Fizz", "Bailley", "B-Fizz", "Smoodh", "Dhishoom", "Cafe Cuba"],
  },
  {
    company: "Tata Consumer Products",
    industry: "FOOD",
    departments: [D.beverages],
    brands: [
      "Tata Tea", "Tetley", "Tata Tea Gold", "Tata Tea Agni", "Tata Tea Premium", "Tata Coffee Grand",
      "Himalayan", "Tata Copper Plus", "Tata Gluco Plus", "Tata Fruski",
      { name: "Tata Salt", departments: [D.groceries] },
      { name: "Tata Sampann", departments: [D.groceries] },
      { name: "Tata Soulfull", departments: [D.groceries, D.health] },
      { name: "Ching's Secret", departments: [D.groceries] },
      { name: "Tata Simply Better", departments: [D.groceries] },
      { name: "Eight O'Clock Coffee", departments: [D.beverages] },
    ],
  },
  {
    industry: "BEVERAGES",
    departments: [D.beverages],
    brands: [
      "Red Bull", "Monster Energy", "Paper Boat", "Rasna", "Roohafza", "Sosyo",
      { name: "Bovonto", local: true }, { name: "Kalimark", local: true }, "Wagh Bakri",
      "Society Tea", "Mangaldeep Tea", "Mango Sip", "Storia", "Raw Pressery", "Cofffeeza",
      "Sresta Drinks", "Jumpin",
    ],
  },
);


CANONICAL_BRAND_GROUPS.push(
  {
    company: "Haldiram's",
    industry: "FOOD",
    departments: [D.snacks],
    brands: ["Haldiram's Bhujia", "Haldiram's Namkeen", "Haldiram's Sweets", "Haldiram's Cookies", "Haldiram's Frozen", "Haldiram's Nuts"],
  },
  {
    company: "Adani Wilmar",
    industry: "FOOD",
    departments: [D.groceries],
    brands: ["Fortune Oil", "Fortune Atta", "Fortune Basmati Rice", "Fortune Besan", "Fortune Soya Chunks", "Kohinoor Rice"],
  },
  {
    company: "MTR Foods",
    industry: "FOOD",
    departments: [D.groceries],
    brands: ["MTR Masala", "MTR Breakfast Mix", "MTR Ready to Eat", "MTR Vermicelli", "MTR Spices", "MTR Rava Idli Mix"],
  },
  {
    company: "iD Fresh Food",
    industry: "FOOD",
    departments: [D.groceries],
    brands: [
      { name: "iD Idli Dosa Batter", departments: [D.groceries, D.regional] },
      { name: "iD Parota", departments: [D.frozen] },
      { name: "iD Filter Coffee Decoction", departments: [D.beverages] },
      { name: "iD Vada Batter", departments: [D.groceries] },
    ],
  },
  {
    industry: "FOOD",
    departments: [D.groceries],
    brands: [
      "India Gate", "Daawat", "Lal Qilla", "Kohinoor", "Double Deer", "Sungold", "Charminar Rice",
      "Idhayam", "Gold Winner", "Gemini Oil", "Sunpure", "Sweekar", "Dhara Oil", "Nature Fresh",
      "Sundrop", "Saffola Oil", "Freedom Oil", "Ruchi Gold", "Postman Oil", "Anjana Oil",
      "Catch", "Everest", "MDH", "Eastern", "Aachi Masala", "Sakthi Masala", "Aishwarya Masala",
      "Three Mango Masala", "Ramdev Masala", "Suhana", "Badshah Masala", "Goldiee", "Priya Foods",
      "Telugu Foods", "Pure & Sure", "24 Mantra Organic", "Organic India", "Conscious Food",
      "Daawat Rozana", "Kichdi", "Tata Sampann Dal", "Rajdhani Besan", "Aashirvaad Salt",
      "Annapurna Salt", "Captain Cook", "Nirvana Organic", "Manna", "Bambino", "Anil Vermicelli",
      "Bambino Vermicelli", "Gits", "Kohinoor Ready Meals", "Haldiram Minute Khana",
      "Ching's Schezwan", "Smith & Jones", "Veeba", "Funfoods", "Wingreens Farms", "Cremica",
      "Del Monte", "Borges", "Disano", "Figaro", "Leonardo Olive Oil", "Hershey's India",
      "Nutella India", "Kelloggs", "Bagrry's", "True Elements", "Yoga Bar", "RiteBite",
      "Soulfull", "Slurrp Farm", "Open Secret", "Happilo", "Nutraj", "Farmley", "Wonderland Foods",
      "Tata Coffee", "Continental Coffee", "Narasus Coffee", "Cothas Coffee", "Leo Coffee",
      "Kumbakonam Degree Coffee", "Sri Sai Coffee", "Blue Tokai", "Sleepy Owl",
    ],
  },
  {
    industry: "FOOD",
    departments: [D.snacks],
    brands: [
      "Bikaji", "Bikano", "Balaji Wafers", "Too Yumm", "Cornitos", "Act II", "4700BC Popcorn",
      "Beyond Snack", "Pringles", "Yellow Diamond", "Diamond Snacks", "Peppy", "Tedhe Medhe",
      "Crax", "Kurkure Puffcorn", "Garden Snacks", "Bingo Mad Angles", "Uncle Chips",
      "Parle Wafers", "Lay's India", "Haldiram Aloo Bhujia", "MAD Over Donuts", "Theobroma",
      "Unibic", "Priyagold", "Anmol Biscuits", "Cremica Biscuits", "Dukes", "Karachi Bakery",
      "Mio Amore", "RichFeel Cakes", "Monginis", "Cadbury Bytes", "Munchies", "Lotte Choco Pie",
      "Fanvi", "Beardo Snacks", "Snackible", "The Whole Truth", "Eat Anytime", "Max Protein",
    ],
  },
  {
    industry: "FOOD",
    departments: [D.regional],
    local: true,
    brands: [
      "Aachi", "Sakthi", "Gemini", "Anjana", "Modern Bread", "Grand Sweets", "A2B",
      "Adyar Ananda Bhavan", "Krishna Sweets", "Nellai Lala", "RKG Ghee", "Coconad", "Priyom",
      "Udhayam", "Double Horse", "Nirapara", "Pavizham", "Melam", "Eastern Curry Powder",
      "Brahmins", "Saras Foods", "Amma Naana", "KLF Nirmal", "Ramachandran's", "Sri Krishna Sweets",
      "Bombay Sweets", "GRB Ghee", "Cothas", "Narasus", "777 Pickles", "Mother's Recipe",
      "Bedekar", "Pravin Pickles", "Tops Pickles", "Nilon's", "Maa Foods",
    ],
  },
);


CANONICAL_BRAND_GROUPS.push(
  {
    company: "Samsung India",
    industry: "ELECTRONICS",
    departments: [D.electronics],
    brands: ["Samsung Galaxy", "Samsung TV", "Samsung Refrigerator", "Samsung Washing Machine", "Samsung Microwave", "Samsung AC"],
  },
  {
    company: "LG Electronics India",
    industry: "ELECTRONICS",
    departments: [D.electronics],
    brands: ["LG TV", "LG Refrigerator", "LG Washing Machine", "LG AC", "LG Microwave", "LG Monitor"],
  },
  {
    company: "Sony India",
    industry: "ELECTRONICS",
    departments: [D.electronics],
    brands: ["Sony Bravia", "Sony WH Headphones", "Sony PlayStation", "Sony Alpha", "Sony Soundbar"],
  },
  {
    company: "Panasonic India",
    industry: "ELECTRONICS",
    departments: [D.electronics],
    brands: ["Panasonic TV", "Panasonic AC", "Panasonic Trimmer", "Panasonic Microwave", "Eneloop"],
  },
  {
    company: "Imagine Marketing",
    industry: "ELECTRONICS",
    departments: [D.electronics],
    brands: ["boAt Airdopes", "boAt Rockerz", "boAt Stone", "boAt Wave", "boAt Storm", "boAt Lunar"],
  },
  {
    company: "Nexxbase",
    industry: "ELECTRONICS",
    departments: [D.electronics],
    brands: ["Noise ColorFit", "Noise Buds", "Noise Pulse", "Noise Air Buds"],
  },
  {
    company: "Xiaomi India",
    industry: "ELECTRONICS",
    departments: [D.electronics],
    brands: ["Redmi", "Mi TV", "Mi Power Bank", "Redmi Note", "Mi Band", "Poco"],
  },
  {
    company: "Havells India",
    industry: "APPLIANCES",
    departments: [D.electronics, D.home],
    brands: ["Havells Fans", "Havells Lighting", "Lloyd", "Havells Geyser", "Havells Mixer", "Havells Iron"],
  },
  {
    company: "Crompton Greaves Consumer",
    industry: "APPLIANCES",
    departments: [D.electronics, D.home],
    brands: ["Crompton Fans", "Crompton Pumps", "Crompton Geyser", "Crompton Lighting", "Crompton Mixer"],
  },
  {
    company: "Voltas",
    industry: "APPLIANCES",
    departments: [D.electronics],
    brands: ["Voltas AC", "Voltas Beko", "Voltas Air Cooler", "Voltas Refrigerator"],
  },
  {
    company: "Whirlpool of India",
    industry: "APPLIANCES",
    departments: [D.electronics],
    brands: ["Whirlpool Refrigerator", "Whirlpool Washing Machine", "Whirlpool AC", "Whirlpool Microwave"],
  },
  {
    industry: "ELECTRONICS",
    departments: [D.electronics],
    brands: [
      "OnePlus", "Oppo", "Vivo", "iQOO", "Realme", "Motorola", "Nokia", "Apple iPhone", "Lava",
      "Micromax", "Karbonn", "Intex", "Asus", "Acer", "HP", "Dell", "Lenovo", "MSI", "Logitech",
      "TP-Link", "D-Link", "Boult Audio", "pTron", "JBL", "Marshall", "Sennheiser", "Mivi",
      "Zebronics", "Portronics", "Ambrane", "Amazfit", "Fire-Boltt", "Garmin", "Fitbit",
      "Canon", "Nikon", "GoPro", "Toshiba", "Hitachi", "Daikin", "Blue Star", "Haier", "Onida",
      "BPL", "Godrej Appliances", "IFB", "Bajaj Electricals", "Usha", "Orient Electric", "V-Guard",
      "Anchor", "Wipro Lighting", "Syska", "Halonix", "Luminous", "Microtek", "Su-Kam", "Ambrane Power",
      "boAt Watch", "Fastrack Smart", "Realme TechLife", "Mi Smart", "Instacuppa", "Agaro",
      "Atomberg", "Symphony", "Bajaj Air Cooler", "Kenstar", "Maharaja Whiteline",
    ],
  },
  {
    company: "TTK Prestige",
    industry: "KITCHEN",
    departments: [D.kitchen],
    brands: ["Prestige Cooker", "Prestige Mixer Grinder", "Prestige Induction", "Prestige Gas Stove", "Prestige Cookware", "Prestige Tawa"],
  },
  {
    company: "Butterfly Gandhimathi",
    industry: "KITCHEN",
    departments: [D.kitchen],
    brands: ["Butterfly Mixer", "Butterfly Wet Grinder", "Butterfly Gas Stove", "Butterfly Cookware"],
  },
  {
    company: "Hamilton Housewares",
    industry: "KITCHEN",
    departments: [D.kitchen],
    brands: ["Milton Bottles", "Milton Casserole", "Milton Lunch Box", "Milton Flask", "Milton Tiffin"],
  },
  {
    industry: "KITCHEN",
    departments: [D.kitchen],
    brands: [
      "Hawkins", "Hawkins Futura", "Pigeon", "Vinod Cookware", "Wonderchef", "Stahl", "Cello Cookware",
      "Borosil", "La Opala", "Treo", "Signoraware", "Tupperware", "Pearlpet", "Nayasa", "Princeware",
      "All Time", "Premier Wet Grinder", "Elgi Ultra", "Sowbaghya", "Lakshmi Wet Grinder",
      "Preethi", "Sujata", "Bajaj Kitchen", "Philips Kitchen", "Morphy Richards", "Inalsa",
      "Kent Kitchen", "Faber", "Glen", "Elica", "Sunflame", "Kaff", "Cello Containers",
      "Prestige Svachh", "Nirlon", "Anjali Kitchenware", "Sumeet", "Greenchef",
    ],
  },
);


CANONICAL_BRAND_GROUPS.push(
  {
    company: "Aditya Birla Fashion",
    industry: "FASHION",
    departments: [D.fashion],
    brands: ["Louis Philippe", "Van Heusen", "Allen Solly", "Peter England", "Pantaloons", "People", "Sf Jeans", "American Eagle India"],
  },
  {
    company: "Titan Company",
    industry: "FASHION",
    departments: [D.fashion],
    brands: [
      "Titan Watches", "Fastrack", "Sonata", "Titan Raga", "Xylys", "Helios",
      { name: "Titan Eyeplus", departments: [D.fashion] },
      { name: "Tanishq", departments: [D.fashion] },
      { name: "Mia", departments: [D.fashion] },
      { name: "Fastrack Eyewear", departments: [D.fashion] },
    ],
  },
  {
    company: "Bata India",
    industry: "FOOTWEAR",
    departments: [D.fashion],
    brands: ["Bata", "Hush Puppies India", "Power", "North Star", "Bata Comfit", "Weinbrenner"],
  },
  {
    company: "Relaxo Footwears",
    industry: "FOOTWEAR",
    departments: [D.fashion],
    brands: ["Relaxo", "Sparx", "Flite", "Bahamas", "Relaxo Hawaii"],
  },
  {
    company: "Page Industries",
    industry: "FASHION",
    departments: [D.fashion],
    brands: ["Jockey", "Speedo India"],
  },
  {
    company: "Rupa & Company",
    industry: "FASHION",
    departments: [D.fashion],
    brands: ["Rupa", "Rupa Frontline", "Rupa Euro", "Rupa Macroman", "Rupa Softline", "Rupa Jon", "Rupa Thermocot"],
  },
  {
    industry: "FASHION",
    departments: [D.fashion],
    brands: [
      "Raymond", "Arrow", "Park Avenue", "ColorPlus", "Blackberrys", "Manyavar", "Mohey",
      "Fabindia", "Biba", "W for Woman", "Aurelia", "Global Desi", "Soch", "Libas", "Levi's",
      "Wrangler", "Lee", "Pepe Jeans", "Spykar", "Flying Machine", "Killer", "Mufti", "Numero Uno",
      "Jack & Jones", "U.S. Polo Assn.", "Tommy Hilfiger India", "Being Human", "Roadster", "HRX",
      "Puma India", "Nike India", "Adidas India", "Reebok India", "Skechers India", "Fila India",
      "Crocs India", "Woodland", "Red Tape", "Metro Shoes", "Mochi", "Khadims", "Lee Cooper",
      "Campus Shoes", "Asian Shoes", "Action Shoes", "VKC Pride", "Lotto India", "Liberty Shoes",
      "Paragon", "Dollar Industries", "Lux Cozi", "VIP Innerwear", "Amul Macho", "Dixcy Scott",
      "Enamor", "Zivame", "Clovia", "Triumph India", "Jockey Woman", "Casio India", "Fossil India",
      "Timex India", "Daniel Wellington India", "Ray-Ban India", "Lenskart", "John Jacobs",
      "Wildcraft", "American Tourister India", "VIP Bags", "Skybags", "Safari Bags", "Aristocrat",
      "Baggit", "Hidesign", "Caprese", "Lavie", "Da Milano", "Bewakoof", "The Souled Store",
      "Snitch", "XYXX", "Damensch", "Bummer", "Nicobar", "Anouk", "Max Fashion", "Westside",
      "Lifestyle", "Reliance Trends", "Zudio", "Wrogn", "Mast & Harbour",
    ],
  },
  {
    industry: "SPORTS",
    departments: [D.sports],
    brands: [
      "Cosco", "Nivia", "SG Cricket", "SS Cricket", "MRF Cricket", "Kookaburra India", "Yonex India",
      "Li-Ning India", "Decathlon", "Domyos", "Kipsta", "Quechua", "Hercules Cycles", "Hero Cycles",
      "BSA Cycles", "Firefox Bikes", "Btwin", "Vector 91", "Aerolite", "Stag Table Tennis",
      "GKI Sports", "Spinway", "Boldfit", "Aurion", "Kore Fitness", "Cockatoo", "AmazeFit Gym",
      "Strauss", "Slovic", "Lifelong Fitness", "PowerMax", "Cult Sport", "HRX Fitness",
    ],
  },
);


CANONICAL_BRAND_GROUPS.push(
  {
    company: "Honasa Consumer",
    industry: "BEAUTY",
    departments: [D.beauty, D.personal],
    brands: ["Mamaearth", "The Derma Co", "Aqualogica", "Dr. Sheth's", "BBlunt", "Staze"],
  },
  {
    company: "L'Oreal India",
    industry: "BEAUTY",
    departments: [D.beauty, D.personal],
    brands: ["L'Oreal Paris", "Garnier", "Maybelline", "Lakme Salon", "L'Oreal Professionnel", "Kerastase", "NYX India"],
  },
  {
    company: "Beiersdorf India",
    industry: "PERSONAL_CARE",
    departments: [D.personal],
    brands: ["Nivea", "Nivea Men", "Eucerin"],
  },
  {
    company: "Himalaya Wellness",
    industry: "PERSONAL_CARE",
    departments: [D.personal, D.health],
    brands: [
      "Himalaya Face Wash", "Himalaya Neem", "Himalaya Baby", "Himalaya Lip Balm",
      { name: "Liv 52", departments: [D.medicine, D.health] },
      { name: "Cystone", departments: [D.medicine, D.health] },
      { name: "Septilin", departments: [D.medicine, D.health] },
      { name: "Bonnisan", departments: [D.baby, D.medicine] },
    ],
  },
  {
    company: "Johnson & Johnson India",
    industry: "PERSONAL_CARE",
    departments: [D.baby, D.personal],
    brands: [
      { name: "Johnson's Baby", departments: [D.baby] },
      { name: "Stayfree", departments: [D.personal, D.health] },
      { name: "Carefree", departments: [D.personal, D.health] },
      { name: "Listerine", departments: [D.personal] },
      { name: "Band-Aid", departments: [D.health, D.medicine] },
      { name: "Neutrogena", departments: [D.beauty] },
      { name: "Aveeno", departments: [D.beauty, D.personal] },
    ],
  },
  {
    industry: "BEAUTY",
    departments: [D.beauty, D.personal],
    brands: [
      "WOW Skin Science", "Plum", "mCaffeine", "The Man Company", "Bombay Shaving Company",
      "Beardo Grooming", "Sugar Cosmetics", "Lotus Herbals", "VLCC", "Biotique", "Forest Essentials",
      "Khadi Natural", "Jovees", "Joy Cosmetics", "Nature's Essence", "Streax", "Schwarzkopf India",
      "Wella India", "Gatsby", "Brylcreem", "Denver", "Wild Stone", "Fogg", "Eva Deo", "Layer'r",
      "Mysore Sandal", "Medimix", "Chandrika Soap", "Cinthol Soap", "Pears Soap", "Park Avenue Deo",
      "Set Wet Deo", "Engage Deo", "Old Spice India", "Nivea Men India", "Ustraa", "Pilgrim",
      "Minimalist", "Dot & Key", "Earth Rhythm", "Plix", "Foxtale", "Nykaa", "Renee Cosmetics",
      "Colorbar", "Faces Canada", "Blue Heaven", "Insight Cosmetics", "Swiss Beauty", "MyGlamm",
      "Good Vibes", "Khadi Essentials", "Mamaearth Ubtan", "Soulflower", "Kama Ayurveda",
      "Forest Essentials Luxury", "Just Herbs Skincare", "Vaadi Herbals", "Patanjali Saundarya",
    ],
  },
  {
    industry: "BABY_CARE",
    departments: [D.baby],
    brands: [
      "Pampers India", "Huggies", "MamyPoko Pants", "Mee Mee", "Chicco", "Sebamed Baby", "Pigeon Baby",
      "LuvLap", "R for Rabbit", "Mother Sparsh", "Babyhug", "Little's", "Morisons Baby Dreams",
      "Himalaya Baby Care", "Cetaphil Baby", "Bumtum", "Supples", "Teddyy Diapers", "Snuggy",
      "Mylo", "The Moms Co", "Tinycare", "Farlin",
    ],
  },
  {
    company: "Mars Petcare India",
    industry: "PET_CARE",
    departments: [D.pet],
    brands: ["Pedigree", "Whiskas", "Sheba", "Royal Canin India", "Temptations"],
  },
  {
    company: "Drools",
    industry: "PET_CARE",
    departments: [D.pet],
    brands: ["Drools Dog Food", "Drools Cat Food", "Drools Treats"],
  },
  {
    industry: "PET_CARE",
    departments: [D.pet],
    brands: [
      "Purepet", "Farmina N&D", "Me-O", "Goodies", "Choostix", "JerHigh", "Henlo", "Wiggles",
      "Himalaya Pet", "Carniwel", "Fidele", "Signature Pet", "Let's Play Pet", "Dogsee Chew",
      "Pet Lovers Centre", "Heads Up For Tails", "Captain Zack", "Sploot", "Supertails",
    ],
  },
);


CANONICAL_BRAND_GROUPS.push(
  {
    company: "Cipla",
    industry: "PHARMA",
    departments: [D.medicine, D.health],
    brands: ["Cipla", "Cofsils", "Cipla Nicotex", "Cipladine", "Prolyte", "Maxirich", "Cipla Cetzine"],
  },
  {
    company: "Mankind Pharma",
    industry: "PHARMA",
    departments: [D.medicine, D.health],
    brands: ["Manforce", "Prega News", "Unwanted 72", "Gas-O-Fast", "HealthOK", "AcneStar", "Dr. Mom"],
  },
  {
    company: "Sun Pharma",
    industry: "PHARMA",
    departments: [D.medicine],
    brands: ["Volini", "Revital H", "Abzorb", "Faces Cosmetics", "Pepfiz"],
  },
  {
    company: "Abbott India",
    industry: "PHARMA",
    departments: [D.medicine, D.health],
    brands: ["Digene", "Cremaffin", "Brufen", "Vitamin Thiocolchicoside", "Ensure", "PediaSure", "Pedialyte"],
  },
  {
    company: "GlaxoSmithKline",
    industry: "PHARMA",
    departments: [D.medicine, D.health],
    brands: ["Crocin", "Iodex", "Eno", "Sensodyne", "Otrivin", "Ostocalcium", "Cetaphil"],
  },
  {
    company: "Zydus Wellness",
    industry: "PHARMA",
    departments: [D.health, D.medicine],
    brands: ["Nycil", "Glucon-D", "Complan", "Sugar Free", "Everyuth", "Nutralite"],
  },
  {
    industry: "HEALTH",
    departments: [D.health, D.medicine],
    brands: [
      "Dolo 650", "Saridon", "Combiflam", "Sinarest", "D'Cold", "Vicks Action 500", "Ascoril",
      "Benadryl", "Gelusil", "Electral", "ORSL", "Becosules", "Zincovit", "Limcee", "Neurobion",
      "Shelcal", "Calcirol", "A to Z Multivitamin", "Supradyn", "Revital", "Seven Seas",
      "Himalaya Wellness Tablets", "Dabur Honitus", "Tata 1mg", "Netmeds Brand", "Apollo Pharmacy",
      "Wellbeing Nutrition", "HealthKart", "MuscleBlaze", "Optimum Nutrition India", "GNC India",
      "Carbamide Forte", "TrueBasics", "OZiva", "Kapiva", "Plix Health", "Setu Nutrition",
      "Fast&Up", "Steadfast Nutrition", "Hansaplast", "Dettol Antiseptic", "Savlon Antiseptic",
      "Soframycin", "Burnol", "Amrutanjan", "Tiger Balm India", "Vicks VapoRub", "Itch Guard",
      "Ring Guard", "Krack Cream", "Boroline", "Borosoft", "Omnigel", "Dr. Ortho", "Volini Spray",
      "Moov Spray", "Relispray", "ENO Fruit Salt", "Pudin Hara Pearls", "Kayam Churna",
    ],
  },
);


CANONICAL_BRAND_GROUPS.push(
  {
    industry: "HOUSEHOLD",
    departments: [D.household, D.cleaning],
    brands: [
      "Ghadi Detergent", "Tide Plus", "Rin Advanced", "Wheel Active", "Surf Excel Matic", "Ariel Matic",
      "Henko Matic", "Mr. White Detergent", "Patanjali Herbal Wash", "Genteel Liquid", "Ezee Liquid",
      "Comfort Fabric", "Stayfree Secure", "Colin", "Mr. Muscle", "Lizol Floor", "Harpic Power",
      "Domex Toilet", "Sanifresh Shine", "Toilex", "All Out", "Good Knight Gold Flash", "Mortein Spray",
      "Hit Anti Roach", "Maxo Coil", "Lal Hit", "Real Magic", "Pitambari", "Gainda Phenyl",
      "Bonus Detergent", "Fena", "Power Detergent", "Tide Bar", "Rin Bar", "555 Detergent",
      "Ujala Supreme", "Ranipal", "Robin Blue", "Stiff & Shine", "Patanjali Dishwash",
      "Vim Bar", "Pril Dishwash", "Exo Dishwash", "Nirma Clean", "Scotch-Brite", "Gala Mop",
      "Spotzero", "Selvel", "Treo Cleaning", "Origami Tissues", "Premium Tissues", "Beco",
      "Garbage Bags Ezee", "Presto", "Mangaldeep Agarbatti", "Cycle Agarbatti", "Moksh Agarbatti",
      "Zed Black", "Hari Darshan", "Patanjali Dhoop", "Iris Incense", "Sandesh Agarbatti",
      "Denim Battery", "Eveready", "Nippo", "Duracell India",
    ],
  },
  {
    company: "Pidilite Industries",
    industry: "STATIONERY",
    departments: [D.stationery, D.home],
    brands: ["Fevicol", "Fevistick", "Fevikwik", "M-Seal", "Dr. Fixit", "Fevicryl", "Fevviquick"],
  },
  {
    company: "Kokuyo Camlin",
    industry: "STATIONERY",
    departments: [D.stationery],
    brands: ["Camlin", "Camel", "Camlin Kokuyo Pens", "Camlin Geometry", "Camel Colours"],
  },
  {
    company: "Navneet Education",
    industry: "STATIONERY",
    departments: [D.stationery],
    brands: ["Navneet", "Navneet Youva", "Boss Notebooks", "Vibgyor Notebooks"],
  },
  {
    industry: "STATIONERY",
    departments: [D.stationery],
    brands: [
      "Nataraj", "Apsara", "Doms", "Faber-Castell India", "Reynolds", "Parker India", "Luxor",
      "Pilot India", "Add Gel", "Linc Pens", "Montex", "Flair Pens", "Rotomac", "Kores", "Pentonic",
      "Sundaram Stationery", "Oxford Notebooks", "JK Paper", "Bilt", "Staedtler India", "Maped India",
      "Cello Pens", "Classmate Pens", "Hauser", "Trimax", "Cellofil", "Worldone", "Solo Files",
      "Kangaroo Staplers", "Kores Gum", "3M Post-it",
    ],
  },
  {
    company: "Castrol India",
    industry: "AUTOMOTIVE",
    departments: [D.automotive],
    brands: ["Castrol", "Castrol Activ", "Castrol Power1", "Castrol Magnatec", "Castrol GTX", "Castrol CRB"],
  },
  {
    industry: "AUTOMOTIVE",
    departments: [D.automotive],
    brands: [
      "Servo", "Shell Lubricants India", "Mobil India", "Gulf Oil India", "Valvoline India", "Veedol",
      "HP Lubricants", "Bosch Auto", "Exide Battery", "Amaron Battery", "MRF Tyres", "CEAT Tyres",
      "Apollo Tyres", "JK Tyre", "Bridgestone India", "Michelin India", "Goodyear India", "TVS Tyres",
      "Motul India", "3M Car Care", "Wurth India", "Formula 1 Wax", "Sonax India", "Studds Helmets",
      "Vega Helmets", "Steelbird Helmets", "Wheels India", "Pidilite Automotive", "Abro India",
      "Waxpol", "Bosch Wipers", "Lumax", "Minda", "Pricol", "Elofic Filters", "Purolator India",
    ],
  },
  {
    industry: "OTHER",
    departments: [D.home, D.kitchen],
    brands: [
      "Bombay Dyeing", "Welspun", "Trident Home", "Spaces", "Portico", "Raymond Home", "D'Decor",
      "Story@Home", "Solimo", "Amazon Basics India", "Wakefit", "Sleepwell", "Kurlon", "Duroflex",
      "Sleepyhead", "The Sleep Company", "Centuary Mattress", "Nilkamal", "Cello Furniture",
      "Supreme Furniture", "Prestige Home", "Pigeon Home", "Hindware", "Cera", "Jaquar",
      "Parryware", "Kohler India", "Asian Paints", "Berger Paints", "Nerolac", "Dulux India",
      "Pidilite Wall", "Sleepwell Pillows", "Recron", "Bombay Shaving Home",
    ],
  },
);


/**
 * Expands the canonical companies + brand groups into deterministic engine inputs. Brands are
 * de-duplicated by slug (first occurrence wins). Company ids are slugs of the company name.
 */
export function buildCanonicalBrandInputs(): { companies: CompanyInput[]; brands: BrandInput[] } {
  const companyBySlug = new Map<string, CompanyInput>();

  for (const seed of CANONICAL_COMPANIES) {
    const slug = slugify(seed.name);
    companyBySlug.set(slug, {
      id: slug,
      name: seed.name,
      slug,
      industry: seed.industry,
      foundedYear: seed.founded ?? null,
      aliases: seed.aliases ?? [],
      parentCompanyId: seed.parent ? slugify(seed.parent) : null,
    });
  }

  const ensureCompany = (name: string, industry: BrandIndustry): string => {
    const slug = slugify(name);
    if (!companyBySlug.has(slug)) {
      companyBySlug.set(slug, { id: slug, name, slug, industry, aliases: [] });
    }
    return slug;
  };

  const brands: BrandInput[] = [];
  const seen = new Set<string>();

  for (const group of CANONICAL_BRAND_GROUPS) {
    const companyId = group.company ? ensureCompany(group.company, group.industry) : null;
    for (const entry of group.brands) {
      const definition = typeof entry === "string" ? { name: entry } : entry;
      const slug = slugify(definition.name);
      if (seen.has(slug)) continue;
      seen.add(slug);
      brands.push({
        id: slug,
        name: definition.name,
        slug,
        companyId,
        industry: definition.industry ?? group.industry,
        departments: definition.departments ?? group.departments,
        aliases: definition.aliases ?? [],
        isLocalBrand: definition.local ?? group.local ?? false,
        verificationStatus: "VERIFIED",
        country: "IN",
        originRegion: (definition.local ?? group.local) ? "TN" : null,
      });
    }
  }

  return { companies: Array.from(companyBySlug.values()), brands };
}
