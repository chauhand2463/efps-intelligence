import type { FastifyRequest, FastifyReply } from 'fastify';
import { auditService } from './audit.service.js';
import { createAuditSchema, updateAuditSchema, listAuditSchema } from './audit.schema.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/utils/response.js';

export async function createAuditMeetingHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = createAuditSchema.parse(request.body);
  const result = await auditService.create(request.user!.id, body);
  return sendCreated(reply, result);
}

export async function listAuditMeetingsHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = listAuditSchema.parse(request.query);
  const result = await auditService.list(request.user!.id, query);
  return reply.send({ success: true, data: result.data, meta: result.meta });
}

export async function getAuditMeetingHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await auditService.getById(id, request.user!.id);
  return sendSuccess(reply, result);
}

export async function updateAuditMeetingHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const body = updateAuditSchema.parse(request.body);
  const result = await auditService.update(id, request.user!.id, body);
  return sendSuccess(reply, result);
}

export async function deleteAuditMeetingHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await auditService.remove(id, request.user!.id);
  return sendNoContent(reply);
}
