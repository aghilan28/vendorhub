import { StoreRankingResult, StoreSelection } from './types';

export class ValidationEngine {
  static validate(result: StoreRankingResult) {
    const errors = [];
    if (result.score < 0 || result.score > 1) errors.push('INVALID_SCORE_RANGE');
    if (!result.storeId) errors.push('MISSING_STORE_ID');
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export class BuyerProjection {
  static projectRankings(rankings: StoreRankingResult[], selection: StoreSelection) {
    return {
      recommended: selection.recommendedStoreId,
      results: rankings.map(r => ({
        storeId: r.storeId,
        rank: r.rank,
        score: `${(r.score * 100).toFixed(1)}%`,
        reason: r.explanation,
      })),
      summary: selection.selectionReason,
    };
  }
}

export class IntelligenceProjection {
  static getRankingDrift() {
    // Readiness for future drift analysis
    return {
      averageScoreDelta: 0.0,
      rankShifts: [],
    };
  }
}
