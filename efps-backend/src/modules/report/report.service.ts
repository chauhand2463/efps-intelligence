import { query } from '../../config/database.js';
import { parsePaginationParams, buildPaginationMeta } from '../../shared/utils/pagination.js';
import type { MonthlyReportInput, AuditLogInput } from './report.schema.js';

export class ReportService {
  async getMonthlyReport(dealerId: string, input: MonthlyReportInput) {
    const monthStr = input.month ?? (() => {
      const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
    })();

    const summary = await query(
      `SELECT
         commodity,
         COUNT(*) as transaction_count,
         COALESCE(SUM(quantity_kg), 0) as total_quantity_kg,
         COALESCE(SUM(total_amount), 0) as total_amount
       FROM transactions
       WHERE dealer_id = $1 AND month = $2
       GROUP BY commodity
       ORDER BY commodity`,
      [dealerId, monthStr]
    );

    const allocations = await query(
      `SELECT commodity, allocated_kg, lifted_kg
       FROM stock_allocations
       WHERE dealer_id = $1 AND month = $2
       ORDER BY commodity`,
      [dealerId, monthStr]
    );

    const beneficiarySummary = await query(
      `SELECT
         COUNT(DISTINCT b.id) as total_beneficiaries,
         COUNT(DISTINCT t.beneficiary_id) as served_beneficiaries,
         COUNT(DISTINCT b.id) - COUNT(DISTINCT t.beneficiary_id) as pending_beneficiaries
       FROM beneficiaries b
       LEFT JOIN transactions t ON t.beneficiary_id = b.id AND t.month = $2
       WHERE b.dealer_id = $1 AND b.is_active = TRUE`,
      [dealerId, monthStr]
    );

    return {
      month: monthStr,
      commodity_summary: summary.rows,
      stock_allocations: allocations.rows,
      beneficiary_summary: beneficiarySummary.rows[0],
    };
  }

  async getAuditLog(dealerId: string, input: AuditLogInput) {
    const { offset, limit, page } = parsePaginationParams({ page: input.page, limit: input.limit });

    const conditions: string[] = ['dealer_id = $1'];
    const values: unknown[] = [dealerId];
    let paramIndex = 2;

    if (input.action) {
      conditions.push(`action = $${paramIndex}`);
      values.push(input.action);
      paramIndex++;
    }

    if (input.start_date) {
      conditions.push(`created_at >= $${paramIndex}`);
      values.push(input.start_date);
      paramIndex++;
    }

    if (input.end_date) {
      conditions.push(`created_at <= $${paramIndex}::date + interval '1 day'`);
      values.push(input.end_date);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) FROM audit_logs WHERE ${whereClause}`,
      values
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const dataResult = await query(
      `SELECT * FROM audit_logs WHERE ${whereClause}
       ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    return buildPaginationMeta(dataResult.rows, total, page, limit);
  }

  async exportCsv(dealerId: string) {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const monthStr = firstOfMonth.toISOString().split('T')[0];

    const result = await query(
      `SELECT t.transaction_date, t.commodity, t.quantity_kg, t.total_amount,
              t.mode, b.ration_card_no, b.head_of_family
       FROM transactions t
       LEFT JOIN beneficiaries b ON t.beneficiary_id = b.id
       WHERE t.dealer_id = $1 AND t.month = $2
       ORDER BY t.transaction_date DESC`,
      [dealerId, monthStr]
    );

    const headers = ['Date', 'Commodity', 'Quantity (kg)', 'Amount', 'Mode', 'Ration Card', 'Beneficiary'];
    const rows = result.rows.map((r: Record<string, unknown>) => [
      r.transaction_date, r.commodity, r.quantity_kg, r.total_amount,
      r.mode, r.ration_card_no, r.head_of_family,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: unknown[]) => row.map((v) => `"${String(v ?? '')}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  async exportPdf(dealerId: string) {
    const csv = await this.exportCsv(dealerId);

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Monthly Report</title></head>
<body>
  <h1>eFPS Monthly Distribution Report</h1>
  <pre>${csv}</pre>
</body>
</html>`;

    return html;
  }
}

export const reportService = new ReportService();
