import { query } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ERROR_CODES, COMMODITIES } from '../../config/constants.js';
import { eventBus, EventTypes } from '../../shared/events/index.js';
import { parsePaginationParams, buildPaginationMeta } from '../../shared/utils/pagination.js';
import type { SaveStockEntryInput, AllocateInput, ListStockHistoryInput } from './stock-entry.schema.js';

export class StockEntryService {
  async getToday(dealerId: string) {
    const today = new Date().toISOString().split('T')[0];

    const entries = await query(
      `SELECT se.id, se.commodity, se.allocation_date, se.government_quantity,
              se.received_quantity, se.damaged_quantity, se.available_quantity,
              se.short_quantity, se.remarks
       FROM stock_entries se
       WHERE se.dealer_id = $1 AND se.allocation_date = $2
       ORDER BY se.commodity`,
      [dealerId, today]
    );

    const commodities = COMMODITIES.map(c => {
      const existing = (entries.rows as any[]).find(e => e.commodity === c);
      return {
        commodityId: existing?.id ?? null,
        name: c,
        allocated: existing?.government_quantity ?? 0,
        received: existing?.received_quantity ?? 0,
        damaged: existing?.damaged_quantity ?? 0,
        available: existing?.available_quantity ?? 0,
        short: existing?.short_quantity ?? 0,
        remarks: existing?.remarks ?? '',
        saved: !!existing,
      };
    });

    const latestAllocations = await query(
      `SELECT commodity, allocated_kg FROM stock_allocations
       WHERE dealer_id = $1 AND month = date_trunc('month', CURRENT_DATE)::date
       ORDER BY commodity`,
      [dealerId]
    );

    for (const c of commodities) {
      if (c.allocated === 0) {
        const alloc = (latestAllocations.rows as any[]).find(a => a.commodity === c.name);
        if (alloc) {
          c.allocated = Number(alloc.allocated_kg);
        }
      }
    }

    return {
      date: today,
      commodities,
    };
  }

  async saveEntry(dealerId: string, input: SaveStockEntryInput) {
    const results: { commodity: string; status: string; available: number }[] = [];

    for (const entry of input.entries) {
      const todayStr = new Date().toISOString().split('T')[0] ?? '';
      if (entry.received > 0 && input.date > todayStr) {
        throw new AppError('Cannot enter future dates', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const existing = await query(
        `SELECT id FROM stock_entries WHERE dealer_id = $1 AND commodity = $2 AND allocation_date = $3`,
        [dealerId, entry.commodity, input.date]
      );

      if (existing.rows.length > 0) {
        throw new AppError(
          `Entry already exists for ${entry.commodity} on ${input.date}. Use edit instead.`,
          409,
          ERROR_CODES.DUPLICATE_ENTRY
        );
      }

      const govtAlloc = await query(
        `SELECT allocated_kg FROM stock_allocations
         WHERE dealer_id = $1 AND commodity = $2 AND month = date_trunc('month', $3::date)::date`,
        [dealerId, entry.commodity, input.date]
      );
      const governmentQuantity = govtAlloc.rows.length > 0
        ? Number((govtAlloc.rows[0] as any).allocated_kg)
        : entry.received;

      const available = entry.received - entry.damaged;
      const short = Math.max(0, governmentQuantity - entry.received);

      const saved = await query(
        `INSERT INTO stock_entries (dealer_id, commodity, allocation_date, government_quantity, received_quantity, damaged_quantity, remarks, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $1)
         RETURNING *`,
        [dealerId, entry.commodity, input.date, governmentQuantity, entry.received, entry.damaged, entry.remarks]
      );

      const month = input.date.slice(0, 7) + '-01';

      const existingAlloc = await query(
        `SELECT id FROM stock_allocations WHERE dealer_id = $1 AND commodity = $2 AND month = $3`,
        [dealerId, entry.commodity, month]
      );

      if (existingAlloc.rows.length > 0) {
        await query(
          `UPDATE stock_allocations SET lifted_kg = lifted_kg + $1, lifted_quantity = lifted_quantity + $1, updated_at = NOW() WHERE dealer_id = $2 AND commodity = $3 AND month = $4`,
          [entry.received, dealerId, entry.commodity, month]
        );
      } else {
        await query(
          `INSERT INTO stock_allocations (dealer_id, month, commodity, allocated_kg, lifted_kg, allocated_quantity, lifted_quantity)
           VALUES ($1, $2, $3, $4, $5, $4, $5)`,
          [dealerId, month, entry.commodity, governmentQuantity, entry.received]
        );
      }

      await query(
        `INSERT INTO inventory_movements (dealer_id, commodity, movement_type, quantity_kg, reference_id, reference_type, notes)
         VALUES ($1, $2, 'receipt', $3, $4, 'stock_entry', $5)`,
        [dealerId, entry.commodity, entry.received, (saved.rows[0] as any).id, entry.remarks || 'Stock entry receipt']
      );

      results.push({
        commodity: entry.commodity,
        status: 'saved',
        available,
      });
    }

    await eventBus.emit(EventTypes.ALLOCATION_UPDATED, {
      dealerId,
      action: 'stock_entry',
      timestamp: new Date().toISOString(),
    } as any);

    return { date: input.date, entries: results };
  }

  async getAllocations(dealerId: string, month?: string)  {
    const targetMonth = month ?? new Date().toISOString().slice(0, 7) + '-01';

    const result = await query(
      `SELECT a.id, a.beneficiary_id, a.commodity, a.allocated_quantity,
              a.lifted_quantity, a.remaining_quantity, a.status,
              b.ration_card_no, b.head_of_family, b.category
       FROM allocations a
       JOIN beneficiaries b ON b.id = a.beneficiary_id
       WHERE a.dealer_id = $1 AND a.allocation_month = $2
       ORDER BY b.head_of_family`,
      [dealerId, targetMonth]
    );

    return result.rows;
  }

  async allocate(dealerId: string, input: AllocateInput) {
    const beneficiary = await query(
      `SELECT id, dealer_id FROM beneficiaries WHERE id = $1`,
      [input.beneficiary_id]
    );
    if (!beneficiary.rows.length) throw new AppError('Beneficiary not found', 404, ERROR_CODES.NOT_FOUND);
    if ((beneficiary.rows[0] as any).dealer_id !== dealerId) throw new AppError('Beneficiary does not belong to this dealer', 403, ERROR_CODES.FORBIDDEN);

    const stockAvail = await query(
      `SELECT COALESCE(SUM(received_quantity - damaged_quantity), 0) as available
       FROM stock_entries WHERE dealer_id = $1 AND commodity = $2 AND allocation_date = CURRENT_DATE`,
      [dealerId, input.commodity]
    );
    const consumed = await query(
      `SELECT COALESCE(SUM(allocated_quantity), 0) as allocated
       FROM allocations WHERE dealer_id = $1 AND commodity = $2 AND allocation_month = $3 AND status != 'cancelled'`,
      [dealerId, input.commodity, input.allocation_month]
    );
    const available = Number((stockAvail.rows[0] as any)?.available ?? 0);
    const alreadyAllocated = Number((consumed.rows[0] as any)?.allocated ?? 0);
    const remaining = available - alreadyAllocated;

    if (input.allocated_quantity > remaining) {
      throw new AppError(
        `Insufficient stock. Only ${remaining} kg of ${input.commodity} available for allocation.`,
        400,
        ERROR_CODES.STOCK_INSUFFICIENT
      );
    }

    const existing = await query(
      `SELECT id FROM allocations WHERE dealer_id = $1 AND beneficiary_id = $2 AND commodity = $3 AND allocation_month = $4`,
      [dealerId, input.beneficiary_id, input.commodity, input.allocation_month]
    );

    let allocRow;
    if (existing.rows.length > 0) {
      const updated = await query(
        `UPDATE allocations SET allocated_quantity = allocated_quantity + $1, status = 'active', updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [input.allocated_quantity, (existing.rows[0] as any).id]
      );
      allocRow = updated.rows[0];
    } else {
      const year = parseInt(input.allocation_month.slice(0, 4), 10);
      const inserted = await query(
        `INSERT INTO allocations (dealer_id, beneficiary_id, commodity, allocated_quantity, allocation_month, allocation_year)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [dealerId, input.beneficiary_id, input.commodity, input.allocated_quantity, input.allocation_month, year]
      );
      allocRow = inserted.rows[0];
    }

    await eventBus.emit(EventTypes.ALLOCATION_CREATED, {
      dealerId,
      beneficiaryId: input.beneficiary_id,
      commodity: input.commodity,
      quantity: input.allocated_quantity,
    } as any);

    return allocRow;
  }

  async getHistory(dealerId: string, params: ListStockHistoryInput) {
    const { offset, limit, page } = parsePaginationParams({ page: params.page, limit: params.limit });

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const getTypeFilter = () => {
      switch (params.type) {
        case 'receipt': return `'receipt'`;
        case 'damage': return `'damage'`;
        case 'allocation': return `'allocation'`;
        case 'adjustment': return `'adjustment'`;
        case 'transfer': return `'transfer'`;
        default: return null;
      }
    };

    const typeFilter = getTypeFilter();
    let unionQuery: string;
    if (typeFilter) {
      unionQuery = `SELECT * FROM (`;
    } else {
      unionQuery = `SELECT * FROM (`;
    }

    unionQuery = `
      SELECT transaction_date AS date, commodity, quantity_kg AS quantity,
             'sale'::varchar AS type, id::varchar AS ref_no, 'completed'::varchar AS status, dealer_id
      FROM transactions WHERE dealer_id = $1`;

    if (params.commodity) {
      conditions.push(`commodity = $${paramIndex}`);
      values.push(params.commodity);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '';

    const countResult = await query(
      `SELECT COUNT(*) as count FROM (${unionQuery} ${whereClause}) sub`,
      [dealerId, ...values]
    );

    const total = Number((countResult.rows[0] as any)?.count ?? 0);

    const dataResult = await query(
      `SELECT * FROM (${unionQuery} ${whereClause}) sub
       ORDER BY date DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [dealerId, ...values, limit, offset]
    );

    return buildPaginationMeta(dataResult.rows as any[], total, page, limit);
  }
}

export const stockEntryService = new StockEntryService();
