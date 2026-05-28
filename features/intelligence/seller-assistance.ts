import type { SellerProduct } from "@/features/seller/types";
import type { SellerListingGuidance } from "./types";

export function buildSellerListingGuidance(product: Pick<SellerProduct, "name" | "category" | "price" | "stock" | "lowStockThreshold"> & { description?: string }) {
  const hasSize = /\d+\s?(g|kg|ml|l|pcs|pack)/i.test(product.name);
  const description = product.description ?? "";
  const qualityScore = Math.min(
    100,
    46 +
      (product.name.length >= 18 ? 14 : 4) +
      (hasSize ? 12 : 0) +
      (description.length >= 80 ? 14 : description.length >= 35 ? 8 : 2) +
      (product.stock > product.lowStockThreshold ? 8 : 3) +
      (product.price > 0 ? 6 : 0),
  );

  return {
    qualityScore,
    titleSuggestions: [
      hasSize ? product.name : `${product.name} ${product.category === "Dairy" ? "200g" : "Pack"}`,
      `${product.name} - ${product.category} from your verified store`,
      `${product.name} for same-day local delivery`,
    ],
    descriptionSuggestions: [
      "Mention pack size, freshness window, and how the item is handled before dispatch.",
      "Add common buyer use cases so search can match natural queries.",
      "Include storage or allergy details where relevant.",
    ],
    categorySuggestions: [product.category, product.category === "Dairy" ? "Fresh foods" : "Daily essentials", "Popular nearby"],
    searchOptimizationHints: [
      "Use buyer words such as breakfast, healthy, refill, quick dinner, or office where accurate.",
      "Keep important attributes in the title: quantity, flavor, material, or compatibility.",
      "Avoid vague descriptions; relevance improves when category and use case are explicit.",
    ],
    pricingSignals: [
      product.stock <= product.lowStockThreshold ? "Low stock: avoid aggressive discounting until replenished." : "Stock is healthy enough for a small visibility promotion.",
      "Review pricing guidance against seller margin before publishing.",
    ],
  } satisfies SellerListingGuidance;
}
