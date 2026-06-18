import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  getTodayStockHandler,
  saveStockEntryHandler,
  getAllocationsHandler,
  allocateHandler,
  getStockHistoryHandler,
} from './stock-entry.controller.js';

export async function stockEntryRoutes(app: FastifyInstance) {
  const authGuard = [authenticate];

  app.get('/stock/today', { preHandler: authGuard }, getTodayStockHandler);
  app.post('/stock/entry', { preHandler: authGuard }, saveStockEntryHandler);
  app.get('/allocations/monthly', { preHandler: authGuard }, getAllocationsHandler);
  app.post('/allocations', { preHandler: authGuard }, allocateHandler);
}
