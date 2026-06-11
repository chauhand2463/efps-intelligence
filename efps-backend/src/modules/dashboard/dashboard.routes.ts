import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { getDashboardSummaryHandler } from './dashboard.controller.js';

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/dashboard/summary', { preHandler: [authenticate] }, getDashboardSummaryHandler);
}
