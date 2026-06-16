import type { FastifyRequest, FastifyReply } from 'fastify';
import { adsService } from './ads.service.js';
import { createAdSchema, updateAdSchema, listAdsSchema } from './ads.schema.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/utils/response.js';

export async function createAdHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = createAdSchema.parse(request.body);
  const result = await adsService.create(request.user!.id, body);
  return sendCreated(reply, result);
}

export async function listAdsHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = listAdsSchema.parse(request.query);
  const result = await adsService.list(request.user!.id, query);
  return reply.send({ success: true, data: result.data, meta: result.meta });
}

export async function getAdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await adsService.getById(id, request.user!.id);
  return sendSuccess(reply, result);
}

export async function updateAdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const body = updateAdSchema.parse(request.body);
  const result = await adsService.update(id, request.user!.id, body);
  return sendSuccess(reply, result);
}

export async function deleteAdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await adsService.remove(id, request.user!.id);
  return sendNoContent(reply);
}
