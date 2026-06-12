import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { Role } from '../../shared/types/enums.js';
import {
  triggerSyncHandler, getSyncHistoryHandler, getBankInfoHandler, updateBankInfoHandler,
  importCsvHandler, importSingleRowHandler,
  syncAllDealersHandler, syncDistrictHandler,
  getImportBatchesHandler, getChangeLogHandler,
  triggerSelfSyncHandler, getSelfSyncStatusHandler,
} from './sync.controller.js';

export async function syncRoutes(app: FastifyInstance) {
  const adminGuard = [authenticate, authorize(Role.ADMIN)];
  const authGuard = [authenticate];

  app.get('/sync/bank-info', { preHandler: authGuard }, getBankInfoHandler);
  app.put('/sync/bank-info', { preHandler: authGuard }, updateBankInfoHandler);

  app.post('/sync/trigger', { preHandler: adminGuard }, triggerSyncHandler);
  app.get('/sync/history', { preHandler: adminGuard }, getSyncHistoryHandler);

  app.post('/sync/self/trigger', { preHandler: authGuard }, triggerSelfSyncHandler);
  app.get('/sync/self/status', { preHandler: authGuard }, getSelfSyncStatusHandler);

  app.post('/sync/import/csv', { preHandler: authGuard }, importCsvHandler);
  app.post('/sync/import/row', { preHandler: authGuard }, importSingleRowHandler);

  app.post('/sync/run-all', { preHandler: adminGuard }, syncAllDealersHandler);
  app.post('/sync/run-district', { preHandler: adminGuard }, syncDistrictHandler);

  app.get('/sync/import-batches', { preHandler: adminGuard }, getImportBatchesHandler);
  app.get('/sync/import-batches/:batchId/changes', { preHandler: adminGuard }, getChangeLogHandler);
}
