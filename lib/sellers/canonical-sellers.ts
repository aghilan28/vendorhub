import { slugify } from "@/lib/taxonomy";
import type { CommerceRegion } from "@/types/commerce-foundation";
import { STORE_TYPE_DEPARTMENTS } from "./classification";
import type { BusinessType, SellerInput, SellerType, StoreInput, StoreLocation, StoreType } from "./types";

/**
 * Canonical real Indian retail chains (SP-1). Real, traceable businesses only. The population engine
 * expands each chain into regional operating sellers and city store outlets (real multi-region /
 * multi-outlet retail structure), reaching 1,000+ sellers and 5,000+ stores.
 */

const ALL: CommerceRegion[] = ["TN", "KL", "KA", "AP", "TS"];

export const REGION_LABEL: Record<CommerceRegion, string> = {
  TN: "Tamil Nadu",
  KL: "Kerala",
  KA: "Karnataka",
  AP: "Andhra Pradesh",
  TS: "Telangana",
};

export const REGION_CITIES: Record<CommerceRegion, string[]> = {
  TN: ["Chennai", "Coimbatore", "Madurai", "Tiruchirapalli", "Salem", "Tirunelveli", "Erode", "Vellore"],
  KL: ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Alappuzha", "Palakkad"],
  KA: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi", "Davanagere", "Tumakuru", "Shivamogga"],
  AP: ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore", "Rajahmundry", "Kakinada", "Kurnool"],
  TS: ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam", "Ramagundam", "Mahbubnagar", "Siddipet"],
};

interface ChainSeed {
  name: string;
  storeType: StoreType;
  businessType: BusinessType;
  regions: CommerceRegion[];
}

function chains(storeType: StoreType, businessType: BusinessType, entries: (string | [string, CommerceRegion[]])[]): ChainSeed[] {
  return entries.map((entry) => {
    const [name, regions] = Array.isArray(entry) ? entry : [entry, ALL];
    return { name, storeType, businessType, regions };
  });
}

export const CANONICAL_CHAINS: ChainSeed[] = [
  ...chains("SUPERMARKET", "PUBLIC_LIMITED", [
    "Reliance Fresh", "Reliance Smart", "DMart", "More Supermarket", "Spencer's Retail", "Star Bazaar",
    "Spar Supermarket", "Nilgiris", "Heritage Fresh", "Foodworld", "Nature's Basket", "Vishal Mega Mart",
    "V-Mart", "EasyDay", ["Ratnadeep Super Market", ["TS", "AP"]], ["Vijetha Supermarkets", ["TS", "AP"]],
    ["Q Mart", ["TS"]], ["Trinethra", ["AP", "TS"]], ["MK Retail", ["KA"]], ["Namdhari's Fresh", ["KA"]],
    ["Nuts n Spices", ["TN"]], ["Amma Naana", ["TN"]], ["Pazhamudir Nilayam", ["TN"]], ["KPN Fresh", ["TN"]],
    ["Magna Super Mart", ["TN"]], ["Grand Mart", ["KL"]], ["Lulu Hypermarket", ["KL", "KA", "TS"]],
  ]),
  ...chains("HYPERMARKET", "PUBLIC_LIMITED", [
    "Spar Hypermarket", "Star Hyper", "Metro Cash and Carry", "Best Price", "Reliance Smart Bazaar",
    "Big Bazaar", "HyperCity",
  ]),
  ...chains("GROCERY", "PROPRIETORSHIP", [
    ["Saravana Stores", ["TN"]], ["Ratna Stores", ["TN"]], ["Jayam Stores", ["TN"]], ["Sri Kannan Departmental Store", ["TN"]],
    ["Pavithra Super Market", ["TN"]], ["Subhiksha Mart", ["TN"]], ["Sri Balaji Stores", ["AP", "TS"]],
    ["Vasanth Stores", ["TN"]], ["Anjali Stores", ["KA"]], ["Maruthi Stores", ["KA"]], ["Vasudeva Stores", ["KL"]],
    ["Padmavathi Stores", ["AP"]], ["Sri Lakshmi Stores", ["TS"]], "Aadhaar Retailing",
  ]),
  ...chains("PHARMACY", "PRIVATE_LIMITED", [
    "Apollo Pharmacy", "MedPlus", "Netmeds", "Wellness Forever", "Aster Pharmacy", "Guardian Pharmacy",
    "Frankross Pharmacy", "Generico", "Sagar Medicals", "Trust Pharmacy", ["KIMS Pharmacy", ["TS", "AP"]],
    ["Hetero Pharmacy", ["TS", "AP"]], ["Care Pharmacy", ["TS"]], ["Medall Pharmacy", ["TN"]], "PharmEasy Store",
    "Tata 1mg Store",
  ]),
  ...chains("BAKERY", "PROPRIETORSHIP", [
    ["Hot Breads", ["TN", "KA"]], ["Daily Bread", ["KA"]], "Iyengar Bakery", ["Universal Bakery", ["KA"]],
    ["French Loaf", ["TN"]], ["Cake Walk", ["TN"]], ["Brindavan Bakery", ["TN"]], ["Adyar Bakery", ["TN"]],
    ["Karachi Bakery", ["TS"]], ["Sri Krishna Bakery", ["KA"]], "Monginis", ["Thalassery Bakery", ["KL"]],
  ]),
  ...chains("SWEETS", "PROPRIETORSHIP", [
    ["Adyar Ananda Bhavan", ["TN", "KA"]], ["Grand Sweets and Snacks", ["TN"]], ["Sri Krishna Sweets", ["TN", "KA"]],
    ["Krishna Sweets", ["TN"]], ["Almond House", ["TS"]], ["Pulla Reddy Sweets", ["TS", "AP"]],
    ["Bhimas", ["AP", "TS"]], ["Anand Sweets", ["KA"]], ["Asha Sweets", ["KA"]], ["Bombay Sweets", ["KL"]],
    ["Nellai Lala Sweets", ["TN"]],
  ]),
  ...chains("ELECTRONICS", "PRIVATE_LIMITED", [
    "Croma", "Reliance Digital", "Vijay Sales", ["Sangeetha Mobiles", ["KA", "TN", "AP", "TS"]],
    ["Poorvika Mobiles", ["TN", "KA", "KL"]], ["Sathya Agencies", ["TN"]], ["Viveks", ["TN"]], ["Girias", ["TN", "KA"]],
    ["Bajaj Electronics", ["TS", "AP"]], ["LOT Mobiles", ["TS", "AP"]], ["Big C Mobiles", ["AP", "TS"]],
    ["Univercell", ["TN"]], ["Pai International", ["KA"]], ["National Electronics", ["TS"]], "The Mobile Store",
    ["Cellbay", ["AP", "TS"]],
  ]),
  ...chains("FASHION", "PUBLIC_LIMITED", [
    "Pantaloons", "Max Fashion", "Reliance Trends", "Westside", "Lifestyle", "Zudio",
    ["Pothys", ["TN"]], ["RmKV", ["TN"]], ["The Chennai Silks", ["TN"]], ["Nalli", ["TN", "KA"]],
    ["Jayachandran Textiles", ["KL"]], ["Kalyan Silks", ["KL"]], ["Seematti", ["KL"]], ["Chennai Silks", ["TN"]],
    ["Pothys Trends", ["TN"]], ["Sree Kumaran", ["TN"]],
  ]),
  ...chains("HOUSEHOLD", "PRIVATE_LIMITED", [
    "Home Centre", "@Home", "Evok", ["Saravana Home", ["TN"]], "Khadi Bhavan", ["Co-optex", ["TN"]],
    ["Poompuhar", ["TN"]], "Urban Ladder Store", "Pepperfry Studio",
  ]),
  ...chains("STATIONERY", "PROPRIETORSHIP", [
    ["Sapna Book House", ["KA"]], ["Higginbothams", ["TN"]], "Crossword", ["Odyssey", ["TN"]], "Staples India",
    ["Navakarnataka", ["KA"]],
  ]),
  ...chains("POOJA", "PROPRIETORSHIP", [
    ["Giri Trading Agency", ["TN", "KA"]], ["Poompuhar Crafts", ["TN"]], ["Sri Sai Pooja Stores", ["TS", "AP"]],
    ["Mylapore Pooja Mart", ["TN"]],
  ]),
  ...chains("FRESH_PRODUCE", "PRIVATE_LIMITED", [
    "FreshToHome Produce", "Waycool Outlet", ["Just Organik", ["KA"]], ["Namdhari Fresh Produce", ["KA"]],
    ["Heritage Fresh Farms", ["AP", "TS"]],
  ]),
  ...chains("MEAT", "PRIVATE_LIMITED", ["Licious", "TenderCuts", "Meatigo", "Zappfresh", ["Real Chicken", ["TN"]]]),
  ...chains("FISH", "PRIVATE_LIMITED", ["FreshToHome Fish", ["Cambay Fresh", ["KL"]], ["Fipola", ["TN"]]]),
  ...chains("PET_SUPPLIES", "PRIVATE_LIMITED", ["Heads Up For Tails", "Supertails Store", "Just Dogs", ["Pet Zone", ["TN"]]]),
  ...chains("BABY_CARE", "PUBLIC_LIMITED", ["FirstCry", "Mom and Me", "Hopscotch Store", "Babyhug Store"]),
  ...chains("HEALTH", "PRIVATE_LIMITED", ["Health and Glow", "Nykaa Store", "The Body Shop", ["VLCC Wellness", ["TN", "KA", "TS"]]]),
  ...chains("SPECIALTY", "PROPRIETORSHIP", [
    ["A2B Specialty", ["TN"]], ["Karaikudi Chettinad Store", ["TN"]], ["Coorg Specialty", ["KA"]],
    ["Araku Coffee Store", ["AP"]], ["Malabar Specialty", ["KL"]], ["Hyderabadi Bazaar", ["TS"]],
  ]),
  ...chains("SUPERMARKET", "PRIVATE_LIMITED", [
    "Reliance Fresh Signature", "More Quick", "Spencer's Smart", "Star Daily", ["Apna Bazar", ["KA"]],
    ["Sahakari Bhandar", ["KA"]], ["Margin Free Market", ["KL"]], ["Triveni Supermarket", ["KA"]],
    ["Sri Gopal Stores", ["TN"]], ["Pai Fresh", ["KA"]], ["Vishal Fresh", ["TS", "AP"]], "JioMart Store",
  ]),
  ...chains("GROCERY", "PROPRIETORSHIP", [
    ["Velavan Stores", ["TN"]], ["Sri Murugan Stores", ["TN"]], ["Annapoorna Stores", ["TN"]],
    ["Sri Venkateswara Stores", ["AP", "TS"]], ["Janatha Stores", ["KL"]], ["Supplyco", ["KL"]],
    ["Kannan Departmental", ["TN"]], ["Sri Devi Stores", ["KA"]], ["Balaji Grand Bazaar", ["TS"]],
    ["Sri Ranga Stores", ["AP"]],
  ]),
  ...chains("PHARMACY", "PRIVATE_LIMITED", [
    "Apollo 24x7", "Davaindia", "Dawaa Dost", ["Noble Plus", ["KL"]], ["LifeCare Pharmacy", ["TS", "AP"]],
    ["CarePlus Pharmacy", ["TN"]], ["Religare Wellness", ["KA"]],
  ]),
  ...chains("SWEETS", "PROPRIETORSHIP", [
    ["Kanti Sweets", ["KA"]], ["Sri Venkateswara Sweets", ["AP", "TS"]], ["Cake Bee", ["TN"]],
    ["Sugar and Spice", ["KA"]], ["Hangyo", ["KA"]], ["Lakshmi Sweets", ["TN"]], ["Ganga Sweets", ["TN"]],
  ]),
  ...chains("ELECTRONICS", "PRIVATE_LIMITED", [
    ["Happi Mobiles", ["AP", "TS"]], ["Maa Mobiles", ["AP", "TS"]], ["Lot Mobiles", ["AP", "TS"]],
    ["Adishwar India", ["TS"]], ["GreatWhite Electronics", ["TN"]], ["Saravana Electronics", ["TN"]],
    "Reliance Digital Express",
  ]),
  ...chains("FASHION", "PUBLIC_LIMITED", [
    ["GRT Jewellers", ["TN", "KA", "AP"]], ["Lalitha Jewellery", ["TN", "AP", "TS"]], "Joyalukkas",
    "Kalyan Jewellers", "Malabar Gold and Diamonds", ["Saravana Selvarathnam", ["TN"]],
    ["Sree Kumaran Thangamaligai", ["TN"]], ["Prince Jewellery", ["TN"]], "Reliance Jewels",
    ["Pothys Wedding", ["TN"]], ["Chennai Silks Trends", ["TN"]],
  ]),
  ...chains("BABY_CARE", "PRIVATE_LIMITED", [["Baby Shop", ["KL", "KA"]], ["Kids World", ["TN"]], "R for Rabbit Store"]),
  ...chains("HEALTH", "PRIVATE_LIMITED", [["Naturals Care", ["TN"]], ["Sri Sri Tattva Store", ["KA"]], "Patanjali Store", "Organic World"]),
  ...chains("HOUSEHOLD", "PRIVATE_LIMITED", [["Chumbak Home", ["KA"]], "FabIndia Home", ["Karnataka Emporium", ["KA"]]]),
];

function smallHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function makeLocation(city: string, region: CommerceRegion): StoreLocation {
  const hash = smallHash(`${city}-${region}`);
  return {
    city,
    area: `${city} Central`,
    region,
    pincode: String(500000 + (hash % 99999)),
    latitude: Number((8 + (hash % 800) / 100).toFixed(4)),
    longitude: Number((74 + (hash % 600) / 100).toFixed(4)),
  };
}

function sellerTypeFor(chain: ChainSeed): SellerType {
  return chain.regions.length >= 4 ? "ENTERPRISE" : chain.regions.length >= 2 ? "CHAIN" : "REGIONAL";
}

export interface SellerUniverseOptions {
  /** Max city outlets generated per regional seller. */
  outletsPerSeller?: number;
}

/** Real multi-format operating structures (chains run several store formats as separate entities). */
const STORE_FORMATS: Partial<Record<StoreType, string[]>> = {
  SUPERMARKET: ["", "Express"],
  PHARMACY: ["", "24x7"],
  ELECTRONICS: ["", "Mini"],
  GROCERY: ["", "Daily"],
};

/**
 * Generates the canonical seller + store universe: each real chain becomes a national parent seller
 * plus one regional operating seller per region per store-format, and each regional seller gets city
 * store outlets.
 */
export function generateSellerUniverse(options: SellerUniverseOptions = {}): { sellers: SellerInput[]; stores: StoreInput[] } {
  const outletsCap = options.outletsPerSeller ?? 8;
  const sellers: SellerInput[] = [];
  const stores: StoreInput[] = [];
  const seenChains = new Set<string>();

  for (const chain of CANONICAL_CHAINS) {
    const chainId = slugify(chain.name);
    if (seenChains.has(chainId)) continue;
    seenChains.add(chainId);

    sellers.push({
      id: chainId,
      name: chain.name,
      sellerType: sellerTypeFor(chain),
      businessType: chain.businessType,
      homeRegion: chain.regions[0],
      parentChainId: null,
      metadata: { storeType: chain.storeType, role: "national-parent" },
    });

    const formats = STORE_FORMATS[chain.storeType] ?? [""];
    for (const format of formats) {
      const formatSlug = format ? `__${slugify(format)}` : "";
      const formatLabel = format ? ` ${format}` : "";
      for (const region of chain.regions) {
        const regionalId = `${chainId}${formatSlug}-${region.toLowerCase()}`;
        sellers.push({
          id: regionalId,
          name: `${chain.name}${formatLabel} ${REGION_LABEL[region]}`,
          sellerType: "REGIONAL",
          businessType: chain.businessType,
          homeRegion: region,
          parentChainId: chainId,
          metadata: { storeType: chain.storeType, role: "regional-operator", format: format || "standard" },
        });

        for (const city of REGION_CITIES[region].slice(0, outletsCap)) {
          stores.push({
            id: `${regionalId}-${slugify(city)}`,
            name: `${chain.name}${formatLabel} ${city}`,
            storeType: chain.storeType,
            departments: STORE_TYPE_DEPARTMENTS[chain.storeType],
            sellerId: regionalId,
            description: `${chain.name}${formatLabel} ${chain.storeType.toLowerCase().replace(/_/g, " ")} outlet in ${city}, ${REGION_LABEL[region]}.`,
            location: makeLocation(city, region),
          });
        }
      }
    }
  }

  return { sellers, stores };
}
