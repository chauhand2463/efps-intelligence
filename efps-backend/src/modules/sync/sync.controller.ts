import type { FastifyRequest, FastifyReply } from 'fastify';
import { syncService } from './sync.service.js';
import { triggerSyncSchema, updateBankInfoSchema } from './sync.schema.js';
import { sendSuccess, sendCreated } from '../../shared/utils/response.js';

export async function triggerSyncHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = triggerSyncSchema.parse(request.body);
  const result = await syncService.triggerSync(body);
  return sendCreated(reply, result);
}

export async function getSyncHistoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await syncService.getSyncHistory();
  return sendSuccess(reply, result);
}

export async function getBankInfoHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await syncService.getBankInfo(request.user!.id);
  return sendSuccess(reply, result);
}

export async function updateBankInfoHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = updateBankInfoSchema.parse(request.body);
  const result = await syncService.updateBankInfo(request.user!.id, body);
  return sendSuccess(reply, result);
}
