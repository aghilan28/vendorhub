import { InventoryPosition } from './types';

export class StoreInventoryEngine {
  static getStoreSummary(storeId: string, positions: InventoryPosition[]) {
    const storePositions = positions.filter(p => p.storeId === storeId);
    return {
      storeId,
      totalSKUs: storePositions.length,
      totalOnHand: storePositions.reduce((sum, p) => sum + p.onHand, 0),
      healthySKUs: storePositions.filter(p => p.onHand > p.reorderThreshold).length,
      lowStockSKUs: storePositions.filter(p => p.onHand <= p.reorderThreshold && p.onHand > 0).length,
      outOfStockSKUs: storePositions.filter(p => p.onHand === 0).length,
    };
  }
}

export class ProductInventoryEngine {
  static getProductDistribution(productId: string, positions: InventoryPosition[]) {
    const productPositions = positions.filter(p => p.productId === productId);
    return {
      productId,
      storeCount: productPositions.length,
      totalOnHand: productPositions.reduce((sum, p) => sum + p.onHand, 0),
      distributionDensity: productPositions.length > 0 ? productPositions.reduce((sum, p) => sum + p.onHand, 0) / productPositions.length : 0,
    };
  }
}

export class SellerInventoryEngine {
  static getSellerHealth(sellerId: string, positions: InventoryPosition[]) {
    const sellerPositions = positions.filter(p => p.sellerId === sellerId);
    const total = sellerPositions.length;
    if (total === 0) return 1.0;
    const healthy = sellerPositions.filter(p => p.onHand > p.reorderThreshold).length;
    return healthy / total;
  }
}
