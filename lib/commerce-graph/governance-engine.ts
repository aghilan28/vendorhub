import { CommerceLink, RelationshipStatus } from './types';

export class GovernanceEngine {
  static processAction(link: CommerceLink, action: 'APPROVE' | 'REJECT' | 'ARCHIVE'): CommerceLink {
    const statusMap: Record<string, RelationshipStatus> = {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
      ARCHIVE: 'ARCHIVED',
    };
    return {
      ...link,
      status: statusMap[action] || link.status,
      updatedAt: new Date().toISOString(),
    };
  }
}

export class ValidationEngine {
  static validate(link: CommerceLink) {
    const errors = [];
    if (!link.productId) errors.push('MISSING_PRODUCT');
    if (!link.storeId) errors.push('MISSING_STORE');
    if (!link.sellerId) errors.push('MISSING_SELLER');
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
