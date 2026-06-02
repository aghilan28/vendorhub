import { CommerceLink } from './types';

export class DistributionEngine {
  static analyzeDistribution(productId: string, links: CommerceLink[]) {
    const productLinks = links.filter(l => l.productId === productId && l.status === 'APPROVED');
    return {
      productId,
      storeCount: productLinks.length,
      distributionScore: Math.min(1.0, productLinks.length / 10),
      stores: productLinks.map(l => l.storeId),
    };
  }
}
