import { CommerceLink, RelationshipSource } from './types';

export class RelationshipEngine {
  static createLink(productId: string, storeId: string, sellerId: string, source: RelationshipSource = 'MANUAL'): CommerceLink {
    return {
      id: `link-${productId}-${storeId}`,
      productId,
      storeId,
      sellerId,
      status: 'APPROVED',
      source,
      confidence: 1.0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  static getLinksByProduct(productId: string, allLinks: CommerceLink[]) {
    return allLinks.filter(l => l.productId === productId);
  }

  static getLinksByStore(storeId: string, allLinks: CommerceLink[]) {
    return allLinks.filter(l => l.storeId === storeId);
  }
}
