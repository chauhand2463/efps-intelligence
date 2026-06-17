import { query } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ERROR_CODES } from '../../config/constants.js';
import { parsePaginationParams, buildPaginationMeta } from '../../shared/utils/pagination.js';
import { eventBus, EventTypes } from '../../shared/events/index.js';
import type { StockAllocation } from '../../shared/types/models.js';
import type { ListStockHistoryInput, UpdateAllocationInput } from './stock.schema.js';

export class StockService {
  async getCurrent(dealerId: string) {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const monthStr = firstOfMonth.toISOString().split('T')[0];

    const result = await query(
      `SELECT id, month, commodity, allocated_kg, lifted_kg,
              (allocated_kg - lifted_kg) as remaining_kg,
              created_at, updated_at
       FROM stock_allocations
       WHERE dealer_id = $1 AND month = $2
       ORDER BY commodity`,
      [dealerId, monthStr]
    );

    return result.rows;
  }

  async getHistory(dealerId: string, params: ListStockHistoryInput) {
    const { offset, limit, page } = parsePaginationParams({ page: params.page, limit: params.limit });

    const conditions: string[] = ['dealer_id = $1'];
    const values: unknown[] = [dealerId];
    let paramIndex = 2;

    if (params.month) {
      conditions.push(`month = $${paramIndex}`);
      values.push(params.month);
      paramIndex++;
    }

    if (params.commodity) {
      conditions.push(`commodity = $${paramIndex}`);
      values.push(params.commodity);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) FROM stock_allocations WHERE ${whereClause}`,
      values
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const dataResult = await query(
      `SELECT id, month, commodity, allocated_kg, lifted_kg,
              (allocated_kg - lifted_kg) as remaining_kg,
              created_at, updated_at
       FROM stock_allocations
       WHERE ${whereClause}
       ORDER BY month DESC, commodity ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    return buildPaginationMeta(dataResult.rows, total, page, limit);
  }

  async updateAllocation(allocationId: string, input: UpdateAllocationInput) {
    const existing = await query(
      `SELECT * FROM stock_allocations WHERE id = $1`,
      [allocationId]
    );

    if (existing.rows.length === 0) {
      throw new AppError('Allocation not found', 404, ERROR_CODES.ALLOCATION_NOT_FOUND);
    }

    const result = await query(
      `UPDATE stock_allocations
       SET allocated_kg = $1, lifted_kg = COALESCE($3, lifted_kg), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [input.allocated_kg, allocationId, input.lifted_kg ?? null]
    );

    const updated = result.rows[0] as StockAllocation;
    await eventBus.emit(EventTypes.ALLOCATION_UPDATED, {
      dealerId: updated.dealer_id,
      commodity: updated.commodity,
      month: updated.month,
    });

    return updated;
  }

  async removeAllocation(allocationId: string) {
    const existing = await query(
      `SELECT * FROM stock_allocations WHERE id = $1`,
      [allocationId]
    );

    if (existing.rows.length === 0) {
      throw new AppError('Allocation not found', 404, ERROR_CODES.ALLOCATION_NOT_FOUND);
    }

    await query(`DELETE FROM inventory_movements WHERE reference_id = $1 AND reference_type = 'allocation'`, [allocationId]);
    await query(`DELETE FROM stock_allocations WHERE id = $1`, [allocationId]);
    return { message: 'Allocation deleted successfully' };
  }
}

export const stockService = new StockService();
