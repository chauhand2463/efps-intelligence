import type { FastifyRequest, FastifyReply } from 'fastify';
import { auditService } from './audit.service.js';
import { createAuditSchema } from './audit.schema.js';
import { sendSuccess, sendCreated } from '../../shared/utils/response.js';

export async function createAuditMeetingHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = createAuditSchema.parse(request.body);
  const result = await auditService.create(request.user!.id, body);
  return sendCreated(reply, result);
}

export async function listAuditMeetingsHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await auditService.list(request.user!.id);
  return sendSuccess(reply, result);
}
