export interface ETARequest {
  productId: string;
  storeId: string;
  distanceKm: number;
  trafficMode: 'light' | 'normal' | 'heavy';
  transportMode: 'WALKING' | 'BIKE' | 'SCOOTER' | 'CAR' | 'DELIVERY_VEHICLE';
}

export interface ETAResult {
  storeId: string;
  estimatedMinutes: number;
  minETA: number;
  maxETA: number;
  confidence: number;
  explanation: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}
