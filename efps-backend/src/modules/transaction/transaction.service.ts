import { query } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';
import { ERROR_CODES } from '../../config/constants.js';
import { parsePaginationParams, buildPaginationMeta } from '../../shared/utils/pagination.js';
import { eventBus, EventTypes } from '../../shared/events/index.js';
import type { Transaction } from '../../shared/types/models.js';
import type { CreateTransactionInput, ListTransactionsInput } from './transaction.schema.js';

export class TransactionService {
  async create(dealerId: string, input: CreateTransactionInput) {
    const beneficiary = await query(
      `SELECT id, dealer_id FROM beneficiaries WHERE id = $1 AND is_active = TRUE`,
      [input.beneficiary_id]
    );

    if (beneficiary.rows.length === 0) {
      throw new AppError('Beneficiary not found or inactive', 404, ERROR_CODES.BENEFICIARY_NOT_FOUND);
    }

    if (beneficiary.rows[0]!.dealer_id !== dealerId) {
      throw new AppError('Beneficiary does not belong to this dealer', 403, ERROR_CODES.FORBIDDEN);
    }

    const existing = await query(
      `SELECT id FROM transactions
       WHERE beneficiary_id = $1 AND month = $2 AND commodity = $3 AND dealer_id = $4`,
      [input.beneficiary_id, input.month, input.commodity, dealerId]
    );

    if (existing.rows.length > 0) {
      throw new ValidationError(
        `Beneficiary already received ${input.commodity} for this month`,
        'beneficiary_id'
      );
    }

    const stockCheck = await query(
      `SELECT allocated_kg, lifted_kg FROM stock_allocations
       WHERE dealer_id = $1 AND month = $2 AND commodity = $3`,
      [dealerId, input.month, input.commodity]
    );

    if (stockCheck.rows.length > 0) {
      const allocation = stockCheck.rows[0] as { allocated_kg: string; lifted_kg: string };
      const remaining = Number(allocation.allocated_kg) - Number(allocation.lifted_kg);
      if (remaining < input.quantity_kg) {
        throw new AppError(
          `Insufficient stock. Available: ${remaining} kg of ${input.commodity}`,
          400,
          ERROR_CODES.STOCK_INSUFFICIENT
        );
      }
    }

    const txDate = input.transaction_date ?? new Date().toISOString().split('T')[0];
    const totalAmount = input.total_amount ?? (input.price_per_kg ? input.quantity_kg * input.price_per_kg : null);

    const result = await query(
      `INSERT INTO transactions (dealer_id, beneficiary_id, transaction_date, month, commodity, quantity_kg, price_per_kg, total_amount, mode, biometric_auth, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        dealerId,
        input.beneficiary_id,
        txDate,
        input.month,
        input.commodity,
        input.quantity_kg,
        input.price_per_kg ?? null,
        totalAmount,
        input.mode,
        input.biometric_auth,
        input.remarks ?? null,
      ]
    );

    await query(
      `INSERT INTO inventory_movements (dealer_id, commodity, movement_type, quantity_kg, reference_id, reference_type, notes)
       VALUES ($1, $2, 'sale', $3, $4, 'transaction', 'Ration distribution')`,
      [dealerId, input.commodity, input.quantity_kg, result.rows[0]!.id]
    );

    await eventBus.emit(EventTypes.TRANSACTION_COMPLETED, {
      dealerId,
      transactionId: result.rows[0]!.id,
      beneficiaryId: input.beneficiary_id,
      commodity: input.commodity,
      quantityKg: input.quantity_kg,
      month: input.month,
    });

    return result.rows[0] as Transaction;
  }

  async list(dealerId: string, params: ListTransactionsInput) {
    const { offset, limit, page } = parsePaginationParams({ page: params.page, limit: params.limit });

    const conditions: string[] = ['t.dealer_id = $1'];
    const values: unknown[] = [dealerId];
    let paramIndex = 2;

    if (params.month) {
      conditions.push(`t.month = $${paramIndex}`);
      values.push(params.month);
      paramIndex++;
    }

    if (params.commodity) {
      conditions.push(`t.commodity = $${paramIndex}`);
      values.push(params.commodity);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) FROM transactions t WHERE ${whereClause}`,
      values
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const dataResult = await query(
      `SELECT t.*, b.head_of_family, b.ration_card_no
       FROM transactions t
       LEFT JOIN beneficiaries b ON t.beneficiary_id = b.id
       WHERE ${whereClause}
       ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    return buildPaginationMeta(dataResult.rows, total, page, limit);
  }

  async getById(id: string, dealerId: string) {
    const result = await query(
      `SELECT t.*, b.head_of_family, b.ration_card_no
       FROM transactions t
       LEFT JOIN beneficiaries b ON t.beneficiary_id = b.id
       WHERE t.id = $1 AND t.dealer_id = $2`,
      [id, dealerId]
    );

    const transaction = result.rows[0];
    if (!transaction) {
      throw new AppError('Transaction not found', 404, ERROR_CODES.NOT_FOUND);
    }

    return transaction;
  }

  async getSummary(dealerId: string) {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const monthStr = firstOfMonth.toISOString().split('T')[0];

    const result = await query(
      `SELECT
         sa.commodity,
         sa.allocated_kg,
         sa.lifted_kg,
         (sa.allocated_kg - sa.lifted_kg) as remaining_kg,
         COALESCE(tx.total_sold, 0) as total_sold_kg,
         COALESCE(tx.total_amount, 0) as total_amount,
         COALESCE(tx.transaction_count, 0) as transaction_count
       FROM stock_allocations sa
       LEFT JOIN (
         SELECT commodity,
                SUM(quantity_kg) as total_sold,
                SUM(total_amount) as total_amount,
                COUNT(*) as transaction_count
         FROM transactions
         WHERE dealer_id = $1 AND month = $2
         GROUP BY commodity
       ) tx ON sa.commodity = tx.commodity
       WHERE sa.dealer_id = $1 AND sa.month = $2
       ORDER BY sa.commodity`,
      [dealerId, monthStr]
    );

    return result.rows;
  }

  async remove(id: string, dealerId: string) {
    const transaction = await this.getById(id, dealerId);

    await query(
      `UPDATE stock_allocations SET lifted_kg = lifted_kg - $1, updated_at = NOW()
       WHERE dealer_id = $2 AND month = $3 AND commodity = $4`,
      [transaction.quantity_kg, dealerId, transaction.month, transaction.commodity]
    );

    await query(
      `DELETE FROM inventory_movements WHERE reference_id = $1 AND reference_type = 'transaction'`,
      [id]
    );

    await query(`DELETE FROM transactions WHERE id = $1 AND dealer_id = $2`, [id, dealerId]);
    return { message: 'Transaction deleted successfully' };
  }

  async getPending(dealerId: string) {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const monthStr = firstOfMonth.toISOString().split('T')[0];

    const result = await query(
      `SELECT b.id, b.ration_card_no, b.head_of_family, b.mobile, b.member_count, b.category
       FROM beneficiaries b
       LEFT JOIN transactions t 
         ON t.beneficiary_id = b.id 
         AND t.month = $2 
         AND t.dealer_id = $1
       WHERE b.dealer_id = $1 
         AND b.is_active = TRUE 
         AND t.id IS NULL
       ORDER BY b.head_of_family`,
      [dealerId, monthStr]
    );

    return result.rows;
  }
}

export const transactionService = new TransactionService();
