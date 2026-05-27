import { ProductStatus, type Product } from "@/types";

const vendor = {
  id: "vendor-freshline",
  name: "Freshline Local",
  slug: "freshline-local",
  rating: 4.7,
  serviceStatus: "open",
  fulfillmentPromiseMinutes: 22,
} as const;

const category = {
  id: "cat-daily",
  name: "Daily essentials",
  slug: "daily-essentials",
};

export const productShellData: Product[] = [
  "Organic Tomato Pack",
  "Cold Pressed Groundnut Oil",
  "Farm Fresh Paneer",
  "Millet Breakfast Mix",
  "Seasonal Fruit Crate",
  "Whole Wheat Sourdough",
  "Filter Coffee Blend",
  "Ready Curry Kit",
].map((name, index) => ({
  id: `product-${index + 1}`,
  slug: name.toLowerCase().replaceAll(" ", "-"),
  name,
  vendor,
  category,
  price: [89, 340, 128, 210, 499, 160, 290, 180][index],
  currency: "INR",
  rating: [4.8, 4.6, 4.7, 4.5, 4.9, 4.4, 4.8, 4.6][index],
  stockCount: [18, 9, 4, 24, 12, 0, 7, 15][index],
  status: ProductStatus.Active,
}));
