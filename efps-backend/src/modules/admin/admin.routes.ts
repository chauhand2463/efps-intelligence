import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { Role } from '../../shared/types/enums.js';
import {
  listDealersHandler,
  suspendDealerHandler,
  getPlatformStatsHandler,
  bulkNotifyHandler,
} from './admin.controller.js';

export async function adminRoutes(app: FastifyInstance) {
  const adminGuard = [authenticate, authorize(Role.ADMIN)];

  app.get('/admin/dealers', { preHandler: adminGuard }, listDealersHandler);

  app.patch('/admin/dealers/:id/suspend', { preHandler: adminGuard }, suspendDealerHandler);

  app.get('/admin/stats', { preHandler: adminGuard }, getPlatformStatsHandler);

  app.post('/admin/bulk-notify', { preHandler: adminGuard }, bulkNotifyHandler);
}
