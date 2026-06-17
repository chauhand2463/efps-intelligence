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

    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const monthStr = firstOfMonth.toISOString().split('T')[0];

    const sql = `
      SELECT
        (SELECT COUNT(*)::int FROM transactions WHERE transaction_date = CURRENT_DATE AND dealer_id = $1) AS today_transactions,
        (SELECT COALESCE(SUM(quantity_kg), 0) FROM transactions WHERE transaction_date = CURRENT_DATE AND dealer_id = $1) AS today_quantity,
        (SELECT COUNT(*)::int FROM transactions WHERE month = $2 AND dealer_id = $1) AS month_transactions,
        (SELECT COALESCE(SUM(quantity_kg), 0) FROM transactions WHERE month = $2 AND dealer_id = $1) AS month_quantity,
        (SELECT COUNT(*)::int FROM beneficiaries WHERE dealer_id = $1 AND is_active = TRUE) AS total_beneficiaries,
        (SELECT COALESCE(SUM(allocated_kg), 0) FROM stock_allocations WHERE dealer_id = $1) AS allocated_kg,
        (SELECT COALESCE(SUM(lifted_kg), 0) FROM stock_allocations WHERE dealer_id = $1) AS lifted_kg,
        (SELECT COUNT(*)::int FROM beneficiaries b WHERE b.dealer_id = $1 AND b.is_active = TRUE AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.beneficiary_id = b.id AND t.month = $2)) AS pending_deliveries,
        (SELECT COUNT(*)::int FROM stock_allocations WHERE dealer_id = $1 AND (allocated_kg - lifted_kg) < 50) AS low_stock_alerts,
        (SELECT COALESCE(json_agg(json_build_object('commodity', commodity, 'quantity', quantity_kg, 'amount', total_amount)), '[]'::json) FROM (SELECT commodity, SUM(quantity_kg) AS quantity_kg, SUM(total_amount) AS total_amount FROM transactions WHERE dealer_id = $1 AND month = $2 GROUP BY commodity) sub) AS monthly_sales
    `;

    const result = await query(sql, [dealerId, monthStr]);
    const row = result.rows[0]!;

    const data = {
      today_transactions: row.today_transactions,
      today_quantity: Number(row.today_quantity),
      month_transactions: row.month_transactions,
      month_quantity: Number(row.month_quantity),
      total_beneficiaries: row.total_beneficiaries,
      allocated_kg: Number(row.allocated_kg),
      lifted_kg: Number(row.lifted_kg),
      pending_deliveries: row.pending_deliveries,
      low_stock_alerts: row.low_stock_alerts,
      monthly_sales: row.monthly_sales as Array<{ commodity: string; quantity: number; amount: number }>,
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
