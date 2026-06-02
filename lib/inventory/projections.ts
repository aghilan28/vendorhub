import { InventoryPosition } from './types';

export class SearchProjection {
  static getInventorySearchRecord(position: InventoryPosition) {
    return {
      id: position.id,
      productId: position.productId,
      storeId: position.storeId,
      sku: position.sku,
      status: position.status,
      isAvailable: position.onHand > 0,
    };
  }
}

export class IntelligenceProjection {
  static getForecastReadiness(productId: string, positions: InventoryPosition[]) {
    const productPositions = positions.filter(p => p.productId === productId);
    return {
      productId,
      historicalDataPoints: 0, // To be linked to InventoryEvents
      currentStockDensity: productPositions.length > 0 ? productPositions.reduce((sum, p) => sum + p.onHand, 0) / productPositions.length : 0,
      readinessScore: productPositions.length > 0 ? 0.8 : 0.0,
    };
  }
}
