import { query } from '../../config/database.js';
import { parsePaginationParams, buildPaginationMeta } from '../../shared/utils/pagination.js';
import { htmlToPdf } from '../../shared/utils/pdf.js';
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
    try {
      const firstOfMonth = new Date();
      firstOfMonth.setDate(1);
      const monthStr = firstOfMonth.toISOString().split('T')[0];

      const report = await this.getMonthlyReport(dealerId, { month: monthStr });
      const csvData = await this.exportCsv(dealerId);

      const html = buildReportHtml(monthStr as string, report, csvData);
      return await htmlToPdf(html);
    } catch (err) {
      const csv = await this.exportCsv(dealerId);
      return Buffer.from(
        `<html><body><h1>eFPS Monthly Distribution Report</h1><pre>${csv}</pre></body></html>`,
        'utf-8'
      );
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildReportHtml(month: string, report: Record<string, unknown>, csvData: string): string {
  const summary = report.commodity_summary as Array<Record<string, unknown>> || [];
  const allocations = report.stock_allocations as Array<Record<string, unknown>> || [];
  const benSummary = report.beneficiary_summary as Record<string, unknown> || {};

  const summaryRows = summary.map((s: Record<string, unknown>) => `
    <tr>
      <td>${escapeHtml(String(s.commodity ?? ''))}</td>
      <td class="text-right">${String(s.transaction_count ?? '0')}</td>
      <td class="text-right">${Number(s.total_quantity_kg ?? 0).toFixed(2)}</td>
      <td class="text-right">${Number(s.total_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>`).join('');

  const allocRows = allocations.map((a: Record<string, unknown>) => {
    const allocated = Number(a.allocated_kg ?? 0);
    const lifted = Number(a.lifted_kg ?? 0);
    const pct = allocated > 0 ? (lifted / allocated * 100).toFixed(1) : '0.0';
    return `
    <tr>
      <td>${escapeHtml(String(a.commodity ?? ''))}</td>
      <td class="text-right">${allocated.toFixed(2)}</td>
      <td class="text-right">${lifted.toFixed(2)}</td>
      <td class="text-right">${pct}%</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Monthly Report - ${month}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1f2937; padding: 0 10px; }
  h1 { font-size: 18px; color: #1e3a5f; margin-bottom: 2px; }
  .subtitle { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
  h2 { font-size: 13px; color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 4px; margin: 20px 0 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background: #1e3a5f; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
  .text-right { text-align: right; }
  .stats { display: flex; gap: 12px; margin-bottom: 16px; }
  .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; flex: 1; }
  .stat-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-value { font-size: 18px; font-weight: 700; color: #1e3a5f; margin-top: 2px; }
  .csv-section { margin-top: 20px; }
  .csv-section pre { font-family: 'Courier New', monospace; font-size: 9px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; white-space: pre-wrap; max-height: 400px; overflow: hidden; }
  .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #9ca3af; text-align: center; }
</style>
</head>
<body>
  <h1>eFPS Monthly Distribution Report</h1>
  <div class="subtitle">Report for ${month} &mdash; Generated on ${new Date().toISOString().split('T')[0]}</div>

  ${benSummary.total_beneficiaries ? `
  <div class="stats">
    <div class="stat"><div class="stat-label">Total Beneficiaries</div><div class="stat-value">${String(benSummary.total_beneficiaries)}</div></div>
    <div class="stat"><div class="stat-label">Served</div><div class="stat-value">${String(benSummary.served_beneficiaries)}</div></div>
    <div class="stat"><div class="stat-label">Pending</div><div class="stat-value">${String(benSummary.pending_beneficiaries)}</div></div>
  </div>` : ''}

  <h2>Commodity Summary</h2>
  <table>
    <thead><tr><th>Commodity</th><th class="text-right">Transactions</th><th class="text-right">Qty (kg)</th><th class="text-right">Amount</th></tr></thead>
    <tbody>${summaryRows || '<tr><td colspan="4" style="color:#9ca3af;text-align:center;">No transactions this month</td></tr>'}</tbody>
  </table>

  <h2>Stock Allocation &amp; Lifting</h2>
  <table>
    <thead><tr><th>Commodity</th><th class="text-right">Allocated (kg)</th><th class="text-right">Lifted (kg)</th><th class="text-right">%</th></tr></thead>
    <tbody>${allocRows || '<tr><td colspan="4" style="color:#9ca3af;text-align:center;">No allocations this month</td></tr>'}</tbody>
  </table>

  <div class="csv-section">
    <h2>Transaction Details</h2>
    <pre>${escapeHtml(csvData)}</pre>
  </div>

  <div class="footer">eFPS Portal &mdash; This is a computer-generated report</div>
</body>
</html>`;
}

export const reportService = new ReportService();
