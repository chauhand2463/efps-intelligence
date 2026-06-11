import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { Role } from '../../shared/types/enums.js';
import { triggerSyncHandler, getSyncHistoryHandler, getBankInfoHandler, updateBankInfoHandler } from './sync.controller.js';

export async function syncRoutes(app: FastifyInstance) {
  app.post('/sync/trigger', { preHandler: [authenticate, authorize('admin')] }, triggerSyncHandler);
  app.get('/sync/history', { preHandler: [authenticate, authorize('admin')] }, getSyncHistoryHandler);
  app.get('/sync/bank-info', { preHandler: [authenticate] }, getBankInfoHandler);
  app.put('/sync/bank-info', { preHandler: [authenticate] }, updateBankInfoHandler);
}
