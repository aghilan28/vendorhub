export class PackagingExpansionEngine {
  static getPackageSizes(familySlug: string): { size: string, unit: string }[] {
    if (familySlug.includes('milk')) return [{ size: '500', unit: 'ml' }, { size: '1', unit: 'L' }];
    if (familySlug.includes('atta') || familySlug.includes('rice')) return [{ size: '1', unit: 'kg' }, { size: '5', unit: 'kg' }];
    if (familySlug.includes('soap')) return [{ size: '75', unit: 'g' }, { size: '125', unit: 'g' }];
    return [{ size: '1', unit: 'pc' }];
  }
}
