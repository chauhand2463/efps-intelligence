import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { listDirectoryHandler } from './directory.controller.js';

export async function directoryRoutes(app: FastifyInstance) {
  app.get('/directory', { preHandler: [authenticate] }, listDirectoryHandler);
}
