import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  createAuditMeetingHandler,
  listAuditMeetingsHandler,
  getAuditMeetingHandler,
  updateAuditMeetingHandler,
  deleteAuditMeetingHandler,
} from './audit.controller.js';

export async function auditRoutes(app: FastifyInstance) {
  app.post('/audit/meetings', { preHandler: [authenticate] }, createAuditMeetingHandler);
  app.get('/audit/meetings', { preHandler: [authenticate] }, listAuditMeetingsHandler);
  app.get('/audit/meetings/:id', { preHandler: [authenticate] }, getAuditMeetingHandler);
  app.patch('/audit/meetings/:id', { preHandler: [authenticate] }, updateAuditMeetingHandler);
  app.delete('/audit/meetings/:id', { preHandler: [authenticate] }, deleteAuditMeetingHandler);
}
