/**
 * Event handlers are registered on the BullMQ domain-events worker,
 * not in-process. This function is kept as a no-op for compatibility.
 */
export function registerEventHandlers() {
  // All side-effect handlers run in the BullMQ worker at src/jobs/domain-events.queue.ts
}
