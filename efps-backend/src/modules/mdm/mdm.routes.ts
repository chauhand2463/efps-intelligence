import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { createSchemeHandler, listSchemesHandler, updateSchemeHandler, createIcdsCodeHandler, listIcdsCodesHandler } from './mdm.controller.js';

export async function mdmRoutes(app: FastifyInstance) {
  app.post('/mdm/schemes', { preHandler: [authenticate, authorize('admin')] }, createSchemeHandler);
  app.get('/mdm/schemes', { preHandler: [authenticate] }, listSchemesHandler);
  app.patch('/mdm/schemes/:id', { preHandler: [authenticate, authorize('admin')] }, updateSchemeHandler);
  app.post('/mdm/icds-codes', { preHandler: [authenticate, authorize('admin')] }, createIcdsCodeHandler);
  app.get('/mdm/icds-codes', { preHandler: [authenticate] }, listIcdsCodesHandler);
}
