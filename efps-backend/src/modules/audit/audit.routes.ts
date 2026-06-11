import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { createAuditMeetingHandler, listAuditMeetingsHandler } from './audit.controller.js';

export async function auditRoutes(app: FastifyInstance) {
  app.post('/audit/meetings', { preHandler: [authenticate] }, createAuditMeetingHandler);
  app.get('/audit/meetings', { preHandler: [authenticate] }, listAuditMeetingsHandler);
}
