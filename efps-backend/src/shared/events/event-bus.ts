export const EventTypes = {
  TRANSACTION_COMPLETED: 'transaction:completed',
  LIFTING_CREATED: 'lifting:created',
  COMMISSION_CALCULATED: 'commission:calculated',
  COMMISSION_SETTLED: 'commission:settled',
  STOCK_LOW: 'stock:low',
  BENEFICIARY_CREATED: 'beneficiary:created',
  BENEFICIARY_UPDATED: 'beneficiary:updated',
  ALLOCATION_CREATED: 'allocation:created',
  ALLOCATION_UPDATED: 'allocation:updated',
  SYNC_COMPLETED: 'sync:completed',
  DASHBOARD_REFRESH: 'dashboard:refresh',
  GOVT_SYNC_BATCH: 'govt:sync-batch',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

export class EventBus {
  async emit(event: string, payload: unknown) {
    const { enqueueDomainEvent } = await import('../../jobs/domain-events.queue.js');
    await enqueueDomainEvent(event, payload).catch((err) => {
      console.error(`[EventBus] Failed to enqueue ${event}:`, err);
    });
  }

  removeAll() {
    // No-op: handlers are on the worker side
  }
}

export const eventBus = new EventBus();
