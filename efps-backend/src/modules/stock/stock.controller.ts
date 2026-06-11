import type { FastifyRequest, FastifyReply } from 'fastify';
import { stockService } from './stock.service.js';
import { listStockHistorySchema, updateAllocationSchema } from './stock.schema.js';
import { sendSuccess } from '../../shared/utils/response.js';

export async function getCurrentStockHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await stockService.getCurrent(request.user!.id);
  return sendSuccess(reply, result);
}

export async function getStockHistoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = listStockHistorySchema.parse(request.query);
  const result = await stockService.getHistory(request.user!.id, query);
  return reply.send({ success: true, data: result.data, meta: result.meta });
}

export async function updateAllocationHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const body = updateAllocationSchema.parse(request.body);
  const result = await stockService.updateAllocation(id, body);
  return sendSuccess(reply, result);
}
