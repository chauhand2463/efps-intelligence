import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import {
  setCommissionRateHandler, getCommissionRatesHandler,
  calculateCommissionHandler, listCommissionsHandler,
  getSettlementHistoryHandler, createSettlementHandler,
} from './commission.controller.js';

export async function commissionRoutes(app: FastifyInstance) {
  app.get('/commission/rates', { preHandler: [authenticate] }, getCommissionRatesHandler);
  app.post('/commission/rates', { preHandler: [authenticate, authorize('admin')] }, setCommissionRateHandler);
  app.get('/commission/calculate', { preHandler: [authenticate] }, calculateCommissionHandler);
  app.get('/commission', { preHandler: [authenticate] }, listCommissionsHandler);
  app.get('/commission/settlements', { preHandler: [authenticate] }, getSettlementHistoryHandler);
  app.post('/commission/settle', { preHandler: [authenticate] }, createSettlementHandler);
}
