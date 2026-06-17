import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { commissionService } from './commission.service.js';
import { setCommissionRateSchema, listCommissionSchema, settlementSchema } from './commission.schema.js';
import { sendSuccess, sendCreated } from '../../shared/utils/response.js';

const calculateQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function setCommissionRateHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = setCommissionRateSchema.parse(request.body);
  const result = await commissionService.setRate(body);
  return sendCreated(reply, result);
}

export async function getCommissionRatesHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await commissionService.getRates();
  return sendSuccess(reply, result);
}

export async function calculateCommissionHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = calculateQuerySchema.parse(request.query);
  const today = new Date(); today.setDate(1);
  const month = query.month || today.toISOString().split('T')[0]!;
  const result = await commissionService.calculate(request.user!.id, month);
  return sendSuccess(reply, result);
}

export async function listCommissionsHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = listCommissionSchema.parse(request.query);
  const result = await commissionService.list(request.user!.id, query);
  return reply.send({ success: true, data: result.data, meta: result.meta });
}

export async function getSettlementHistoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await commissionService.getSettlementHistory(request.user!.id);
  return sendSuccess(reply, result);
}

export async function createSettlementHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = settlementSchema.parse(request.body);
  const result = await commissionService.createSettlement(request.user!.id, body);
  return sendCreated(reply, result);
}
