import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import {
  createSchemeHandler,
  listSchemesHandler,
  getSchemeHandler,
  updateSchemeHandler,
  deleteSchemeHandler,
  createIcdsCodeHandler,
  listIcdsCodesHandler,
  getIcdsCodeHandler,
  deleteIcdsCodeHandler,
} from './mdm.controller.js';
import {
  saveMonthlyRecordsHandler,
  getMonthlyRecordsHandler,
} from './mdm.monthly.controller.js';

export async function mdmRoutes(app: FastifyInstance) {
  const adminGuard = [authenticate, authorize('admin')];

  app.post('/mdm/schemes', { preHandler: adminGuard }, createSchemeHandler);
  app.get('/mdm/schemes', { preHandler: [authenticate] }, listSchemesHandler);
  app.get('/mdm/schemes/:id', { preHandler: [authenticate] }, getSchemeHandler);
  app.patch('/mdm/schemes/:id', { preHandler: adminGuard }, updateSchemeHandler);
  app.delete('/mdm/schemes/:id', { preHandler: adminGuard }, deleteSchemeHandler);

  app.post('/mdm/icds-codes', { preHandler: adminGuard }, createIcdsCodeHandler);
  app.get('/mdm/icds-codes', { preHandler: [authenticate] }, listIcdsCodesHandler);
  app.get('/mdm/icds-codes/:id', { preHandler: [authenticate] }, getIcdsCodeHandler);
  app.delete('/mdm/icds-codes/:id', { preHandler: adminGuard }, deleteIcdsCodeHandler);

  app.post('/mdm/monthly-records', { preHandler: [authenticate] }, saveMonthlyRecordsHandler);
  app.get('/mdm/monthly-records', { preHandler: [authenticate] }, getMonthlyRecordsHandler);
}
