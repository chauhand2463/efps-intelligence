import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { createAdHandler, listAdsHandler, updateAdHandler } from './ads.controller.js';

export async function adsRoutes(app: FastifyInstance) {
  app.post('/ads', { preHandler: [authenticate] }, createAdHandler);
  app.get('/ads', { preHandler: [authenticate] }, listAdsHandler);
  app.patch('/ads/:id', { preHandler: [authenticate] }, updateAdHandler);
}
