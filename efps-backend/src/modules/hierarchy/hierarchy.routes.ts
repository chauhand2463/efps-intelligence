import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { Role } from '../../shared/types/enums.js';
import {
  getStateHandler, getChildrenHandler, getRegionHandler, getFpsHandler,
  getBreadcrumbHandler, importCsvHandler, searchRegionsHandler,
  getMonthsHandler, getChangeHistoryHandler,
} from './hierarchy.controller.js';

export async function hierarchyRoutes(app: FastifyInstance) {
  const adminGuard = [authenticate, authorize(Role.ADMIN)];
  const authGuard = [authenticate];

  app.get('/hierarchy/state/:month', { preHandler: authGuard }, getStateHandler);
  app.get('/hierarchy/regions/:regionId/children', { preHandler: authGuard }, getChildrenHandler);
  app.get('/hierarchy/regions/:regionId', { preHandler: authGuard }, getRegionHandler);
  app.get('/hierarchy/regions/:regionId/fps', { preHandler: authGuard }, getFpsHandler);
  app.get('/hierarchy/regions/:regionId/breadcrumb', { preHandler: authGuard }, getBreadcrumbHandler);
  app.get('/hierarchy/regions/:regionId/history', { preHandler: authGuard }, getChangeHistoryHandler);
  app.get('/hierarchy/search', { preHandler: authGuard }, searchRegionsHandler);
  app.get('/hierarchy/months', { preHandler: authGuard }, getMonthsHandler);
  app.post('/hierarchy/import/csv', { preHandler: adminGuard }, importCsvHandler);
}
