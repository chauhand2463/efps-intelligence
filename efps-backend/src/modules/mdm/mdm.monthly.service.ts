import { query } from '../../config/database.js';

export class MdmMonthlyService {
  async saveRecords(dealerId: string, month: string, year: number, records: unknown[]) {
    const result = await query(
      `INSERT INTO mdm_monthly_records (dealer_id, month, year, records)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (dealer_id, month, year)
       DO UPDATE SET records = $4::jsonb, updated_at = NOW()
       RETURNING *`,
      [dealerId, month, year, JSON.stringify(records)]
    );
    return result.rows[0];
  }

  async getRecords(dealerId: string, month: string, year: number) {
    const result = await query(
      `SELECT * FROM mdm_monthly_records WHERE dealer_id = $1 AND month = $2 AND year = $3`,
      [dealerId, month, year]
    );
    return result.rows[0] ?? null;
  }
}

export const mdmMonthlyService = new MdmMonthlyService();
