import { BrandExpansionEngine } from './BrandExpansionEngine';
import { VariantExpansionEngine } from './VariantExpansionEngine';
import { PackagingExpansionEngine } from './PackagingExpansionEngine';
import { SearchNormalizationEngine } from './SearchNormalizationEngine';
import families from './product_families.json';
import { GeneratedProduct, ProductFamily } from './types';
import { v4 as uuidv4 } from 'uuid';
export class ProductGenerationEngine {
  static generateUniverse(): GeneratedProduct[] {
    const products: GeneratedProduct[] = [];
    const brands = BrandExpansionEngine.getAllBrands();
    for (const brand of brands) {
      const relevantCategories = BrandExpansionEngine.getRelevantCategories(brand.slug);
      for (const category of relevantCategories) {
        const brandFamilies = (families as ProductFamily[]).filter(f => f.category_id === category.id).slice(0, 5);
        for (const family of brandFamilies) {
          const variants = VariantExpansionEngine.getVariantsForFamily(family.slug);
          const sizes = PackagingExpansionEngine.getPackageSizes(family.slug);
          for (const variant of variants) {
            for (const size of sizes) {
              const productName = `${brand.name} ${family.name} - ${variant} ${size.size}${size.unit}`;
              const slug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              products.push({
                id: uuidv4(), name: productName, slug: slug, brand_id: brand.id, category_id: category.id,
                description: `Genuine ${brand.name} ${family.name} (${variant}). High quality ${category.name} product.`,
                status: 'ACTIVE', unit: size.unit, package_size: size.size,
                image_url: `https://assets.vendorhub.in/products/${slug}.png`,
                search_terms: SearchNormalizationEngine.generateSearchTerms(productName, brand.name, category.name),
                vendor_id: '30000000-0000-4000-8000-000000000001',
                base_price: Math.floor(Math.random() * 500) + 10
              });
              if (products.length >= 60000) return products;
            }
          }
        }
      }
    }
    return products;
  }
}
