import { CommerceLink } from './types';

export class SearchProjection {
  static getStoreResults(productId: string, links: CommerceLink[]) {
    return links
      .filter(l => l.productId === productId && l.status === 'APPROVED')
      .map(l => l.storeId);
  }

  static getProductResults(storeId: string, links: CommerceLink[]) {
    return links
      .filter(l => l.storeId === storeId && l.status === 'APPROVED')
      .map(l => l.productId);
  }
}

export class RecommendationProjection {
  static suggestAlternativeStores(productId: string, currentStoreId: string, links: CommerceLink[]) {
    return links
      .filter(l => l.productId === productId && l.storeId !== currentStoreId && l.status === 'APPROVED')
      .map(l => l.storeId);
  }
}

export class IntelligenceProjection {
  static getMarketPenetration(productId: string, totalStores: number, links: CommerceLink[]) {
    const storeCount = links.filter(l => l.productId === productId && l.status === 'APPROVED').length;
    return storeCount / Math.max(1, totalStores);
  }
}
