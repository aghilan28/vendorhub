export class VariantExpansionEngine {
  static getVariantsForFamily(familySlug: string): string[] {
    if (familySlug.includes('milk')) return ['Toned', 'Full Cream', 'Double Toned', 'Skimmed'];
    if (familySlug.includes('rice')) return ['Raw', 'Boiled', 'Steam', 'Basmati'];
    if (familySlug.includes('atta')) return ['Chakki Fresh', 'Multigrain', 'Select', 'Organic'];
    if (familySlug.includes('soap')) return ['Classic', 'Antibacterial', 'Sandal', 'Aloe Vera'];
    return ['Standard', 'Premium'];
  }
}
