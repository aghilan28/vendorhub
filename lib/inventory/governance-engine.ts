import { InventoryPosition } from './types';

export class GovernanceEngine {
  static auditPosition(position: InventoryPosition): string[] {
    const alerts = [];
    if (position.onHand < 0) alerts.push('NEGATIVE_STOCK');
    if (position.reserved > position.onHand) alerts.push('RESERVATION_OVERFLOW');
    if (position.reorderThreshold < position.safetyStock) alerts.push('INVALID_THRESHOLD_CONFIG');
    return alerts;
  }
}

export class ValidationEngine {
  static validate(position: InventoryPosition) {
    const alerts = GovernanceEngine.auditPosition(position);
    return {
      valid: alerts.length === 0,
      alerts,
    };
  }
}
