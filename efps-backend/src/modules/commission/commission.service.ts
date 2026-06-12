import { query } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ERROR_CODES } from '../../config/constants.js';
import { parsePaginationParams, buildPaginationMeta } from '../../shared/utils/pagination.js';
import { eventBus, EventTypes } from '../../shared/events/index.js';
import type { SetCommissionRateInput, ListCommissionInput, SettlementInput } from './commission.schema.js';

export class CommissionService {
  async setRate(input: SetCommissionRateInput) {
    const result = await query(
      `INSERT INTO commission_rates (commodity, rate_per_kg, effective_from)
       VALUES ($1, $2, $3)
       ON CONFLICT (commodity, effective_from)
       DO UPDATE SET rate_per_kg = $2, updated_at = NOW()
       RETURNING *`,
      [input.commodity, input.rate_per_kg, input.effective_from ?? new Date().toISOString().split('T')[0]]
    );
    return result.rows[0];
  }

  async getRates() {
    const result = await query(
      `SELECT DISTINCT ON (commodity) commodity, rate_per_kg, effective_from
       FROM commission_rates
       ORDER BY commodity, effective_from DESC`
    );
    return result.rows;
  }

  async calculate(dealerId: string, month: string) {
    const txs = await query(
      `SELECT commodity, SUM(quantity_kg) as total_kg, SUM(total_amount) as total_amount
       FROM transactions WHERE dealer_id = $1 AND month = $2
       GROUP BY commodity`,
      [dealerId, month]
    );

    const results = [];
    for (const tx of txs.rows) {
      const rateResult = await query(
        `SELECT rate_per_kg FROM commission_rates
         WHERE commodity = $1 AND effective_from <= $2
         ORDER BY effective_from DESC LIMIT 1`,
        [tx.commodity, month]
      );

      const rate = Number(rateResult.rows[0]?.rate_per_kg ?? 0);
      const qty = Number(tx.total_kg);
      const gross = qty * rate;
      const tdsPercent = 10;
      const tds = gross * tdsPercent / 100;
      const net = gross - tds;

      await query(
        `INSERT INTO commissions (dealer_id, month, commodity, quantity_sold_kg, commission_rate, gross_commission, tds_percent, tds_deducted, net_commission)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (dealer_id, month, commodity)
         DO UPDATE SET quantity_sold_kg = $4, commission_rate = $5, gross_commission = $6,
                       tds_percent = $7, tds_deducted = $8, net_commission = $9, updated_at = NOW()
         RETURNING *`,
        [dealerId, month, tx.commodity, qty, rate, gross, tdsPercent, tds, net]
      );

      results.push({ commodity: tx.commodity, qty, rate, gross, tds, net });
    }

    return results;
  }

  async list(dealerId: string, params: ListCommissionInput) {
    const { offset, limit, page } = parsePaginationParams(params);
    const values: unknown[] = [dealerId];
    let idx = 2;
    let where = 'c.dealer_id = $1';

    if (params.month) { where += ` AND c.month = $${idx}`; values.push(params.month); idx++; }

    const count = await query(`SELECT COUNT(*) FROM commissions c WHERE ${where}`, values);
    const total = Number(count.rows[0]?.count ?? 0);

    const data = await query(
      `SELECT c.* FROM commissions c WHERE ${where}
       ORDER BY c.month DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );

    return buildPaginationMeta(data.rows, total, page, limit);
  }

  async getSettlementHistory(dealerId: string) {
    const result = await query(
      `SELECT bs.*, c.month, c.commodity
       FROM bank_settlements bs
       LEFT JOIN commissions c ON bs.commission_id = c.id
       WHERE bs.dealer_id = $1
       ORDER BY bs.created_at DESC`,
      [dealerId]
    );
    return result.rows;
  }

  async createSettlement(dealerId: string, input: SettlementInput) {
    const commissions = await query(
      `SELECT id, net_commission, gross_commission, tds_deducted
       FROM commissions WHERE dealer_id = $1 AND month = $2 AND status = 'pending'`,
      [dealerId, input.month]
    );

    if (commissions.rows.length === 0) {
      throw new AppError('No pending commissions found for this month', 404, ERROR_CODES.NOT_FOUND);
    }

    const bankInfo = await query(
      `SELECT account_no, ifsc_code FROM dealer_bank_info WHERE dealer_id = $1`,
      [dealerId]
    );

    const results = [];
    for (const com of commissions.rows) {
      const result = await query(
        `INSERT INTO bank_settlements (dealer_id, commission_id, settlement_date, gross_amount, tds_amount, net_amount, bank_account_no, ifsc_code, status)
         VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, 'initiated')
         RETURNING *`,
        [
          dealerId, com.id,
          Number(com.gross_commission), Number(com.tds_deducted), Number(com.net_commission),
          bankInfo.rows[0]?.account_no ?? null, bankInfo.rows[0]?.ifsc_code ?? null,
        ]
      );

      await query(`UPDATE commissions SET status = 'settled' WHERE id = $1`, [com.id]);
      results.push(result.rows[0]);
    }

    if (results.length > 0) {
      const totalNet = results.reduce((sum, r) => sum + Number(r.net_amount), 0);
      await eventBus.emit(EventTypes.COMMISSION_SETTLED, {
        dealerId,
        month: input.month,
        netAmount: totalNet,
        settlementId: results[0]!.id,
      });
    }

    return results;
  }
}

export const commissionService = new CommissionService();
