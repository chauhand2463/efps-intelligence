import { FastifyInstance } from 'fastify';
import { handleSync } from './internal-sync.controller.js';

export async function internalSyncRouter(app: FastifyInstance): Promise<void> {
  app.post('/api/internal/sync', handleSync);
}
