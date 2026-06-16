import type { FastifyRequest, FastifyReply } from 'fastify';
import { transactionService } from './transaction.service.js';
import { createTransactionSchema, listTransactionsSchema } from './transaction.schema.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/utils/response.js';

export async function createTransactionHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = createTransactionSchema.parse(request.body);
  const result = await transactionService.create(request.user!.id, body);
  return sendCreated(reply, result);
}

export async function listTransactionsHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = listTransactionsSchema.parse(request.query);
  const result = await transactionService.list(request.user!.id, query);
  return reply.send({ success: true, data: result.data, meta: result.meta });
}

export async function getTransactionHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await transactionService.getById(id, request.user!.id);
  return sendSuccess(reply, result);
}

export async function getTransactionSummaryHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await transactionService.getSummary(request.user!.id);
  return sendSuccess(reply, result);
}

export async function getPendingHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await transactionService.getPending(request.user!.id);
  return sendSuccess(reply, result);
}

export async function deleteTransactionHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await transactionService.remove(id, request.user!.id);
  return sendNoContent(reply);
}
