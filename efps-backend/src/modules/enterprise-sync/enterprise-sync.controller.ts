import type { FastifyRequest, FastifyReply } from 'fastify';
import { enterpriseSyncService } from './enterprise-sync.service.js';
import {
  importTransactionsSchema,
  stockLedgerQuerySchema,
  financialLedgerQuerySchema,
} from './enterprise-sync.schema.js';
import { sendSuccess, sendCreated } from '../../shared/utils/response.js';

export async function importTransactionsHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = importTransactionsSchema.parse(request.body);
  const result = await enterpriseSyncService.importTransactions(request.user!.id, body);
  return sendCreated(reply, result);
}

export async function importTransactionsFlexibleHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { rows: Record<string, string>[]; source?: string; sourceFileId?: string };
  const result = await enterpriseSyncService.importTransactionsWithFlexibleMapping(
    request.user!.id,
    body.rows,
    (body.source as any) || 'EXCEL_SYNC',
    body.sourceFileId,
  );
  return sendCreated(reply, result);
}

export async function getStockLedgerHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = stockLedgerQuerySchema.parse(request.query);
  const result = await enterpriseSyncService.getStockLedger(request.user!.id, params);
  return sendSuccess(reply, result);
}

export async function getStockLedgerMovementsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { ledgerId } = request.params as { ledgerId: string };
  const result = await enterpriseSyncService.getStockLedgerMovements(request.user!.id, ledgerId);
  return sendSuccess(reply, result);
}

export async function getFinancialLedgerHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = financialLedgerQuerySchema.parse(request.query);
  const result = await enterpriseSyncService.getFinancialLedger(request.user!.id, params);
  return sendSuccess(reply, result);
}

export async function getFinancialSummaryHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await enterpriseSyncService.getFinancialSummary(request.user!.id);
  return sendSuccess(reply, result);
}

export async function getRollingStockHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await enterpriseSyncService.getRollingStock(request.user!.id);
  return sendSuccess(reply, result);
}
