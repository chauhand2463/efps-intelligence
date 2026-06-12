import { query } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ERROR_CODES } from '../../config/constants.js';
import { parsePaginationParams, buildPaginationMeta } from '../../shared/utils/pagination.js';
import { eventBus, EventTypes } from '../../shared/events/index.js';
import type { CreateLiftingInput, ListLiftingInput } from './lifting.schema.js';

export class LiftingService {
  async create(dealerId: string, input: CreateLiftingInput) {
    const existing = await query(
      `SELECT id FROM stock_allocations WHERE dealer_id = $1 AND month = $2 AND commodity = $3`,
      [dealerId, input.month, input.commodity]
    );

    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO stock_allocations (dealer_id, month, commodity, allocated_kg)
         VALUES ($1, $2, $3, $4)`,
        [dealerId, input.month, input.commodity, input.quantity_kg]
      );
    } else {
      await query(
        `UPDATE stock_allocations SET allocated_kg = allocated_kg + $1, lifted_kg = lifted_kg + $2, updated_at = NOW()
         WHERE dealer_id = $3 AND month = $4 AND commodity = $5`,
        [input.quantity_kg, input.quantity_kg, dealerId, input.month, input.commodity]
      );
    }

    await query(
      `INSERT INTO inventory_movements (dealer_id, commodity, movement_type, quantity_kg, notes)
       VALUES ($1, $2, 'receipt', $3, $4)`,
      [dealerId, input.commodity, input.quantity_kg, input.notes ?? `Lifting from ${input.warehouse ?? 'warehouse'}`]
    );

    const result = await query(
      `SELECT * FROM stock_allocations WHERE dealer_id = $1 AND month = $2 AND commodity = $3`,
      [dealerId, input.month, input.commodity]
    );

    await eventBus.emit(EventTypes.LIFTING_CREATED, {
      dealerId,
      commodity: input.commodity,
      quantityKg: input.quantity_kg,
      month: input.month,
    });

    return result.rows[0];
  }

  async list(dealerId: string, params: ListLiftingInput) {
    const { offset, limit, page } = parsePaginationParams(params);

    const conditions: string[] = ['dealer_id = $1'];
    const values: unknown[] = [dealerId];
    let idx = 2;

    if (params.month) { conditions.push(`month = $${idx}`); values.push(params.month); idx++; }
    if (params.commodity) { conditions.push(`commodity = $${idx}`); values.push(params.commodity); idx++; }

    const where = conditions.join(' AND ');

    const count = await query(`SELECT COUNT(*) FROM inventory_movements WHERE movement_type = 'receipt' AND ${where}`, values);
    const total = Number(count.rows[0]?.count ?? 0);

    const data = await query(
      `SELECT * FROM inventory_movements WHERE movement_type = 'receipt' AND ${where}
       ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );

    return buildPaginationMeta(data.rows, total, page, limit);
  }

  async getHistory(dealerId: string) {
    const result = await query(
      `SELECT sa.month, sa.commodity, sa.allocated_kg, sa.lifted_kg,
              (sa.allocated_kg - sa.lifted_kg) as remaining_kg
       FROM stock_allocations sa
       WHERE sa.dealer_id = $1
       ORDER BY sa.month DESC, sa.commodity`,
      [dealerId]
    );
    return result.rows;
  }
}

export const liftingService = new LiftingService();
