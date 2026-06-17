import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { getDashboardSummaryHandler } from './dashboard.controller.js';
import { getMasterDashboardHandler } from './dashboard.master.controller.js';

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/dashboard/summary', { preHandler: [authenticate] }, getDashboardSummaryHandler);
  app.get('/dashboard/master', { preHandler: [authenticate] }, getMasterDashboardHandler);
}
