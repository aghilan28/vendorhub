import type { AppLocale } from "@/lib/i18n/config";
import type { Category, Product, Vendor } from "@/types";

export type LocalizedText = Partial<Record<AppLocale, string>>;

export const categoryLocalization: Record<string, { name: LocalizedText; description: LocalizedText; aliases: string[] }> = {};

export const productLocalization: Record<string, { name: LocalizedText; description: LocalizedText; aliases: string[] }> = {};

export const vendorLocalization: Record<string, { name: LocalizedText; coverageNote: LocalizedText; aliases: string[] }> = {};

export function localizeCategory(category: Category, locale: AppLocale): Category {
  const item = categoryLocalization[category.slug];
  if (!item) return category;
  return {
    ...category,
    name: item.name[locale] ?? category.name,
    description: item.description[locale] ?? category.description,
  };
}

export function localizeVendor(vendor: Vendor, locale: AppLocale): Vendor {
  const item = vendorLocalization[vendor.id];
  if (!item) return vendor;
  return {
    ...vendor,
    name: item.name[locale] ?? vendor.name,
    coverageNote: item.coverageNote[locale] ?? vendor.coverageNote,
  };
}

export function localizeProduct(product: Product, locale: AppLocale): Product {
  const item = productLocalization[product.id];
  return {
    ...product,
    name: item?.name[locale] ?? product.name,
    description: item?.description[locale] ?? product.description,
    category: localizeCategory(product.category, locale),
    vendor: localizeVendor(product.vendor, locale),
  };
}

export function getSearchAliases(product: Product) {
  return [
    ...(productLocalization[product.id]?.aliases ?? []),
    ...(categoryLocalization[product.category.slug]?.aliases ?? []),
    ...(vendorLocalization[product.vendor.id]?.aliases ?? []),
  ];
}
