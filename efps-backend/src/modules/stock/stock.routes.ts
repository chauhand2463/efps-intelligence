import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import {
  getCurrentStockHandler,
  getStockHistoryHandler,
  updateAllocationHandler,
} from './stock.controller.js';

export async function stockRoutes(app: FastifyInstance) {
  app.get('/stock', {
    preHandler: [authenticate],
  }, getCurrentStockHandler);

  app.get('/stock/history', {
    preHandler: [authenticate],
  }, getStockHistoryHandler);

  app.patch('/stock/:id', {
    preHandler: [authenticate, authorize('admin')],
  }, updateAllocationHandler);
}
