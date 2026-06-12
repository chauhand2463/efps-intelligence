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

type EventHandler<T = unknown> = (payload: T) => Promise<void>;

class EventBus {
  private handlers = new Map<string, EventHandler[]>();

  on(event: string, handler: EventHandler) {
    const existing = this.handlers.get(event) ?? [];
    existing.push(handler);
    this.handlers.set(event, existing);
  }

  async emit(event: string, payload: unknown) {
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    await Promise.allSettled(handlers.map((h) => h(payload)));
  }

  removeAll() {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();
