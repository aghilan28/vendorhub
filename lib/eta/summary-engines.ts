import { ETAResult } from './types';

export class ETARiskEngine {
  static analyzeRisk(result: ETAResult): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (result.estimatedMinutes > 45 || result.riskLevel === 'HIGH') return 'HIGH';
    if (result.confidence < 0.75) return 'MEDIUM';
    return 'LOW';
  }
}

export class ETAConfidenceEngine {
  static calculateConfidence(history: any[]): number {
    return history.length > 0 ? 0.85 : 0.5;
  }
}

export class ValidationEngine {
  static validate(result: ETAResult) {
    const errors = [];
    if (result.estimatedMinutes < 0) errors.push('NEGATIVE_ETA');
    if (!result.storeId) errors.push('MISSING_STORE_ID');
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export class BuyerProjection {
  static projectETA(result: ETAResult) {
    return {
      label: `${result.estimatedMinutes} mins`,
      window: `${result.minETA}-${result.maxETA} mins`,
      confidence: `${(result.confidence * 100).toFixed(0)}%`,
      explanation: result.explanation,
    };
  }
}

export class IntelligenceProjection {
  static getETAIntelligence() {
    // Future analytics readiness
    return {
      avgPrepTime: 0,
      etaAccuracy: 0,
      capacityUtilization: 0,
      coverageEfficiency: 0
    };
  }
}
