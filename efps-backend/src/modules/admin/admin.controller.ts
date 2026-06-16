import type { FastifyRequest, FastifyReply } from 'fastify';
import { adminService } from './admin.service.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ERROR_CODES } from '../../config/constants.js';
import { listDealersSchema, bulkNotifySchema } from './admin.schema.js';
import { sendSuccess } from '../../shared/utils/response.js';

export async function listDealersHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = listDealersSchema.parse(request.query);
  const result = await adminService.listDealers(query);
  return reply.send({ success: true, data: result.data, meta: result.meta });
}

export async function suspendDealerHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await adminService.suspendDealer(id);
  if (!result) {
    throw new AppError('Dealer not found', 404, ERROR_CODES.DEALER_NOT_FOUND);
  }
  return sendSuccess(reply, result);
}

export async function getPlatformStatsHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await adminService.getPlatformStats();
  return sendSuccess(reply, result);
}

export async function bulkNotifyHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = bulkNotifySchema.parse(request.body);
  const result = await adminService.bulkNotify(body);
  return sendSuccess(reply, result);
}
