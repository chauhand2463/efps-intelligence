import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { createAdHandler, listAdsHandler, getAdHandler, updateAdHandler, deleteAdHandler } from './ads.controller.js';

export async function adsRoutes(app: FastifyInstance) {
  app.post('/ads', { preHandler: [authenticate] }, createAdHandler);
  app.get('/ads', { preHandler: [authenticate] }, listAdsHandler);
  app.get('/ads/:id', { preHandler: [authenticate] }, getAdHandler);
  app.patch('/ads/:id', { preHandler: [authenticate] }, updateAdHandler);
  app.delete('/ads/:id', { preHandler: [authenticate] }, deleteAdHandler);
}
