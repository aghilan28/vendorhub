import { InventoryEvent, InventoryEventType, InventoryPosition } from './types';

export class EventEngine {
  static createEvent(
    inventoryId: string,
    type: InventoryEventType,
    delta: number,
    after: number,
    reason: string,
    actorId: string
  ): InventoryEvent {
    return {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      inventoryId,
      type,
      delta,
      after,
      reason,
      actorId,
      createdAt: new Date().toISOString(),
    };
  }

  static applyEvent(position: InventoryPosition, type: InventoryEventType, delta: number, reason: string, actorId: string) {
    let newOnHand = position.onHand;
    let newDamaged = position.damaged;

    switch (type) {
      case 'RECEIVE':
      case 'RESTOCK':
        newOnHand += delta;
        break;
      case 'ADJUST':
      case 'CORRECTION':
        newOnHand += delta;
        break;
      case 'DAMAGE':
        newOnHand -= delta;
        newDamaged += delta;
        break;
      case 'RETURN':
        newOnHand += delta;
        break;
    }

    const event = this.createEvent(position.id, type, delta, newOnHand, reason, actorId);
    return { newOnHand, newDamaged, event };
  }
}
