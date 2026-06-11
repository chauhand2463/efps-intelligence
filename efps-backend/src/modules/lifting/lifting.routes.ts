import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { createLiftingHandler, listLiftingHandler, getLiftingHistoryHandler } from './lifting.controller.js';

export async function liftingRoutes(app: FastifyInstance) {
  app.post('/lifting', { preHandler: [authenticate] }, createLiftingHandler);
  app.get('/lifting', { preHandler: [authenticate] }, listLiftingHandler);
  app.get('/lifting/history', { preHandler: [authenticate] }, getLiftingHistoryHandler);
}
