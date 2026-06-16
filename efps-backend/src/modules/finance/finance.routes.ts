import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  addIncomeHandler, addExpenseHandler,
  listIncomeHandler, listExpensesHandler, getProfitLossHandler,
  deleteIncomeHandler, deleteExpenseHandler,
} from './finance.controller.js';

export async function financeRoutes(app: FastifyInstance) {
  app.post('/finance/income', { preHandler: [authenticate] }, addIncomeHandler);
  app.post('/finance/expense', { preHandler: [authenticate] }, addExpenseHandler);
  app.get('/finance/income', { preHandler: [authenticate] }, listIncomeHandler);
  app.get('/finance/expenses', { preHandler: [authenticate] }, listExpensesHandler);
  app.get('/finance/profit-loss', { preHandler: [authenticate] }, getProfitLossHandler);

  app.delete('/finance/income/:id', { preHandler: [authenticate] }, deleteIncomeHandler);
  app.delete('/finance/expense/:id', { preHandler: [authenticate] }, deleteExpenseHandler);
}
