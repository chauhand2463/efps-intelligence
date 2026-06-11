import type { FastifyRequest, FastifyReply } from 'fastify';
import { financeService } from './finance.service.js';
import { incomeSchema, expenseSchema, financeQuerySchema } from './finance.schema.js';
import { sendSuccess, sendCreated } from '../../shared/utils/response.js';

export async function addIncomeHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = incomeSchema.parse(request.body);
  const result = await financeService.addIncome(request.user!.id, body);
  return sendCreated(reply, result);
}

export async function addExpenseHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = expenseSchema.parse(request.body);
  const result = await financeService.addExpense(request.user!.id, body);
  return sendCreated(reply, result);
}

export async function listIncomeHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = financeQuerySchema.parse(request.query);
  const result = await financeService.listIncome(request.user!.id, query);
  return reply.send({ success: true, data: result.data, meta: result.meta });
}

export async function listExpensesHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = financeQuerySchema.parse(request.query);
  const result = await financeService.listExpenses(request.user!.id, query);
  return reply.send({ success: true, data: result.data, meta: result.meta });
}

export async function getProfitLossHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as { month?: string };
  const result = await financeService.getProfitLoss(request.user!.id, query.month);
  return sendSuccess(reply, result);
}
