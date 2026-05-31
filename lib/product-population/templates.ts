import type { AttributeMap } from "@/lib/products";

/**
 * Real product templates (PP-4 Phase 2). A template is a category-appropriate product type with
 * realistic variants and attributes. Composed with a real PP-2 brand it yields a real product, e.g.
 * brand "Aavin" + template "Toned Milk" + variant "1L" => "Aavin Toned Milk 1L". No lorem ipsum.
 */

export interface TemplateVariant {
  label: string;
  axes: Record<string, string | number>;
  baseUnit: string;
  baseQuantity: number;
  unitsPerPack?: number;
  level?: "UNIT" | "PACK" | "MULTIPACK" | "BOX" | "CASE" | "CARTON" | "BUNDLE";
}

export interface ProductTemplate {
  baseName: string;
  unit: string;
  basePrice: number;
  attributes: AttributeMap;
  variants: TemplateVariant[];
}

const g = (q: number): TemplateVariant => ({ label: `${q}g`, axes: { weight: `${q}g` }, baseUnit: "g", baseQuantity: q });
const kg = (q: number): TemplateVariant => ({ label: `${q}kg`, axes: { weight: `${q}kg` }, baseUnit: "g", baseQuantity: q * 1000 });
const ml = (q: number): TemplateVariant => ({ label: `${q}ml`, axes: { volume: `${q}ml` }, baseUnit: "ml", baseQuantity: q });
const l = (q: number): TemplateVariant => ({ label: `${q}L`, axes: { volume: `${q}l` }, baseUnit: "ml", baseQuantity: q * 1000 });
const ea = (): TemplateVariant => ({ label: "each", axes: {}, baseUnit: "count", baseQuantity: 1 });
const multipack = (n: number): TemplateVariant => ({ label: `${n} pack`, axes: { pack_size: n }, baseUnit: "count", baseQuantity: 1, unitsPerPack: n, level: "MULTIPACK" });

const FOOD = (vegetarian: string, storage = "ambient"): AttributeMap => ({ vegetarian, storage_type: storage, country_of_origin: "India", shelf_life: 180 });

export const DEPARTMENT_TEMPLATES: Record<string, ProductTemplate[]> = {
  groceries: [
    { baseName: "Basmati Rice", unit: "kg", basePrice: 120, attributes: FOOD("veg"), variants: [kg(1), kg(5), kg(10)] },
    { baseName: "Whole Wheat Atta", unit: "kg", basePrice: 60, attributes: FOOD("veg"), variants: [kg(1), kg(5), kg(10)] },
    { baseName: "Toor Dal", unit: "kg", basePrice: 140, attributes: FOOD("veg"), variants: [g(500), kg(1), kg(2)] },
    { baseName: "Sunflower Oil", unit: "L", basePrice: 150, attributes: FOOD("veg"), variants: [ml(500), l(1), l(5)] },
    { baseName: "Iodised Salt", unit: "kg", basePrice: 25, attributes: FOOD("veg"), variants: [kg(1)] },
    { baseName: "Sugar", unit: "kg", basePrice: 45, attributes: FOOD("veg"), variants: [kg(1), kg(5)] },
    { baseName: "Turmeric Powder", unit: "g", basePrice: 40, attributes: FOOD("veg"), variants: [g(100), g(200), g(500)] },
    { baseName: "Chilli Powder", unit: "g", basePrice: 55, attributes: FOOD("veg"), variants: [g(100), g(200), g(500)] },
    { baseName: "Tea Powder", unit: "g", basePrice: 130, attributes: FOOD("veg"), variants: [g(250), g(500), kg(1)] },
    { baseName: "Coffee Powder", unit: "g", basePrice: 180, attributes: FOOD("veg"), variants: [g(100), g(200), g(500)] },
  ],
  "fresh-produce": [
    { baseName: "Tomato", unit: "kg", basePrice: 30, attributes: { vegetarian: "veg", organic: false, storage_type: "cool_ventilated", country_of_origin: "India", shelf_life: 5 }, variants: [g(500), kg(1)] },
    { baseName: "Onion", unit: "kg", basePrice: 35, attributes: { vegetarian: "veg", organic: false, storage_type: "cool_ventilated", country_of_origin: "India", shelf_life: 15 }, variants: [kg(1), kg(2)] },
    { baseName: "Potato", unit: "kg", basePrice: 28, attributes: { vegetarian: "veg", organic: false, storage_type: "cool_ventilated", country_of_origin: "India", shelf_life: 20 }, variants: [kg(1), kg(2)] },
    { baseName: "Banana", unit: "dozen", basePrice: 50, attributes: { vegetarian: "veg", organic: false, storage_type: "cool_ventilated", country_of_origin: "India", shelf_life: 5 }, variants: [ea()] },
    { baseName: "Apple", unit: "kg", basePrice: 160, attributes: { vegetarian: "veg", organic: false, storage_type: "refrigerated", country_of_origin: "India", shelf_life: 14 }, variants: [g(500), kg(1)] },
    { baseName: "Coriander Bunch", unit: "bunch", basePrice: 15, attributes: { vegetarian: "veg", organic: false, storage_type: "refrigerated", country_of_origin: "India", shelf_life: 4 }, variants: [ea()] },
  ],
  dairy: [
    { baseName: "Full Cream Milk", unit: "ml", basePrice: 33, attributes: FOOD("veg", "refrigerated"), variants: [ml(500), l(1), l(2)] },
    { baseName: "Toned Milk", unit: "ml", basePrice: 27, attributes: FOOD("veg", "refrigerated"), variants: [ml(500), l(1), l(2)] },
    { baseName: "Curd", unit: "g", basePrice: 30, attributes: FOOD("veg", "refrigerated"), variants: [g(200), g(400), kg(1)] },
    { baseName: "Butter", unit: "g", basePrice: 55, attributes: FOOD("veg", "refrigerated"), variants: [g(100), g(200), g(500)] },
    { baseName: "Ghee", unit: "ml", basePrice: 320, attributes: FOOD("veg"), variants: [ml(200), ml(500), l(1)] },
    { baseName: "Paneer", unit: "g", basePrice: 90, attributes: FOOD("veg", "refrigerated"), variants: [g(200), g(500)] },
    { baseName: "Cheese Slices", unit: "g", basePrice: 110, attributes: FOOD("veg", "refrigerated"), variants: [g(100), g(200)] },
  ],
  bakery: [
    { baseName: "Sandwich Bread", unit: "g", basePrice: 45, attributes: FOOD("veg"), variants: [g(400), g(700)] },
    { baseName: "Pav Buns", unit: "pack", basePrice: 35, attributes: FOOD("veg"), variants: [multipack(6), multipack(8)] },
    { baseName: "Rusk", unit: "g", basePrice: 50, attributes: FOOD("veg"), variants: [g(200), g(400)] },
    { baseName: "Cookies", unit: "g", basePrice: 60, attributes: FOOD("veg"), variants: [g(100), g(250)] },
  ],
  beverages: [
    { baseName: "Cola Soft Drink", unit: "ml", basePrice: 40, attributes: FOOD("veg"), variants: [ml(250), ml(750), l(2)] },
    { baseName: "Mango Drink", unit: "ml", basePrice: 35, attributes: FOOD("veg"), variants: [ml(200), ml(600), l(1)] },
    { baseName: "Mineral Water", unit: "ml", basePrice: 20, attributes: FOOD("veg"), variants: [ml(500), l(1), l(2)] },
    { baseName: "Green Tea Bags", unit: "pack", basePrice: 150, attributes: FOOD("veg"), variants: [multipack(25), multipack(100)] },
    { baseName: "Instant Coffee", unit: "g", basePrice: 200, attributes: FOOD("veg"), variants: [g(50), g(100), g(200)] },
  ],
  snacks: [
    { baseName: "Potato Chips", unit: "g", basePrice: 20, attributes: { ...FOOD("veg"), flavor: "salted" }, variants: [g(52), g(90), g(160)] },
    { baseName: "Masala Noodles", unit: "g", basePrice: 14, attributes: { ...FOOD("veg"), flavor: "masala" }, variants: [g(70), multipack(4)] },
    { baseName: "Glucose Biscuits", unit: "g", basePrice: 10, attributes: FOOD("veg"), variants: [g(100), g(250), multipack(6)] },
    { baseName: "Namkeen Mixture", unit: "g", basePrice: 45, attributes: FOOD("veg"), variants: [g(150), g(400)] },
    { baseName: "Chocolate Bar", unit: "g", basePrice: 40, attributes: FOOD("veg"), variants: [g(40), g(120)] },
  ],
  "personal-care": [
    { baseName: "Shampoo", unit: "ml", basePrice: 120, attributes: { country_of_origin: "India", shelf_life: 730, material: "liquid" }, variants: [ml(180), ml(340), ml(650)] },
    { baseName: "Bathing Soap", unit: "g", basePrice: 35, attributes: { country_of_origin: "India", shelf_life: 1095, material: "solid" }, variants: [g(100), multipack(4)] },
    { baseName: "Toothpaste", unit: "g", basePrice: 55, attributes: { country_of_origin: "India", shelf_life: 730 }, variants: [g(100), g(200)] },
    { baseName: "Face Wash", unit: "ml", basePrice: 99, attributes: { country_of_origin: "India", shelf_life: 730 }, variants: [ml(50), ml(100), ml(150)] },
    { baseName: "Deodorant Spray", unit: "ml", basePrice: 199, attributes: { country_of_origin: "India", shelf_life: 1095 }, variants: [ml(150)] },
  ],
  beauty: [
    { baseName: "Lipstick", unit: "g", basePrice: 250, attributes: { country_of_origin: "India", gender: "women", color: "red", shelf_life: 1095 }, variants: [g(4)] },
    { baseName: "Kajal", unit: "g", basePrice: 150, attributes: { country_of_origin: "India", gender: "women", color: "black", shelf_life: 1095 }, variants: [g(2)] },
    { baseName: "Face Serum", unit: "ml", basePrice: 399, attributes: { country_of_origin: "India", shelf_life: 730 }, variants: [ml(30), ml(50)] },
    { baseName: "Perfume", unit: "ml", basePrice: 499, attributes: { country_of_origin: "India", shelf_life: 1825 }, variants: [ml(50), ml(100)] },
  ],
  health: [
    { baseName: "Multivitamin Tablets", unit: "pack", basePrice: 180, attributes: { country_of_origin: "India", prescription_required: false, shelf_life: 730 }, variants: [multipack(30), multipack(60)] },
    { baseName: "Protein Powder", unit: "g", basePrice: 899, attributes: { country_of_origin: "India", vegetarian: "veg", shelf_life: 540 }, variants: [g(500), kg(1)] },
    { baseName: "Hand Sanitizer", unit: "ml", basePrice: 99, attributes: { country_of_origin: "India", shelf_life: 730 }, variants: [ml(100), ml(500)] },
    { baseName: "Antiseptic Liquid", unit: "ml", basePrice: 120, attributes: { country_of_origin: "India", shelf_life: 1095 }, variants: [ml(125), ml(250), ml(500)] },
  ],
  "baby-care": [
    { baseName: "Diaper Pants", unit: "pack", basePrice: 399, attributes: { country_of_origin: "India", age_group: "infant", shelf_life: 1095 }, variants: [multipack(30), multipack(62)] },
    { baseName: "Baby Lotion", unit: "ml", basePrice: 180, attributes: { country_of_origin: "India", age_group: "infant", shelf_life: 730 }, variants: [ml(100), ml(200)] },
    { baseName: "Baby Wipes", unit: "pack", basePrice: 150, attributes: { country_of_origin: "India", age_group: "infant", shelf_life: 730 }, variants: [multipack(72), multipack(144)] },
    { baseName: "Baby Cereal", unit: "g", basePrice: 220, attributes: { ...FOOD("veg"), age_group: "infant" }, variants: [g(300)] },
  ],
  "pet-care": [
    { baseName: "Adult Dog Food", unit: "kg", basePrice: 450, attributes: { country_of_origin: "India", shelf_life: 540 }, variants: [kg(1), kg(3), kg(10)] },
    { baseName: "Cat Food", unit: "kg", basePrice: 480, attributes: { country_of_origin: "India", shelf_life: 540 }, variants: [g(450), kg(1), kg(3)] },
    { baseName: "Pet Shampoo", unit: "ml", basePrice: 250, attributes: { country_of_origin: "India", shelf_life: 730 }, variants: [ml(200), ml(500)] },
    { baseName: "Dog Treats", unit: "g", basePrice: 199, attributes: { country_of_origin: "India", shelf_life: 365 }, variants: [g(100), g(500)] },
  ],
  household: [
    { baseName: "Floor Cleaner", unit: "ml", basePrice: 99, attributes: { country_of_origin: "India", shelf_life: 1095, material: "liquid" }, variants: [ml(500), l(1), l(2)] },
    { baseName: "Air Freshener", unit: "ml", basePrice: 150, attributes: { country_of_origin: "India", shelf_life: 1095 }, variants: [ml(220)] },
    { baseName: "Tissue Box", unit: "pack", basePrice: 80, attributes: { country_of_origin: "India" }, variants: [multipack(100), multipack(200)] },
    { baseName: "Garbage Bags", unit: "pack", basePrice: 120, attributes: { country_of_origin: "India" }, variants: [multipack(30), multipack(90)] },
    { baseName: "Mosquito Repellent", unit: "pack", basePrice: 75, attributes: { country_of_origin: "India" }, variants: [multipack(1)] },
  ],
  cleaning: [
    { baseName: "Detergent Powder", unit: "kg", basePrice: 110, attributes: { country_of_origin: "India", shelf_life: 1095 }, variants: [kg(1), kg(2), kg(4)] },
    { baseName: "Dishwash Liquid", unit: "ml", basePrice: 99, attributes: { country_of_origin: "India", shelf_life: 1095, material: "liquid" }, variants: [ml(450), ml(750), l(2)] },
    { baseName: "Toilet Cleaner", unit: "ml", basePrice: 89, attributes: { country_of_origin: "India", shelf_life: 1095, material: "liquid" }, variants: [ml(500), l(1)] },
    { baseName: "Glass Cleaner", unit: "ml", basePrice: 99, attributes: { country_of_origin: "India", shelf_life: 1095 }, variants: [ml(500)] },
  ],
  kitchen: [
    { baseName: "Pressure Cooker", unit: "L", basePrice: 1499, attributes: { country_of_origin: "India", material: "aluminium" }, variants: [{ label: "3L", axes: { volume: "3l" }, baseUnit: "ml", baseQuantity: 3000 }, { label: "5L", axes: { volume: "5l" }, baseUnit: "ml", baseQuantity: 5000 }] },
    { baseName: "Steel Water Bottle", unit: "ml", basePrice: 399, attributes: { country_of_origin: "India", material: "stainless-steel" }, variants: [ml(750), l(1)] },
    { baseName: "Non-Stick Tawa", unit: "cm", basePrice: 699, attributes: { country_of_origin: "India", material: "non-stick" }, variants: [ea()] },
    { baseName: "Storage Container Set", unit: "set", basePrice: 499, attributes: { country_of_origin: "India", material: "plastic" }, variants: [multipack(3), multipack(6)] },
  ],
  stationery: [
    { baseName: "Notebook", unit: "pack", basePrice: 45, attributes: { country_of_origin: "India", material: "paper" }, variants: [multipack(1), multipack(6)] },
    { baseName: "Ball Pen", unit: "pack", basePrice: 10, attributes: { country_of_origin: "India" }, variants: [multipack(1), multipack(5), multipack(10)] },
    { baseName: "Pencil Box", unit: "pack", basePrice: 30, attributes: { country_of_origin: "India" }, variants: [multipack(10)] },
    { baseName: "A4 Paper Ream", unit: "pack", basePrice: 280, attributes: { country_of_origin: "India", material: "paper" }, variants: [multipack(500)] },
  ],
  electronics: [
    { baseName: "Wireless Earbuds", unit: "each", basePrice: 1299, attributes: { country_of_origin: "India", color: "black" }, variants: [{ label: "Black", axes: { color: "black" }, baseUnit: "count", baseQuantity: 1, level: "BOX" }, { label: "White", axes: { color: "white" }, baseUnit: "count", baseQuantity: 1, level: "BOX" }] },
    { baseName: "Power Bank 10000mAh", unit: "each", basePrice: 999, attributes: { country_of_origin: "India" }, variants: [ea()] },
    { baseName: "USB-C Cable", unit: "each", basePrice: 199, attributes: { country_of_origin: "India" }, variants: [{ label: "1m", axes: { size: "1m" }, baseUnit: "count", baseQuantity: 1 }, { label: "2m", axes: { size: "2m" }, baseUnit: "count", baseQuantity: 1 }] },
    { baseName: "LED Bulb 9W", unit: "each", basePrice: 99, attributes: { country_of_origin: "India" }, variants: [multipack(1), multipack(4)] },
  ],
  pooja: [
    { baseName: "Agarbatti", unit: "pack", basePrice: 40, attributes: { country_of_origin: "India" }, variants: [multipack(1), multipack(3)] },
    { baseName: "Camphor", unit: "g", basePrice: 60, attributes: { country_of_origin: "India" }, variants: [g(50), g(100)] },
    { baseName: "Cotton Wicks", unit: "pack", basePrice: 30, attributes: { country_of_origin: "India" }, variants: [multipack(1)] },
    { baseName: "Pooja Oil", unit: "ml", basePrice: 120, attributes: { country_of_origin: "India" }, variants: [ml(500), l(1)] },
  ],
  medicine: [
    { baseName: "Paracetamol Tablets", unit: "pack", basePrice: 30, attributes: { country_of_origin: "India", prescription_required: false, shelf_life: 730 }, variants: [multipack(10), multipack(15)] },
    { baseName: "Pain Relief Spray", unit: "ml", basePrice: 150, attributes: { country_of_origin: "India", prescription_required: false, shelf_life: 1095 }, variants: [ml(55), ml(100)] },
    { baseName: "Cough Syrup", unit: "ml", basePrice: 95, attributes: { country_of_origin: "India", prescription_required: false, shelf_life: 730 }, variants: [ml(100), ml(200)] },
    { baseName: "Digestive Tablets", unit: "pack", basePrice: 45, attributes: { country_of_origin: "India", prescription_required: false, shelf_life: 730 }, variants: [multipack(15), multipack(30)] },
  ],
  "regional-foods": [
    { baseName: "Idli Dosa Batter", unit: "g", basePrice: 60, attributes: FOOD("veg", "refrigerated"), variants: [kg(1), { label: "2kg", axes: { weight: "2kg" }, baseUnit: "g", baseQuantity: 2000 }] },
    { baseName: "Sambar Powder", unit: "g", basePrice: 80, attributes: FOOD("veg"), variants: [g(100), g(200), g(500)] },
    { baseName: "Filter Coffee Powder", unit: "g", basePrice: 160, attributes: FOOD("veg"), variants: [g(250), g(500)] },
    { baseName: "Banana Chips", unit: "g", basePrice: 70, attributes: FOOD("veg"), variants: [g(200), g(500)] },
    { baseName: "Appalam", unit: "pack", basePrice: 55, attributes: FOOD("veg"), variants: [g(100), g(200)] },
  ],
  "local-specialties": [
    { baseName: "Country Sugar", unit: "kg", basePrice: 75, attributes: FOOD("veg"), variants: [g(500), kg(1)] },
    { baseName: "Cold Pressed Coconut Oil", unit: "ml", basePrice: 220, attributes: FOOD("veg"), variants: [ml(500), l(1)] },
    { baseName: "Handmade Pickle", unit: "g", basePrice: 130, attributes: FOOD("veg"), variants: [g(300), g(500)] },
    { baseName: "Millet Flour", unit: "kg", basePrice: 95, attributes: FOOD("veg"), variants: [g(500), kg(1)] },
    { baseName: "Native Rice", unit: "kg", basePrice: 110, attributes: FOOD("veg"), variants: [kg(1), kg(5)] },
  ],
};

/**
 * Baseline real attributes merged under every product of a department, guaranteeing >=3 populated
 * PP-1 attributes per product (Phase 5 completeness). Template attributes override these.
 */
export const DEPARTMENT_DEFAULTS: Record<string, AttributeMap> = {
  groceries: { country_of_origin: "India", vegetarian: "veg", shelf_life: 180 },
  "fresh-produce": { country_of_origin: "India", organic: false, storage_type: "cool_ventilated" },
  dairy: { country_of_origin: "India", vegetarian: "veg", storage_type: "refrigerated" },
  bakery: { country_of_origin: "India", vegetarian: "veg", shelf_life: 5 },
  beverages: { country_of_origin: "India", vegetarian: "veg", shelf_life: 270 },
  snacks: { country_of_origin: "India", vegetarian: "veg", shelf_life: 180 },
  "personal-care": { country_of_origin: "India", material: "assorted", shelf_life: 730 },
  beauty: { country_of_origin: "India", gender: "unisex", shelf_life: 1095 },
  health: { country_of_origin: "India", prescription_required: false, shelf_life: 730 },
  "baby-care": { country_of_origin: "India", age_group: "infant", shelf_life: 730 },
  "pet-care": { country_of_origin: "India", vegetarian: "non-veg", shelf_life: 540 },
  household: { country_of_origin: "India", material: "assorted", shelf_life: 1095 },
  cleaning: { country_of_origin: "India", material: "liquid", shelf_life: 1095 },
  kitchen: { country_of_origin: "India", material: "stainless-steel", shelf_life: 3650 },
  stationery: { country_of_origin: "India", material: "paper", shelf_life: 3650 },
  electronics: { country_of_origin: "India", material: "electronic", shelf_life: 1825 },
  pooja: { country_of_origin: "India", material: "assorted", shelf_life: 1095 },
  medicine: { country_of_origin: "India", prescription_required: false, shelf_life: 730 },
  "regional-foods": { country_of_origin: "India", vegetarian: "veg", shelf_life: 120 },
  "local-specialties": { country_of_origin: "India", vegetarian: "veg", shelf_life: 120 },
};

/** Ordered list of departments PP-4 targets for full coverage (Phase 3). */
export const TARGET_DEPARTMENTS = Object.keys(DEPARTMENT_TEMPLATES);
