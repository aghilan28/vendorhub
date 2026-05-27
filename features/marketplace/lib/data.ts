import { OrderStatus, PaymentStatus, ProductStatus, type Category, type Order, type Product, type Vendor } from "@/types";
import { calculateOrderPricing } from "@/features/transactions/pricing";
import { createRazorpaySandboxIntent } from "@/features/payments/razorpay-sandbox";

export const marketplaceVendors: Vendor[] = [
  {
    id: "vendor-morning-basket",
    name: "T. Nagar Morning Basket",
    slug: "t-nagar-morning-basket",
    rating: 4.8,
    serviceStatus: "open",
    fulfillmentPromiseMinutes: 22,
    locality: "T. Nagar",
    city: "Chennai",
    area: "Pondy Bazaar",
    latitude: 13.0418,
    longitude: 80.2341,
    serviceRadiusKm: 4.5,
    coverageNote: "Dense kirana and fresh produce coverage across T. Nagar, Nandanam, and West Mambalam.",
    verified: true,
    orderCount: 12400,
  },
  {
    id: "vendor-daily-pantry",
    name: "Anna Nagar Daily Pantry",
    slug: "anna-nagar-daily-pantry",
    rating: 4.6,
    serviceStatus: "busy",
    fulfillmentPromiseMinutes: 31,
    locality: "Anna Nagar",
    city: "Chennai",
    area: "Second Avenue",
    latitude: 13.085,
    longitude: 80.2101,
    serviceRadiusKm: 5.2,
    coverageNote: "Residential pantry coverage for Anna Nagar, Shenoy Nagar, and Kilpauk edge zones.",
    verified: true,
    orderCount: 8200,
  },
  {
    id: "vendor-cantonment-bakehouse",
    name: "Mylapore Bakehouse",
    slug: "mylapore-bakehouse",
    rating: 4.9,
    serviceStatus: "open",
    fulfillmentPromiseMinutes: 18,
    locality: "Mylapore",
    city: "Chennai",
    area: "Luz Corner",
    latitude: 13.0339,
    longitude: 80.2695,
    serviceRadiusKm: 3.8,
    coverageNote: "Fresh bakery radius optimized for Mylapore, Alwarpet, and Mandaveli.",
    verified: true,
    orderCount: 15600,
  },
  {
    id: "vendor-whitefield-care",
    name: "Adyar Care Pharmacy",
    slug: "adyar-care-pharmacy",
    rating: 4.7,
    serviceStatus: "open",
    fulfillmentPromiseMinutes: 26,
    locality: "Adyar",
    city: "Chennai",
    area: "LB Road",
    latitude: 13.0067,
    longitude: 80.2574,
    serviceRadiusKm: 4.2,
    coverageNote: "Care and wellness delivery across Adyar, Besant Nagar, and Thiruvanmiyur edges.",
    verified: true,
    orderCount: 9300,
  },
  {
    id: "vendor-koramangala-tech",
    name: "Velachery Tech Corner",
    slug: "velachery-tech-corner",
    rating: 4.5,
    serviceStatus: "open",
    fulfillmentPromiseMinutes: 34,
    locality: "Velachery",
    city: "Chennai",
    area: "Bypass Road",
    latitude: 12.9791,
    longitude: 80.218,
    serviceRadiusKm: 5.8,
    coverageNote: "Office and apartment electronics coverage through Velachery and Guindy corridors.",
    verified: true,
    orderCount: 6200,
  },
  {
    id: "vendor-hsr-home",
    name: "Tambaram Home Utility",
    slug: "tambaram-home-utility",
    rating: 4.4,
    serviceStatus: "open",
    fulfillmentPromiseMinutes: 37,
    locality: "Tambaram",
    city: "Chennai",
    area: "East Tambaram",
    latitude: 12.9249,
    longitude: 80.1,
    serviceRadiusKm: 6.5,
    coverageNote: "Wider household utility radius for Tambaram, Selaiyur, and Chromepet.",
    verified: true,
    orderCount: 5400,
  },
  {
    id: "vendor-jayanagar-fresh",
    name: "Besant Fresh Co",
    slug: "besant-fresh-co",
    rating: 4.7,
    serviceStatus: "busy",
    fulfillmentPromiseMinutes: 28,
    locality: "Besant Nagar",
    city: "Chennai",
    area: "Beach Road",
    latitude: 13.0002,
    longitude: 80.2668,
    serviceRadiusKm: 3.6,
    coverageNote: "Fresh produce and breakfast coverage for Besant Nagar, Adyar, and Thiruvanmiyur.",
    verified: true,
    orderCount: 7600,
  },
  {
    id: "vendor-rajajinagar-sports",
    name: "OMR Sports & Steps",
    slug: "omr-sports-steps",
    rating: 4.3,
    serviceStatus: "open",
    fulfillmentPromiseMinutes: 42,
    locality: "Thoraipakkam",
    city: "Chennai",
    area: "OMR",
    latitude: 12.9416,
    longitude: 80.2362,
    serviceRadiusKm: 6.2,
    coverageNote: "Fitness and commute products across OMR apartment and office pockets.",
    verified: true,
    orderCount: 4100,
  },
  {
    id: "vendor-ulsoor-gourmet",
    name: "Nungambakkam Gourmet Pantry",
    slug: "nungambakkam-gourmet-pantry",
    rating: 4.8,
    serviceStatus: "open",
    fulfillmentPromiseMinutes: 30,
    locality: "Nungambakkam",
    city: "Chennai",
    area: "Khader Nawaz Khan Road",
    latitude: 13.0569,
    longitude: 80.2425,
    serviceRadiusKm: 4.8,
    coverageNote: "Prepared meals and premium pantry coverage for central Chennai neighborhoods.",
    verified: true,
    orderCount: 6900,
  },
  {
    id: "vendor-rt-nagar-baby",
    name: "Porur Baby & Care",
    slug: "porur-baby-care",
    rating: 4.6,
    serviceStatus: "open",
    fulfillmentPromiseMinutes: 33,
    locality: "Porur",
    city: "Chennai",
    area: "Mount Poonamallee Road",
    latitude: 13.0382,
    longitude: 80.1565,
    serviceRadiusKm: 6.0,
    coverageNote: "Baby and family care coverage for Porur, Valasaravakkam, and Ramapuram.",
    verified: true,
    orderCount: 4800,
  },
];

export const marketplaceCategories: Category[] = [
  {
    id: "cat-fresh-produce",
    name: "Fresh Produce",
    slug: "fresh-produce",
    description: "Vegetables, herbs, and fruits sorted for same-day cooking.",
    imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
    productCount: 96,
  },
  {
    id: "cat-bakery",
    name: "Bakery & Breakfast",
    slug: "bakery-breakfast",
    description: "Fresh breads, breakfast staples, and early-morning bakery packs.",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80",
    productCount: 42,
  },
  {
    id: "cat-home",
    name: "Home Essentials",
    slug: "home-essentials",
    description: "Cleaning, pantry, and household supplies from nearby sellers.",
    imageUrl: "https://images.unsplash.com/photo-1583947581924-860bda6a26df?auto=format&fit=crop&w=900&q=80",
    productCount: 73,
  },
  {
    id: "cat-care",
    name: "Personal Care",
    slug: "personal-care",
    description: "Everyday care and wellness basics with verified seller handling.",
    imageUrl: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80",
    productCount: 58,
  },
  {
    id: "cat-meals",
    name: "Ready Meals",
    slug: "ready-meals",
    description: "Prepared snacks, meal kits, and neighborhood kitchen favorites.",
    imageUrl: "https://images.unsplash.com/photo-1543352634-a1c51d9f1fa7?auto=format&fit=crop&w=900&q=80",
    productCount: 38,
  },
  {
    id: "cat-electronics",
    name: "Electronics",
    slug: "electronics",
    description: "Useful accessories, audio, and work-from-home essentials from nearby stores.",
    imageUrl: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=900&q=80",
    productCount: 64,
  },
  {
    id: "cat-lifestyle",
    name: "Lifestyle",
    slug: "lifestyle",
    description: "Footwear, seating, and daily-use products selected for local availability.",
    imageUrl: "https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&w=900&q=80",
    productCount: 51,
  },
];

const [
  morningBasket,
  dailyPantry,
  bakehouse,
  carePharmacy,
  techCorner,
  homeUtility,
  jayanagarFresh,
  sportsSteps,
  gourmetPantry,
  babyCare,
] = marketplaceVendors;
const [freshProduce, bakery, homeEssentials, personalCare, readyMeals, electronics, lifestyle] = marketplaceCategories;

export const coreMarketplaceProducts: Product[] = [
  {
    id: "kx-tomato-pack",
    slug: "nandi-valley-tomato-pack-1kg",
    name: "Nandi Valley Tomato Pack 1 kg",
    vendor: morningBasket,
    category: freshProduce,
    imageUrl: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=900&q=80",
    price: 48,
    originalPrice: 62,
    currency: "INR",
    rating: 4.8,
    reviewCount: 214,
    stockCount: 86,
    unit: "1 kg",
    deliveryMinutes: 22,
    status: ProductStatus.Active,
    tags: ["Same-day sorted", "Popular nearby"],
    description: "Firm tomatoes from a Nandi Valley supplier, sorted for chutney, rasam, salads, and weekday cooking.",
    specs: { Source: "Nandi Valley", Pack: "1 kg", Handling: "Hand sorted before dispatch" },
    trustSignals: ["Verified seller", "86 units available", "Packed within 12 minutes"],
  },
  {
    id: "kx-banana-dozen",
    slug: "breakfast-banana-dozen",
    name: "Breakfast Banana Dozen",
    vendor: morningBasket,
    category: freshProduce,
    imageUrl: "https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=900&q=80",
    price: 72,
    currency: "INR",
    rating: 4.7,
    reviewCount: 148,
    stockCount: 42,
    unit: "12 pcs",
    deliveryMinutes: 24,
    status: ProductStatus.Active,
    tags: ["Naturally ripened"],
    description: "Medium bananas selected for breakfast boxes, smoothies, and lunch packs.",
    specs: { Ripeness: "Ready in 1 day", Count: "12 pieces", Source: "Chikkaballapur" },
    trustSignals: ["Freshness checked", "Local delivery promise"],
  },
  {
    id: "kx-millet-loaf",
    slug: "millet-sandwich-loaf",
    name: "Millet Sandwich Loaf",
    vendor: bakehouse,
    category: bakery,
    imageUrl: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=900&q=80",
    price: 110,
    originalPrice: 130,
    currency: "INR",
    rating: 4.9,
    reviewCount: 321,
    stockCount: 23,
    unit: "450 g",
    deliveryMinutes: 18,
    status: ProductStatus.Active,
    tags: ["Baked today", "High repeat orders"],
    description: "Fresh millet loaf with a soft crumb, baked before sunrise for breakfast and snack orders.",
    specs: { Batch: "06:30 AM", Weight: "450 g", BestBefore: "2 days" },
    trustSignals: ["Batch timestamp available", "Verified bakehouse"],
  },
  {
    id: "kx-paneer-puffs",
    slug: "paneer-puff-box-4",
    name: "Paneer Puff Box of 4",
    vendor: bakehouse,
    category: readyMeals,
    imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
    price: 160,
    currency: "INR",
    rating: 4.6,
    reviewCount: 89,
    stockCount: 12,
    unit: "4 pcs",
    deliveryMinutes: 20,
    status: ProductStatus.Active,
    tags: ["Low stock", "Tea-time"],
    description: "Flaky puffs with spiced paneer filling, packed warm for quick evening orders.",
    specs: { Pack: "4 pieces", Prep: "Warm dispatch", Allergen: "Contains dairy and gluten" },
    trustSignals: ["12 boxes left", "Packed warm"],
  },
  {
    id: "kx-floor-cleaner",
    slug: "eco-floor-cleaner-lemongrass-1l",
    name: "Eco Floor Cleaner Lemongrass 1 L",
    vendor: dailyPantry,
    category: homeEssentials,
    imageUrl: "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&w=900&q=80",
    price: 165,
    originalPrice: 189,
    currency: "INR",
    rating: 4.5,
    reviewCount: 76,
    stockCount: 19,
    unit: "1 L",
    deliveryMinutes: 31,
    status: ProductStatus.Active,
    tags: ["Lemongrass", "Refill ready"],
    description: "Low-foam everyday cleaner with a mild lemongrass scent for tile and stone floors.",
    specs: { Volume: "1 litre", Fragrance: "Lemongrass", Use: "Daily floor cleaning" },
    trustSignals: ["Seller verified", "Return eligible if sealed"],
  },
  {
    id: "kx-cotton-roll",
    slug: "pharmacy-cotton-roll-200g",
    name: "Pharmacy Cotton Roll 200 g",
    vendor: carePharmacy,
    category: personalCare,
    imageUrl: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=900&q=80",
    price: 92,
    currency: "INR",
    rating: 4.7,
    reviewCount: 54,
    stockCount: 7,
    unit: "200 g",
    deliveryMinutes: 26,
    status: ProductStatus.Active,
    tags: ["Low stock", "Care verified"],
    description: "Soft absorbent cotton roll suitable for home first-aid kits and daily care routines.",
    specs: { Weight: "200 g", Pack: "Sealed roll", Handling: "Pharmacy packed" },
    trustSignals: ["Verified pharmacy", "7 left nearby"],
  },
  {
    id: "kx-filter-coffee",
    slug: "chikmagalur-filter-coffee-blend",
    name: "Chikmagalur Filter Coffee Blend",
    vendor: dailyPantry,
    category: bakery,
    imageUrl: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=900&q=80",
    price: 290,
    originalPrice: 320,
    currency: "INR",
    rating: 4.8,
    reviewCount: 203,
    stockCount: 33,
    unit: "250 g",
    deliveryMinutes: 29,
    status: ProductStatus.Active,
    tags: ["Aroma sealed", "Weekend deal"],
    description: "A balanced filter coffee blend with chicory, packed in small batches for weekly pantry refills.",
    specs: { Origin: "Chikmagalur", Grind: "Filter", Pack: "250 g pouch" },
    trustSignals: ["Packed this week", "High reorder rate"],
  },
  {
    id: "kx-curry-kit",
    slug: "mangalore-curry-kit",
    name: "Mangalore Curry Kit",
    vendor: morningBasket,
    category: readyMeals,
    imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=900&q=80",
    price: 180,
    currency: "INR",
    rating: 4.6,
    reviewCount: 117,
    stockCount: 15,
    unit: "Serves 2",
    deliveryMinutes: 25,
    status: ProductStatus.Active,
    tags: ["Dinner ready", "Pre-portioned"],
    description: "A pre-portioned curry kit with ground masala, coconut, and fresh aromatics for a quick dinner.",
    specs: { Serves: "2", PrepTime: "18 minutes", Includes: "Masala, coconut, aromatics" },
    trustSignals: ["Cold packed", "Kitchen-tested recipe"],
  },
  {
    id: "kx-wireless-headphones",
    slug: "soundnest-wireless-headphones",
    name: "SoundNest Wireless Headphones",
    vendor: dailyPantry,
    category: electronics,
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    price: 1299,
    originalPrice: 1699,
    currency: "INR",
    rating: 4.5,
    reviewCount: 186,
    stockCount: 18,
    unit: "1 pair",
    deliveryMinutes: 34,
    status: ProductStatus.Active,
    tags: ["Wireless audio", "Budget pick", "Bluetooth"],
    description: "Affordable Bluetooth headphones with cushioned earcups for calls, music, and online classes.",
    specs: { Battery: "24 hours", Connectivity: "Bluetooth", Includes: "Charging cable" },
    trustSignals: ["Seller tested", "18 units nearby", "Return eligible if sealed"],
  },
  {
    id: "kx-gaming-mouse",
    slug: "rapidclick-gaming-mouse",
    name: "RapidClick Gaming Mouse",
    vendor: dailyPantry,
    category: electronics,
    imageUrl: "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=80",
    price: 799,
    originalPrice: 999,
    currency: "INR",
    rating: 4.4,
    reviewCount: 97,
    stockCount: 26,
    unit: "1 pc",
    deliveryMinutes: 32,
    status: ProductStatus.Active,
    tags: ["Gaming accessory", "RGB", "Fast delivery"],
    description: "Responsive wired mouse with programmable buttons for gaming setups and daily desktop work.",
    specs: { DPI: "7200", Cable: "Braided", Buttons: "6 programmable" },
    trustSignals: ["Compatible with laptop and desktop", "Fast local dispatch"],
  },
  {
    id: "kx-office-chair",
    slug: "ergo-comfort-office-chair",
    name: "Ergo Comfort Office Chair",
    vendor: dailyPantry,
    category: lifestyle,
    imageUrl: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=900&q=80",
    price: 4490,
    originalPrice: 5290,
    currency: "INR",
    rating: 4.6,
    reviewCount: 142,
    stockCount: 9,
    unit: "1 chair",
    deliveryMinutes: 48,
    status: ProductStatus.Active,
    tags: ["Ergonomic", "Work from home", "Comfort"],
    description: "Adjustable office chair with lumbar support and cushioned seating for long work sessions.",
    specs: { Support: "Lumbar", Height: "Adjustable", Assembly: "Basic tools included" },
    trustSignals: ["9 units nearby", "Basic assembly support"],
  },
  {
    id: "kx-running-sneakers",
    slug: "stridefit-running-sneakers",
    name: "StrideFit Running Sneakers",
    vendor: carePharmacy,
    category: lifestyle,
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    price: 1890,
    originalPrice: 2390,
    currency: "INR",
    rating: 4.4,
    reviewCount: 118,
    stockCount: 21,
    unit: "1 pair",
    deliveryMinutes: 38,
    status: ProductStatus.Active,
    tags: ["Sneakers", "Walking", "Lightweight"],
    description: "Lightweight sneakers for morning walks, short runs, and daily comfort.",
    specs: { Upper: "Breathable mesh", Sole: "Cushioned EVA", Fit: "Regular" },
    trustSignals: ["Size exchange available", "Popular nearby"],
  },
  {
    id: "kx-makhana-snack",
    slug: "roasted-makhana-healthy-snack",
    name: "Roasted Makhana Healthy Snack",
    vendor: morningBasket,
    category: readyMeals,
    imageUrl: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=900&q=80",
    price: 135,
    currency: "INR",
    rating: 4.7,
    reviewCount: 161,
    stockCount: 29,
    unit: "80 g",
    deliveryMinutes: 23,
    status: ProductStatus.Active,
    tags: ["Healthy snacks", "Low oil", "Tea-time"],
    description: "Lightly roasted makhana with mild seasoning for healthier evening snacking.",
    specs: { Pack: "80 g pouch", Style: "Roasted", Use: "Snack box" },
    trustSignals: ["Fresh pouch batch", "High repeat orders"],
  },
];

const extraProductSpecs: Array<{
  id: string;
  name: string;
  category: Category;
  vendor: Vendor;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  stockCount: number;
  unit: string;
  deliveryMinutes: number;
  tags: string[];
  imageUrl: string;
  description: string;
}> = [
  { id: "kx-avocado-pack", name: "Hass Avocado Pack of 2", category: freshProduce, vendor: jayanagarFresh, price: 210, originalPrice: 240, rating: 4.6, reviewCount: 88, stockCount: 16, unit: "2 pcs", deliveryMinutes: 27, tags: ["Salad ready", "Healthy breakfast"], imageUrl: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=900&q=80", description: "Creamy Hass avocados selected for toast, salad bowls, and quick breakfast prep." },
  { id: "kx-spinach-bunch", name: "Washed Spinach Bunch", category: freshProduce, vendor: morningBasket, price: 38, rating: 4.5, reviewCount: 73, stockCount: 34, unit: "1 bunch", deliveryMinutes: 21, tags: ["Washed greens", "Dinner prep"], imageUrl: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=900&q=80", description: "Washed spinach bunch packed for dal, stir fry, smoothies, and weekday cooking." },
  { id: "kx-broccoli-head", name: "Fresh Broccoli Head", category: freshProduce, vendor: jayanagarFresh, price: 96, originalPrice: 115, rating: 4.4, reviewCount: 66, stockCount: 18, unit: "1 pc", deliveryMinutes: 29, tags: ["Low calorie", "Salad"], imageUrl: "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=900&q=80", description: "Firm broccoli head for salads, steamed sides, pasta, and healthy meal bowls." },
  { id: "kx-apple-fuji", name: "Fuji Apple Value Pack", category: freshProduce, vendor: jayanagarFresh, price: 198, rating: 4.7, reviewCount: 129, stockCount: 24, unit: "1 kg", deliveryMinutes: 30, tags: ["Lunch box", "Crisp"], imageUrl: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=900&q=80", description: "Crisp Fuji apples packed for school boxes, snacking, and fruit bowls." },
  { id: "kx-sourdough-mini", name: "Mini Sourdough Boule", category: bakery, vendor: bakehouse, price: 145, rating: 4.9, reviewCount: 244, stockCount: 11, unit: "350 g", deliveryMinutes: 18, tags: ["Baked today", "Crusty"], imageUrl: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=900&q=80", description: "Small-batch sourdough boule with crisp crust and a soft tangy crumb." },
  { id: "kx-croissant-box", name: "Butter Croissant Box of 3", category: bakery, vendor: bakehouse, price: 240, originalPrice: 270, rating: 4.8, reviewCount: 203, stockCount: 14, unit: "3 pcs", deliveryMinutes: 19, tags: ["Breakfast", "Baked today"], imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=80", description: "Flaky butter croissants packed fresh for breakfast, coffee, and office snacks." },
  { id: "kx-idli-batter", name: "Stone Ground Idli Batter", category: bakery, vendor: gourmetPantry, price: 92, rating: 4.6, reviewCount: 112, stockCount: 28, unit: "1 kg", deliveryMinutes: 30, tags: ["Breakfast", "Fermented"], imageUrl: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=80", description: "Stone-ground idli and dosa batter fermented for soft breakfast prep." },
  { id: "kx-oats-pack", name: "Rolled Oats Breakfast Pack", category: bakery, vendor: gourmetPantry, price: 165, originalPrice: 190, rating: 4.5, reviewCount: 91, stockCount: 31, unit: "500 g", deliveryMinutes: 31, tags: ["Healthy breakfast", "Pantry"], imageUrl: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=900&q=80", description: "Rolled oats for overnight oats, porridge, smoothies, and healthier breakfast routines." },
  { id: "kx-dishwash-gel", name: "Citrus Dishwash Gel", category: homeEssentials, vendor: homeUtility, price: 128, originalPrice: 145, rating: 4.4, reviewCount: 84, stockCount: 22, unit: "500 ml", deliveryMinutes: 36, tags: ["Citrus", "Kitchen"], imageUrl: "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=900&q=80", description: "Citrus dishwash gel for daily kitchen cleanup with low residue and fresh scent." },
  { id: "kx-laundry-liquid", name: "Gentle Laundry Liquid", category: homeEssentials, vendor: homeUtility, price: 245, rating: 4.5, reviewCount: 137, stockCount: 20, unit: "1 L", deliveryMinutes: 38, tags: ["Fabric care", "Refill"], imageUrl: "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=900&q=80", description: "Gentle laundry liquid suitable for daily wear, towels, and machine wash routines." },
  { id: "kx-trash-bags", name: "Compostable Trash Bags", category: homeEssentials, vendor: homeUtility, price: 155, originalPrice: 175, rating: 4.3, reviewCount: 69, stockCount: 26, unit: "30 bags", deliveryMinutes: 37, tags: ["Compostable", "Home"], imageUrl: "https://images.unsplash.com/photo-1604187351574-c75ca79f5807?auto=format&fit=crop&w=900&q=80", description: "Compostable trash bags sized for daily household waste segregation." },
  { id: "kx-air-freshener", name: "Lavender Air Freshener", category: homeEssentials, vendor: dailyPantry, price: 135, rating: 4.2, reviewCount: 58, stockCount: 17, unit: "250 ml", deliveryMinutes: 31, tags: ["Lavender", "Home care"], imageUrl: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=80", description: "Mild lavender air freshener for living rooms, bathrooms, and small workspaces." },
  { id: "kx-handwash-refill", name: "Aloe Handwash Refill", category: personalCare, vendor: carePharmacy, price: 118, rating: 4.6, reviewCount: 144, stockCount: 32, unit: "750 ml", deliveryMinutes: 26, tags: ["Aloe", "Care verified"], imageUrl: "https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?auto=format&fit=crop&w=900&q=80", description: "Aloe handwash refill for everyday hygiene with verified pharmacy handling." },
  { id: "kx-baby-wipes", name: "Soft Baby Wipes Pack", category: personalCare, vendor: babyCare, price: 185, originalPrice: 210, rating: 4.7, reviewCount: 188, stockCount: 37, unit: "80 wipes", deliveryMinutes: 33, tags: ["Baby care", "Gentle"], imageUrl: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=900&q=80", description: "Soft unscented baby wipes packed for sensitive skin and daily care." },
  { id: "kx-sunscreen-gel", name: "SPF 50 Sunscreen Gel", category: personalCare, vendor: carePharmacy, price: 399, originalPrice: 449, rating: 4.5, reviewCount: 121, stockCount: 13, unit: "50 g", deliveryMinutes: 27, tags: ["SPF 50", "Dermatology"], imageUrl: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=900&q=80", description: "Lightweight SPF 50 gel sunscreen for daily commute and outdoor errands." },
  { id: "kx-oral-care-kit", name: "Family Oral Care Kit", category: personalCare, vendor: babyCare, price: 289, rating: 4.4, reviewCount: 77, stockCount: 19, unit: "4 pcs", deliveryMinutes: 35, tags: ["Family care", "Refill"], imageUrl: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=900&q=80", description: "Family oral care kit with toothbrushes and toothpaste for monthly restocking." },
  { id: "kx-veg-biryani", name: "Vegetable Biryani Meal Box", category: readyMeals, vendor: gourmetPantry, price: 220, rating: 4.6, reviewCount: 177, stockCount: 10, unit: "Serves 1", deliveryMinutes: 32, tags: ["Lunch", "Ready meal"], imageUrl: "https://images.unsplash.com/photo-1631515242808-497c3fbd3972?auto=format&fit=crop&w=900&q=80", description: "Vegetable biryani meal box with raita, packed warm for lunch and dinner." },
  { id: "kx-hummus-cup", name: "Classic Hummus Cup", category: readyMeals, vendor: gourmetPantry, price: 145, rating: 4.5, reviewCount: 83, stockCount: 20, unit: "180 g", deliveryMinutes: 29, tags: ["Healthy dip", "Snack"], imageUrl: "https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=900&q=80", description: "Classic hummus cup for wraps, salads, crackers, and healthier snacking." },
  { id: "kx-protein-salad", name: "Protein Chickpea Salad", category: readyMeals, vendor: gourmetPantry, price: 175, originalPrice: 195, rating: 4.6, reviewCount: 108, stockCount: 16, unit: "300 g", deliveryMinutes: 31, tags: ["Healthy lunch", "Protein"], imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80", description: "Chickpea salad with crunchy vegetables and light dressing for quick healthy meals." },
  { id: "kx-wrap-paneer", name: "Paneer Tikka Wrap", category: readyMeals, vendor: gourmetPantry, price: 155, rating: 4.4, reviewCount: 99, stockCount: 18, unit: "1 wrap", deliveryMinutes: 28, tags: ["Quick meal", "Paneer"], imageUrl: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=900&q=80", description: "Paneer tikka wrap with vegetables and mint spread for fast lunch orders." },
  { id: "kx-usb-c-hub", name: "USB-C Multiport Hub", category: electronics, vendor: techCorner, price: 1490, originalPrice: 1790, rating: 4.5, reviewCount: 102, stockCount: 15, unit: "1 pc", deliveryMinutes: 34, tags: ["Work setup", "Laptop"], imageUrl: "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=900&q=80", description: "USB-C hub with HDMI, USB, and card reader ports for work-from-home desks." },
  { id: "kx-bluetooth-speaker", name: "Pocket Bluetooth Speaker", category: electronics, vendor: techCorner, price: 990, originalPrice: 1190, rating: 4.4, reviewCount: 89, stockCount: 23, unit: "1 pc", deliveryMinutes: 35, tags: ["Wireless", "Portable"], imageUrl: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=80", description: "Compact Bluetooth speaker for kitchens, desks, small gatherings, and travel." },
  { id: "kx-laptop-stand", name: "Foldable Laptop Stand", category: electronics, vendor: techCorner, price: 690, rating: 4.6, reviewCount: 136, stockCount: 27, unit: "1 pc", deliveryMinutes: 33, tags: ["Office", "Ergonomic"], imageUrl: "https://images.unsplash.com/photo-1616627451515-cbc80e075fca?auto=format&fit=crop&w=900&q=80", description: "Foldable laptop stand for better posture during long work and study sessions." },
  { id: "kx-keyboard-wireless", name: "Slim Wireless Keyboard", category: electronics, vendor: techCorner, price: 1190, rating: 4.5, reviewCount: 118, stockCount: 12, unit: "1 pc", deliveryMinutes: 34, tags: ["Wireless", "Office"], imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80", description: "Slim wireless keyboard for laptop workstations, tablets, and quiet typing." },
  { id: "kx-phone-tripod", name: "Phone Tripod Stand", category: electronics, vendor: techCorner, price: 540, originalPrice: 650, rating: 4.3, reviewCount: 64, stockCount: 25, unit: "1 pc", deliveryMinutes: 36, tags: ["Creator kit", "Video calls"], imageUrl: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=900&q=80", description: "Adjustable phone tripod stand for video calls, cooking videos, and content recording." },
  { id: "kx-yoga-mat", name: "Anti-Skid Yoga Mat", category: lifestyle, vendor: sportsSteps, price: 799, originalPrice: 950, rating: 4.5, reviewCount: 171, stockCount: 19, unit: "1 mat", deliveryMinutes: 41, tags: ["Fitness", "Anti-skid"], imageUrl: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=900&q=80", description: "Anti-skid yoga mat for home workouts, stretches, and morning fitness routines." },
  { id: "kx-water-bottle", name: "Steel Water Bottle 1 L", category: lifestyle, vendor: sportsSteps, price: 480, rating: 4.6, reviewCount: 146, stockCount: 33, unit: "1 L", deliveryMinutes: 40, tags: ["Office", "Reusable"], imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80", description: "Stainless steel water bottle for office, school, gym, and daily commute." },
  { id: "kx-backpack-daily", name: "Daily Commute Backpack", category: lifestyle, vendor: sportsSteps, price: 1290, originalPrice: 1590, rating: 4.4, reviewCount: 92, stockCount: 14, unit: "1 bag", deliveryMinutes: 43, tags: ["Commute", "Laptop"], imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80", description: "Daily commute backpack with laptop sleeve and simple organizer pockets." },
  { id: "kx-desk-lamp", name: "Warm LED Desk Lamp", category: lifestyle, vendor: homeUtility, price: 890, rating: 4.4, reviewCount: 81, stockCount: 17, unit: "1 lamp", deliveryMinutes: 39, tags: ["Study", "Office"], imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80", description: "Warm LED desk lamp for study tables, workstations, and bedside reading." },
  { id: "kx-storage-bins", name: "Stackable Storage Bins", category: lifestyle, vendor: homeUtility, price: 620, originalPrice: 740, rating: 4.3, reviewCount: 74, stockCount: 21, unit: "Set of 3", deliveryMinutes: 38, tags: ["Home organization", "Utility"], imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80", description: "Stackable bins for pantry organization, toys, laundry shelves, and utility storage." },
  { id: "kx-mosquito-patches", name: "Baby-Safe Mosquito Patches", category: personalCare, vendor: babyCare, price: 125, rating: 4.5, reviewCount: 98, stockCount: 29, unit: "24 patches", deliveryMinutes: 32, tags: ["Baby care", "Outdoor"], imageUrl: "https://images.unsplash.com/photo-1588776814546-daab30f310ce?auto=format&fit=crop&w=900&q=80", description: "Baby-safe mosquito patches for evening walks, school bags, and outdoor play." },
  { id: "kx-diaper-pack", name: "Comfort Diaper Pants M", category: personalCare, vendor: babyCare, price: 549, originalPrice: 620, rating: 4.6, reviewCount: 184, stockCount: 22, unit: "34 pcs", deliveryMinutes: 34, tags: ["Baby care", "Monthly refill"], imageUrl: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=80", description: "Comfort diaper pants for daily baby care with reliable local stock." },
  { id: "kx-coconut-water", name: "Tender Coconut Water Pack", category: freshProduce, vendor: morningBasket, price: 150, rating: 4.7, reviewCount: 156, stockCount: 20, unit: "3 bottles", deliveryMinutes: 23, tags: ["Hydration", "Fresh"], imageUrl: "https://images.unsplash.com/photo-1588413335653-34b770bca7c1?auto=format&fit=crop&w=900&q=80", description: "Tender coconut water bottles packed cold for hydration and post-workout recovery." },
  { id: "kx-cheese-slices", name: "Cheddar Cheese Slices", category: bakery, vendor: dailyPantry, price: 165, rating: 4.4, reviewCount: 83, stockCount: 24, unit: "200 g", deliveryMinutes: 31, tags: ["Sandwich", "Dairy"], imageUrl: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=900&q=80", description: "Cheddar cheese slices for sandwiches, burgers, wraps, and breakfast plates." },
  { id: "kx-olive-oil", name: "Extra Virgin Olive Oil", category: homeEssentials, vendor: gourmetPantry, price: 620, originalPrice: 690, rating: 4.7, reviewCount: 136, stockCount: 13, unit: "500 ml", deliveryMinutes: 30, tags: ["Cooking", "Salads"], imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80", description: "Extra virgin olive oil for salads, pasta, dips, and light cooking." },
  { id: "kx-chia-seeds", name: "Chia Seeds Jar", category: readyMeals, vendor: gourmetPantry, price: 225, rating: 4.6, reviewCount: 113, stockCount: 18, unit: "250 g", deliveryMinutes: 29, tags: ["Healthy snacks", "Breakfast"], imageUrl: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=900&q=80", description: "Chia seeds for smoothies, overnight oats, puddings, and nutrition-forward snacks." },
  { id: "kx-plant-pot", name: "Ceramic Desk Plant Pot", category: lifestyle, vendor: homeUtility, price: 320, rating: 4.4, reviewCount: 61, stockCount: 16, unit: "1 pot", deliveryMinutes: 39, tags: ["Home decor", "Desk"], imageUrl: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&q=80", description: "Small ceramic pot for desk plants, balcony shelves, and simple home decor." },
  { id: "kx-resistance-band", name: "Resistance Band Set", category: lifestyle, vendor: sportsSteps, price: 690, originalPrice: 820, rating: 4.5, reviewCount: 104, stockCount: 23, unit: "Set of 5", deliveryMinutes: 42, tags: ["Fitness", "Home workout"], imageUrl: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=80", description: "Resistance band set for mobility, strength training, rehab routines, and travel workouts." },
  { id: "kx-screen-cleaner", name: "Laptop Screen Cleaning Kit", category: electronics, vendor: techCorner, price: 260, rating: 4.3, reviewCount: 72, stockCount: 36, unit: "1 kit", deliveryMinutes: 33, tags: ["Laptop", "Office"], imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80", description: "Screen cleaning kit with microfiber cloth and gentle spray for laptops and monitors." },
  { id: "kx-power-bank", name: "10000 mAh Power Bank", category: electronics, vendor: techCorner, price: 1290, originalPrice: 1490, rating: 4.5, reviewCount: 159, stockCount: 18, unit: "1 pc", deliveryMinutes: 34, tags: ["Travel", "Fast charge"], imageUrl: "https://images.unsplash.com/photo-1609592806596-4d8b5d7296da?auto=format&fit=crop&w=900&q=80", description: "10000 mAh power bank for phones, earbuds, travel days, and emergency charging." },
];

const extraMarketplaceProducts: Product[] = extraProductSpecs.map((item) => ({
  ...item,
  slug: item.id.replace("kx-", "").replaceAll("_", "-"),
  currency: "INR",
  status: ProductStatus.Active,
  specs: { Pack: item.unit, Handling: "Local seller verified", Use: item.tags[0] ?? "Everyday use" },
  trustSignals: ["Verified seller", `${item.stockCount} units nearby`, `Dispatch in ${Math.max(8, item.deliveryMinutes - 12)} minutes`],
}));

export const marketplaceProducts: Product[] = [...coreMarketplaceProducts, ...extraMarketplaceProducts];

export const featuredDeals = marketplaceProducts.filter((product) => product.originalPrice);

const legacyAddress = {
  id: "addr-home-malleswaram",
  label: "Home",
  recipient: "Ananya Rao",
  phone: "+91 98765 43210",
  line1: "12, 8th Cross",
  locality: "Malleswaram",
  city: "Bengaluru",
  pincode: "560003",
};

const legacyOrderItems = [
  { id: "item-legacy-1", product: marketplaceProducts[0], quantity: 2 },
  { id: "item-legacy-2", product: marketplaceProducts[2], quantity: 1 },
];
const legacyPricing = calculateOrderPricing(legacyOrderItems);
const legacyPayment = {
  ...createRazorpaySandboxIntent(legacyPricing, "KX-1042", "upi" as const),
  status: PaymentStatus.Succeeded,
  razorpayPaymentId: "pay_KX1042SANDBOX",
};

export const buyerOrders: Order[] = [
  {
    id: "order-kx-1042",
    code: "KX-1042",
    status: OrderStatus.Processing,
    items: legacyOrderItems,
    buyerName: "Ananya Rao",
    buyerPhone: "+91 98765 43210",
    deliveryAddress: legacyAddress,
    pricing: legacyPricing,
    payment: legacyPayment,
    history: [
      { id: "hist-legacy-created", status: OrderStatus.Pending, title: "Order placed", note: "Stock validated and payment intent created.", actor: "system", createdAt: "2026-05-25T10:42:00.000Z" },
      { id: "hist-legacy-processing", status: OrderStatus.Processing, title: "Processing", note: "Seller started fulfillment.", actor: "seller", createdAt: "2026-05-25T10:58:00.000Z" },
    ],
    auditTrail: [{ id: "aud-legacy-create", action: "order_created", targetId: "order-kx-1042", actor: "system", createdAt: "2026-05-25T10:42:00.000Z", metadata: { code: "KX-1042" } }],
    notifications: [{ id: "not-legacy-placed", event: "order_placed", orderId: "order-kx-1042", title: "Order placed", body: "Order was placed successfully.", createdAt: "2026-05-25T10:42:00.000Z", delivered: false }],
    supportReference: "SUP-261042",
    invoiceState: "placeholder_ready",
    total: legacyPricing.total,
    currency: "INR",
    createdAt: "2026-05-25T10:42:00.000Z",
    updatedAt: "2026-05-25T10:58:00.000Z",
  },
];

export function getProductBySlug(slug: string) {
  return marketplaceProducts.find((product) => product.slug === slug);
}

export function getCategoryBySlug(slug: string) {
  return marketplaceCategories.find((category) => category.slug === slug);
}

export function getProductsByCategory(slug: string) {
  return marketplaceProducts.filter((product) => product.category.slug === slug);
}

export function getVendorServingSince(vendor: Vendor) {
  const years = [2018, 2019, 2020, 2021, 2022];
  return years[vendor.id.length % years.length];
}

export function getVendorHumanLine(vendor: Vendor) {
  const since = getVendorServingSince(vendor);
  if (/pharmacy|care/i.test(vendor.name)) return `Serving ${vendor.locality} care orders since ${since}.`;
  return `Delivering in ${vendor.locality} since ${since}.`;
}

export function getVendorActivityLine(vendor: Vendor) {
  if (vendor.serviceStatus === "busy") return "Packing local orders right now";
  if (vendor.fulfillmentPromiseMinutes <= 24) return "Usually responds in 5 minutes";
  if (vendor.fulfillmentPromiseMinutes <= 32) return "Usually responds in 8 minutes";
  return "Usually responds within 12 minutes";
}

export function getProductFreshnessLine(product: Product) {
  const tag = product.tags?.find((item) => /baked|fresh|washed|batch|breakfast|tea-time|hydration/i.test(item));
  if (tag) return tag;
  if (product.category.slug === "fresh-produce") return "Fresh stock checked today";
  if (product.category.slug === "bakery-breakfast") return "Morning batch available";
  if (product.category.slug === "ready-meals") return "Prepared for today";
  return "Local stock available";
}

export function getProductActivityLine(product: Product) {
  if (product.reviewCount >= 180) return `${Math.max(8, Math.round(product.reviewCount / 18))} local reorders this week`;
  if (product.stockCount <= 12) return "Small fresh batch available";
  if (product.deliveryMinutes <= 24) return `Fast from ${product.vendor.locality}`;
  return `Popular around ${product.vendor.locality}`;
}

export function getProductReviewSnippets(product: Product) {
  const reviews: Record<string, Array<{ name: string; area: string; text: string }>> = {
    "fresh-produce": [
      { name: "Meena R.", area: "West Mambalam", text: "Tomatoes were firm and fresh. Good for rasam and chutney." },
      { name: "Karthik S.", area: "T. Nagar", text: "Packed neatly, delivery came before lunch prep." },
    ],
    "bakery-breakfast": [
      { name: "Anitha K.", area: "Mylapore", text: "Bread was soft and the morning delivery was on time." },
      { name: "Prakash V.", area: "Alwarpet", text: "Filter coffee and breakfast items arrived fresh." },
    ],
    "ready-meals": [
      { name: "Nisha P.", area: "Nungambakkam", text: "Warm when it arrived. Nice for evening snacks." },
      { name: "Suresh M.", area: "Anna Nagar", text: "Good portion and packed without spills." },
    ],
    "personal-care": [
      { name: "Divya N.", area: "Adyar", text: "Sealed pack, pharmacy delivery was quick." },
      { name: "Rahul B.", area: "Besant Nagar", text: "Useful for same-day care items." },
    ],
  };
  return reviews[product.category.slug] ?? [
    { name: "Lakshmi S.", area: product.vendor.locality, text: "Product matched the page and arrived neatly packed." },
    { name: "Arun K.", area: product.vendor.locality, text: "Local seller packed it well and delivered on time." },
  ];
}

export function formatEta(minutes?: number) {
  return minutes ? `${minutes}-${minutes + 8} min` : "Slot pending";
}
