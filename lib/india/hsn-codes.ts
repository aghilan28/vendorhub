export const CATEGORY_HSN_MAP: Record<string, { hsn: string; rate: number; description: string }> = {
  groceries: { hsn: "0401", rate: 0, description: "Dairy and food products" },
  vegetables: { hsn: "0702", rate: 0, description: "Fresh vegetables" },
  electronics: { hsn: "8471", rate: 18, description: "Electronic goods" },
  "mobile-phones": { hsn: "8517", rate: 18, description: "Mobile phones and accessories" },
  clothing: { hsn: "6109", rate: 5, description: "Garments and apparel" },
  footwear: { hsn: "6401", rate: 18, description: "Footwear" },
  books: { hsn: "4901", rate: 0, description: "Books and printed material" },
  medicine: { hsn: "3004", rate: 12, description: "Pharmaceutical goods" },
  furniture: { hsn: "9403", rate: 18, description: "Furniture" },
  default: { hsn: "9999", rate: 18, description: "General goods and services" },
};

export function getHSN(categorySlug: string) {
  return CATEGORY_HSN_MAP[categorySlug] ?? CATEGORY_HSN_MAP.default;
}
