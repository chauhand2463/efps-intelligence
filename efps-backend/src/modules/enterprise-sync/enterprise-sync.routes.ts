import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  importTransactionsHandler,
  importTransactionsFlexibleHandler,
  getStockLedgerHandler,
  getStockLedgerMovementsHandler,
  getFinancialLedgerHandler,
  getFinancialSummaryHandler,
  getRollingStockHandler,
} from './enterprise-sync.controller.js';

export async function enterpriseSyncRoutes(app: FastifyInstance) {
  const authGuard = [authenticate];

  // --- Transaction Import (Phase 2) ---
  app.post('/sync/import/transactions', { preHandler: authGuard }, importTransactionsHandler);
  app.post('/sync/import/transactions/flexible', { preHandler: authGuard }, importTransactionsFlexibleHandler);

  // --- Stock Ledger (Phase 1 - Conflict 2&4) ---
  app.get('/ledger/stock', { preHandler: authGuard }, getStockLedgerHandler);
  app.get('/ledger/stock/:ledgerId/movements', { preHandler: authGuard }, getStockLedgerMovementsHandler);

  // --- Financial Ledger (Phase 1 - Conflict 4) ---
  app.get('/ledger/financial', { preHandler: authGuard }, getFinancialLedgerHandler);
  app.get('/ledger/financial/summary', { preHandler: authGuard }, getFinancialSummaryHandler);

  // --- Rolling Stock View ---
  app.get('/ledger/rolling-stock', { preHandler: authGuard }, getRollingStockHandler);
}
