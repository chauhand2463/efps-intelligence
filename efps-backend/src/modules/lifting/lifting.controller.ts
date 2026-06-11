import type { FastifyRequest, FastifyReply } from 'fastify';
import { liftingService } from './lifting.service.js';
import { createLiftingSchema, listLiftingSchema } from './lifting.schema.js';
import { sendSuccess, sendCreated } from '../../shared/utils/response.js';

export async function createLiftingHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = createLiftingSchema.parse(request.body);
  const result = await liftingService.create(request.user!.id, body);
  return sendCreated(reply, result);
}

export async function listLiftingHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = listLiftingSchema.parse(request.query);
  const result = await liftingService.list(request.user!.id, query);
  return reply.send({ success: true, data: result.data, meta: result.meta });
}

export async function getLiftingHistoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await liftingService.getHistory(request.user!.id);
  return sendSuccess(reply, result);
}
