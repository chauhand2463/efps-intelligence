import { query } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ERROR_CODES } from '../../config/constants.js';
import { parsePaginationParams, buildPaginationMeta } from '../../shared/utils/pagination.js';
import type { IncomeInput, ExpenseInput, FinanceQueryInput } from './finance.schema.js';

export class FinanceService {
  async addIncome(dealerId: string, input: IncomeInput) {
    const date = input.entry_date ?? new Date().toISOString().split('T')[0];
    const result = await query(
      `INSERT INTO income_entries (dealer_id, source, amount, entry_date, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [dealerId, input.source, input.amount, date, input.description ?? null]
    );
    return result.rows[0];
  }

  async addExpense(dealerId: string, input: ExpenseInput) {
    const date = input.entry_date ?? new Date().toISOString().split('T')[0];
    const result = await query(
      `INSERT INTO expense_entries (dealer_id, category, amount, entry_date, description, bill_reference)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [dealerId, input.category, input.amount, date, input.description ?? null, input.bill_reference ?? null]
    );
    return result.rows[0];
  }

  async listIncome(dealerId: string, params: FinanceQueryInput) {
    const { offset, limit, page } = parsePaginationParams(params);
    const values: unknown[] = [dealerId];
    let idx = 2;
    let where = 'dealer_id = $1';

    if (params.month) { where += ` AND DATE_TRUNC('month', entry_date) = DATE_TRUNC('month', $${idx}::date)`; values.push(params.month); idx++; }
    if (params.start_date) { where += ` AND entry_date >= $${idx}`; values.push(params.start_date); idx++; }
    if (params.end_date) { where += ` AND entry_date <= $${idx}`; values.push(params.end_date); idx++; }

    const count = await query(`SELECT COUNT(*) FROM income_entries WHERE ${where}`, values);
    const total = Number(count.rows[0]?.count ?? 0);

    const data = await query(
      `SELECT * FROM income_entries WHERE ${where} ORDER BY entry_date DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );
    return buildPaginationMeta(data.rows, total, page, limit);
  }

  async listExpenses(dealerId: string, params: FinanceQueryInput) {
    const { offset, limit, page } = parsePaginationParams(params);
    const values: unknown[] = [dealerId];
    let idx = 2;
    let where = 'dealer_id = $1';

    if (params.month) { where += ` AND DATE_TRUNC('month', entry_date) = DATE_TRUNC('month', $${idx}::date)`; values.push(params.month); idx++; }
    if (params.start_date) { where += ` AND entry_date >= $${idx}`; values.push(params.start_date); idx++; }
    if (params.end_date) { where += ` AND entry_date <= $${idx}`; values.push(params.end_date); idx++; }

    const count = await query(`SELECT COUNT(*) FROM expense_entries WHERE ${where}`, values);
    const total = Number(count.rows[0]?.count ?? 0);

    const data = await query(
      `SELECT * FROM expense_entries WHERE ${where} ORDER BY entry_date DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );
    return buildPaginationMeta(data.rows, total, page, limit);
  }

  async removeIncome(id: string, dealerId: string) {
    const result = await query(
      `DELETE FROM income_entries WHERE id = $1 AND dealer_id = $2 RETURNING id`,
      [id, dealerId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Income entry not found', 404, ERROR_CODES.NOT_FOUND);
    }

    return { message: 'Income entry deleted successfully' };
  }

  async removeExpense(id: string, dealerId: string) {
    const result = await query(
      `DELETE FROM expense_entries WHERE id = $1 AND dealer_id = $2 RETURNING id`,
      [id, dealerId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Expense entry not found', 404, ERROR_CODES.NOT_FOUND);
    }

    return { message: 'Expense entry deleted successfully' };
  }

  async getProfitLoss(dealerId: string, month?: string) {
    const m = month ?? (() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; })();

        const income = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM income_entries
       WHERE dealer_id = $1 AND DATE_TRUNC('month', entry_date) = DATE_TRUNC('month', $2::date)`,
      [dealerId, m]
    );

    const commissionMonth = m.slice(0, 7);
    const commission = await query(
      `SELECT COALESCE(SUM(net_commission), 0) as total FROM commissions
       WHERE dealer_id = $1 AND LEFT(month, 7) = $2 AND status = 'settled'`,
      [dealerId, commissionMonth]
    );

    const expenses = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expense_entries
       WHERE dealer_id = $1 AND DATE_TRUNC('month', entry_date) = DATE_TRUNC('month', $2::date)`,
      [dealerId, m]
    );

    const totalIncome = Number(income.rows[0]?.total ?? 0) + Number(commission.rows[0]?.total ?? 0);
    const totalExpense = Number(expenses.rows[0]?.total ?? 0);
    const netProfit = totalIncome - totalExpense;

    return { month: m, total_income: totalIncome, commission: Number(commission.rows[0]?.total ?? 0), total_expense: totalExpense, net_profit: netProfit };
  }
}

export const financeService = new FinanceService();
