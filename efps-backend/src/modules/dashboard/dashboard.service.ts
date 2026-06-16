import { query } from '../../config/database.js';
import { getRedis } from '../../config/redis.js';

const DASHBOARD_CACHE_TTL = 60;

export class DashboardService {
  async getSummary(dealerId: string) {
    const redis = getRedis();
    const cacheKey = `dashboard:${dealerId}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // Cache unavailable — fall through to DB query
    }

    const sql = `
      SELECT
        (SELECT COALESCE(SUM(allocated_kg), 0) FROM stock_allocations WHERE dealer_id = $1) AS total_allocated,
        (SELECT COALESCE(SUM(lifted_kg), 0) FROM stock_allocations WHERE dealer_id = $1) AS total_sold,
        (SELECT COALESCE(SUM(quantity_kg), 0) FROM lifting_records WHERE dealer_id = $1 AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())) AS total_lifted_this_month,
        (SELECT COUNT(*)::int FROM transactions WHERE dealer_id = $1) AS total_transactions,
        (SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE dealer_id = $1) AS total_revenue,
        (SELECT COUNT(*)::int FROM beneficiaries WHERE dealer_id = $1) AS total_beneficiaries,
        (SELECT COALESCE(SUM(net_commission), 0) FROM commissions WHERE dealer_id = $1 AND status = 'settled') AS total_commission,
        (SELECT COALESCE(SUM(amount), 0) FROM income_entries WHERE dealer_id = $1) AS total_income,
        (SELECT COALESCE(SUM(amount), 0) FROM expense_entries WHERE dealer_id = $1) AS total_expenses,
        (SELECT COUNT(*)::int FROM dealer_ads WHERE dealer_id = $1) AS total_ads,
        (SELECT COUNT(*)::int FROM social_audit_meetings WHERE dealer_id = $1) AS total_audits
    `;

    const result = await query(sql, [dealerId]);
    const row = result.rows[0]!;

    const data = {
      stock: {
        total_allocated: Number(row.total_allocated),
        total_sold: Number(row.total_sold),
        pending_stock: Number(row.total_allocated) - Number(row.total_sold),
      },
      lifting_this_month: Number(row.total_lifted_this_month),
      transactions: {
        count: row.total_transactions,
        revenue: Number(row.total_revenue),
      },
      beneficiaries: row.total_beneficiaries,
      commission: Number(row.total_commission),
      finance: {
        income: Number(row.total_income),
        expenses: Number(row.total_expenses),
        net: Number(row.total_income) - Number(row.total_expenses),
      },
      ads_count: row.total_ads,
      audits_count: row.total_audits,
    };

    try {
      await redis.setex(cacheKey, DASHBOARD_CACHE_TTL, JSON.stringify(data));
    } catch {
      // Cache write failure is non-critical
    }
    return data;
  }
}

export const dashboardService = new DashboardService();
