export class SearchNormalizationEngine {
  static generateSearchTerms(name: string, brandName: string, categoryName: string): string[] {
    const terms = new Set<string>();
    name.toLowerCase().split(' ').forEach(p => { if (p.length > 2) terms.add(p); });
    terms.add(brandName.toLowerCase());
    terms.add(categoryName.toLowerCase());
    if (name.toLowerCase().includes('milk')) { terms.add('paal'); terms.add('doodh'); }
    if (name.toLowerCase().includes('rice')) { terms.add('arisi'); terms.add('chawal'); }
    return Array.from(terms);
  }
}
