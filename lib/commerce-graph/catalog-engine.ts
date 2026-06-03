import { CommerceLink, CatalogEntry } from './types';

export class StoreCatalogEngine {
  static generateCatalog(storeId: string, links: CommerceLink[]): CatalogEntry {
    const storeLinks = links.filter(l => l.storeId === storeId && l.status === 'APPROVED');
    return {
      storeId,
      products: storeLinks.map(l => l.productId),
      brands: Array.from(new Set(storeLinks.map(l => l.metadata?.brandId).filter(Boolean))),
      categories: Array.from(new Set(storeLinks.map(l => l.metadata?.categoryId).filter(Boolean))),
      departments: Array.from(new Set(storeLinks.map(l => l.metadata?.departmentId).filter(Boolean))),
      healthScore: storeLinks.length > 0 ? 1.0 : 0.0,
    };
  }
}

export class SellerCatalogEngine {
  static generateSellerCatalog(sellerId: string, links: CommerceLink[]) {
    const sellerLinks = links.filter(l => l.sellerId === sellerId && l.status === 'APPROVED');
    return {
      sellerId,
      productCount: sellerLinks.length,
      stores: Array.from(new Set(sellerLinks.map(l => l.storeId))),
      brandCoverage: Array.from(new Set(sellerLinks.map(l => l.metadata?.brandId).filter(Boolean))),
    };
  }
}
