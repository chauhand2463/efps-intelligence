import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  createTransactionHandler,
  listTransactionsHandler,
  getTransactionHandler,
  getTransactionSummaryHandler,
  getPendingHandler,
  deleteTransactionHandler,
} from './transaction.controller.js';

export async function transactionRoutes(app: FastifyInstance) {
  app.post('/transactions', {
    preHandler: [authenticate],
  }, createTransactionHandler);

  app.get('/transactions', {
    preHandler: [authenticate],
  }, listTransactionsHandler);

  app.get('/transactions/summary', {
    preHandler: [authenticate],
  }, getTransactionSummaryHandler);

  app.get('/transactions/pending', {
    preHandler: [authenticate],
  }, getPendingHandler);

  app.get('/transactions/:id', {
    preHandler: [authenticate],
  }, getTransactionHandler);

  app.delete('/transactions/:id', {
    preHandler: [authenticate],
  }, deleteTransactionHandler);
}
