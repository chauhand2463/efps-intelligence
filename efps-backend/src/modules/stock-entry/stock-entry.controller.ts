import type { FastifyRequest, FastifyReply } from 'fastify';
import { stockEntryService } from './stock-entry.service.js';
import { saveStockEntrySchema, allocateSchema, listStockHistorySchema } from './stock-entry.schema.js';
import { sendSuccess, sendCreated } from '../../shared/utils/response.js';

export async function getTodayStockHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await stockEntryService.getToday(request.user!.id);
  return sendSuccess(reply, result);
}

export async function saveStockEntryHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = saveStockEntrySchema.parse(request.body);
  const result = await stockEntryService.saveEntry(request.user!.id, body);
  return sendCreated(reply, result);
}

export async function getAllocationsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { month } = request.query as { month?: string };
  const result = await stockEntryService.getAllocations(request.user!.id, month);
  return sendSuccess(reply, result);
}

export async function allocateHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = allocateSchema.parse(request.body);
  const result = await stockEntryService.allocate(request.user!.id, body);
  return sendCreated(reply, result);
}

export async function getStockHistoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = listStockHistorySchema.parse(request.query);
  const result = await stockEntryService.getHistory(request.user!.id, query);
  return reply.send({ success: true, data: result.data, meta: result.meta });
}
