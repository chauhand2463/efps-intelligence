import type { FastifyRequest, FastifyReply } from 'fastify';
import { adsService } from './ads.service.js';
import { createAdSchema, updateAdSchema } from './ads.schema.js';
import { sendSuccess, sendCreated } from '../../shared/utils/response.js';

export async function createAdHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = createAdSchema.parse(request.body);
  const result = await adsService.create(request.user!.id, body);
  return sendCreated(reply, result);
}

export async function listAdsHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await adsService.list(request.user!.id);
  return sendSuccess(reply, result);
}

export async function updateAdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const body = updateAdSchema.parse(request.body);
  const result = await adsService.update(id, request.user!.id, body);
  return sendSuccess(reply, result);
}
