import brands from './brands.json';
import categories from './categories.json';
import { Brand, Category } from './types';
export class BrandExpansionEngine {
  static getRelevantCategories(brandSlug: string): Category[] {
    const brand = (brands as Brand[]).find(b => b.slug === brandSlug);
    if (!brand) return [];
    const focus = brand.metadata.category_focus?.toLowerCase() || '';
    if (focus.includes('fmcg')) return (categories as Category[]).filter(c => ['atta-rice-dal', 'oil-ghee', 'beverages', 'milk-curd', 'bath-body', 'hair-care', 'oral-care'].includes(c.slug));
    if (focus.includes('dairy')) return (categories as Category[]).filter(c => ['milk-curd', 'butter-cheese'].includes(c.slug));
    if (focus.includes('pharmacy')) return (categories as Category[]).filter(c => ['bath-body', 'hair-care', 'oral-care'].includes(c.slug));
    if (focus.includes('electronics')) return (categories as Category[]).filter(c => ['mobiles', 'computers'].includes(c.slug));
    if (focus.includes('fashion')) return (categories as Category[]).filter(c => ['men', 'women', 'footwear'].includes(c.slug));
    return (categories as Category[]).slice(0, 3);
  }
  static getAllBrands(): Brand[] { return brands as Brand[]; }
}
