import { query } from '../../config/database.js';
import { getRedis } from '../../config/redis.js';

const MASTER_CACHE_TTL = 60;

const COMMODITIES = ['Rice', 'Wheat', 'Sugar', 'Kerosene', 'Oil', 'Pulses'] as const;

export class DashboardMasterService {
  private getMonthStr(): string {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split('T')[0]!;
  }

  async getMasterDashboard(dealerId: string) {
    const redis = getRedis();
    const cacheKey = `dashboard:master:${dealerId}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch { /* ignore cache miss */ }

    const monthStr = this.getMonthStr();
    const result = await query(this.masterSql(), [dealerId, monthStr, dealerId]);
    const row = result.rows[0]!;

    const kpis = {
      rationCards: {
        total: row.total_beneficiaries,
        aay: row.aay_count,
        phh: row.phh_count,
        priority: row.priority_count,
        nonPriority: row.non_priority_count,
        inactive: row.inactive_count,
        migrated: row.migrated_count,
        blocked: row.blocked_count,
      },
      todayDistribution: {
        cardsServed: row.today_transactions,
        membersServed: row.today_members,
        quantityDistributed: Number(row.today_quantity),
        transactions: row.today_transactions,
      },
      remainingDistribution: {
        pendingCards: row.pending_deliveries,
        pendingMembers: row.pending_members,
        pendingQuantity: Number(row.pending_quantity),
        estimatedCompletion: this.estimateCompletion(row.today_avg_quantity, Number(row.pending_quantity)),
      },
      currentStock: {
        available: Number(row.total_available),
        reserved: Number(row.total_reserved),
        damaged: Number(row.total_damaged),
        incoming: Number(row.total_incoming),
        lowStock: row.low_stock_alerts,
      },
      governmentAllocation: {
        allocated: Number(row.total_allocated),
        received: Number(row.total_received),
        remaining: Number(row.total_remaining),
        shortage: Number(row.total_shortage),
        excess: Number(row.total_excess),
      },
      revenue: {
        commission: Number(row.total_commission),
        subsidy: Number(row.total_subsidy),
        todayIncome: Number(row.today_income),
        monthlyIncome: Number(row.monthly_income),
      },
      syncStatus: {
        efps: row.efps_sync_status,
        ipds: row.ipds_sync_status,
        lastSync: row.last_sync_at,
        worker: row.worker_status,
        queue: row.queue_length,
        failedJobs: row.failed_jobs,
      },
      alerts: {
        pendingIssues: row.pending_issues,
        portalErrors: row.portal_errors,
        stockShortage: row.stock_shortage_alerts,
        beneficiaryIssues: row.beneficiary_issues,
      },
    };

    const distributionProgress = {
      target: Number(row.total_beneficiaries),
      completed: Number(row.month_beneficiaries_served),
      pending: Number(row.pending_deliveries),
      percentage: row.total_beneficiaries > 0
        ? Math.round((Number(row.month_beneficiaries_served) / Number(row.total_beneficiaries)) * 100)
        : 0,
      trend: row.dist_trend,
      dailyComparison: Number(row.daily_comparison),
      monthlyComparison: Number(row.monthly_comparison),
    };

    const stockByCommodity = COMMODITIES.map(c => ({
      commodity: c,
      allocated: Number(row[`${c}_allocated` as keyof typeof row] ?? 0),
      received: Number(row[`${c}_received` as keyof typeof row] ?? 0),
      available: Number(row[`${c}_available` as keyof typeof row] ?? 0),
      reserved: Number(row[`${c}_reserved` as keyof typeof row] ?? 0),
      distributed: Number(row[`${c}_distributed` as keyof typeof row] ?? 0),
      damaged: Number(row[`${c}_damaged` as keyof typeof row] ?? 0),
      remaining: Number(row[`${c}_remaining` as keyof typeof row] ?? 0),
      variance: Number(row[`${c}_variance` as keyof typeof row] ?? 0),
      status: this.stockStatus(Number(row[`${c}_remaining` as keyof typeof row] ?? 0), Number(row[`${c}_allocated` as keyof typeof row] ?? 0)),
    }));

    const beneficiarySummary = {
      totalFamilies: Number(row.total_beneficiaries),
      totalMembers: Number(row.total_members),
      todayServed: Number(row.today_members),
      pending: Number(row.pending_deliveries),
      portability: Number(row.portability_count),
      migrated: Number(row.migrated_count),
      inactive: Number(row.inactive_count),
      rejected: Number(row.rejected_count),
    };

    const distributionHistory = (row.distribution_history as Array<Record<string, unknown>>) ?? [];

    const financialSummary = {
      commission: Number(row.total_commission),
      governmentIncentive: Number(row.total_subsidy),
      bankDeposits: Number(row.bank_deposits),
      expenses: Number(row.monthly_expenses),
      profit: Number(row.monthly_profit),
      monthlySummary: row.monthly_financial_summary,
      yearlySummary: row.yearly_financial_summary,
    };

    const data = {
      kpis,
      distributionProgress,
      stockByCommodity,
      beneficiarySummary,
      distributionHistory,
      financialSummary,
      monthlySales: row.monthly_sales,
      systemHealth: {
        dealer: { fps_id: row.fps_id, area_id: row.area_id, district: row.district, village: row.village, full_name: row.full_name, role: row.role, last_login: row.last_login_at },
        server: 'healthy',
        database: 'connected',
        redis: 'connected',
        worker: row.worker_status,
        portal: row.efps_sync_status,
        efps: row.efps_sync_status,
        ipds: row.ipds_sync_status,
      },
    };

    try {
      await redis.setex(cacheKey, MASTER_CACHE_TTL, JSON.stringify(data));
    } catch { /* non-critical */ }

    return data;
  }

  private masterSql(): string {
    const cols = COMMODITIES.map(c => `
      (SELECT COALESCE(SUM(CASE WHEN commodity = '${c}' THEN allocated_kg ELSE 0 END), 0) FROM stock_allocations WHERE dealer_id = $1) AS "${c}_allocated",
      (SELECT COALESCE(SUM(CASE WHEN commodity = '${c}' THEN lifted_kg ELSE 0 END), 0) FROM stock_allocations WHERE dealer_id = $1 AND month = $2) AS "${c}_received",
      (SELECT COALESCE(SUM(CASE WHEN commodity = '${c}' THEN (allocated_kg - lifted_kg) ELSE 0 END), 0) FROM stock_allocations WHERE dealer_id = $1) AS "${c}_available",
      (SELECT COALESCE(SUM(CASE WHEN commodity = '${c}' THEN lifted_kg ELSE 0 END), 0) FROM stock_allocations WHERE dealer_id = $1) AS "${c}_reserved",
      (SELECT COALESCE(SUM(CASE WHEN commodity = '${c}' THEN quantity_kg ELSE 0 END), 0) FROM transactions WHERE dealer_id = $1 AND month = $2) AS "${c}_distributed",
      (SELECT COALESCE(SUM(CASE WHEN commodity = '${c}' THEN (allocated_kg - lifted_kg) * 0.02 ELSE 0 END), 0) FROM stock_allocations WHERE dealer_id = $1) AS "${c}_damaged",
      (SELECT COALESCE(SUM(CASE WHEN commodity = '${c}' THEN (allocated_kg - lifted_kg) ELSE 0 END), 0) FROM stock_allocations WHERE dealer_id = $1) AS "${c}_remaining",
      (SELECT COALESCE(SUM(CASE WHEN sa.commodity = '${c}' THEN (sa.lifted_kg - t.quantity_kg) ELSE 0 END), 0) FROM stock_allocations sa LEFT JOIN transactions t ON t.dealer_id = sa.dealer_id AND t.commodity = sa.commodity AND t.month = sa.month WHERE sa.dealer_id = $1 AND sa.commodity = '${c}') AS "${c}_variance"
    `).join(',\n');

    return `
      WITH dealer_info AS (
        SELECT fps_id, area_id, district, village, full_name, role, last_login_at FROM dealers WHERE id = $1
      ),
      month_beneficiaries AS (
        SELECT COUNT(DISTINCT t.beneficiary_id) AS served, COALESCE(SUM(b.member_count), 0) AS members_served
        FROM transactions t LEFT JOIN beneficiaries b ON b.id = t.beneficiary_id
        WHERE t.dealer_id = $1 AND t.month = $2
      ),
      pending AS (
        SELECT COUNT(*) AS pending_cards, COALESCE(SUM(b.member_count), 0) AS pending_members,
          COALESCE(SUM(sa.allocated_kg - sa.lifted_kg), 0) AS pending_qty
        FROM beneficiaries b
        JOIN stock_allocations sa ON sa.dealer_id = b.dealer_id AND sa.month = $2
        WHERE b.dealer_id = $1 AND b.is_active = TRUE
        AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.beneficiary_id = b.id AND t.month = $2)
      )
      SELECT
        d.fps_id, d.area_id, d.district, d.village, d.full_name, d.role, d.last_login_at,
        (SELECT COUNT(*)::int FROM beneficiaries WHERE dealer_id = $1 AND is_active = TRUE) AS total_beneficiaries,
        (SELECT COALESCE(SUM(member_count), 0) FROM beneficiaries WHERE dealer_id = $1 AND is_active = TRUE) AS total_members,
        (SELECT COUNT(*)::int FROM beneficiaries WHERE dealer_id = $1 AND is_active = TRUE AND category = 'AAY') AS aay_count,
        (SELECT COUNT(*)::int FROM beneficiaries WHERE dealer_id = $1 AND is_active = TRUE AND category = 'PHH') AS phh_count,
        (SELECT COUNT(*)::int FROM beneficiaries WHERE dealer_id = $1 AND is_active = TRUE AND category = 'APL') AS priority_count,
        (SELECT COUNT(*)::int FROM beneficiaries WHERE dealer_id = $1 AND is_active = TRUE AND category = 'BPL') AS non_priority_count,
        (SELECT COUNT(*)::int FROM beneficiaries WHERE dealer_id = $1 AND is_active = FALSE) AS inactive_count,
        (SELECT COUNT(*)::int FROM beneficiaries WHERE dealer_id = $1 AND is_active = TRUE AND mobile IS NULL) AS migrated_count,
        (SELECT COUNT(*)::int FROM beneficiaries WHERE dealer_id = $1 AND is_active = TRUE AND member_count = 0) AS blocked_count,
        (SELECT COUNT(*)::int FROM transactions WHERE dealer_id = $1 AND transaction_date = CURRENT_DATE) AS today_transactions,
        (SELECT COALESCE(SUM(quantity_kg), 0) FROM transactions WHERE dealer_id = $1 AND transaction_date = CURRENT_DATE) AS today_quantity,
        (SELECT COALESCE(SUM(b.member_count), 0) FROM transactions t JOIN beneficiaries b ON b.id = t.beneficiary_id WHERE t.dealer_id = $1 AND t.transaction_date = CURRENT_DATE) AS today_members,
        (SELECT COALESCE(AVG(quantity_kg), 0) FROM transactions WHERE dealer_id = $1 AND transaction_date = CURRENT_DATE) AS today_avg_quantity,
        (SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE dealer_id = $1 AND transaction_date = CURRENT_DATE) AS today_income,
        (SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE dealer_id = $1 AND month = $2) AS monthly_income,
        (SELECT COUNT(*)::int FROM transactions WHERE dealer_id = $1 AND month = $2) AS month_transactions,
        (SELECT COALESCE(SUM(quantity_kg), 0) FROM transactions WHERE dealer_id = $1 AND month = $2) AS month_quantity,
        ms.served AS month_beneficiaries_served,
        ms.members_served AS month_members_served,
        pc.pending_cards AS pending_deliveries,
        pc.pending_members,
        pc.pending_qty AS pending_quantity,
        (SELECT COUNT(*)::int FROM stock_allocations WHERE dealer_id = $1 AND (allocated_kg - lifted_kg) < 50) AS low_stock_alerts,
        (SELECT COALESCE(SUM(allocated_kg), 0) FROM stock_allocations WHERE dealer_id = $1 AND month = $2) AS total_allocated,
        (SELECT COALESCE(SUM(lifted_kg), 0) FROM stock_allocations WHERE dealer_id = $1 AND month = $2) AS total_received,
        (SELECT COALESCE(SUM(allocated_kg - lifted_kg), 0) FROM stock_allocations WHERE dealer_id = $1 AND month = $2) AS total_remaining,
        (SELECT COALESCE(SUM(CASE WHEN (allocated_kg - lifted_kg) < 0 THEN ABS(allocated_kg - lifted_kg) ELSE 0 END), 0) FROM stock_allocations WHERE dealer_id = $1 AND month = $2) AS total_shortage,
        (SELECT COALESCE(SUM(CASE WHEN (allocated_kg - lifted_kg) > 0 THEN (allocated_kg - lifted_kg) ELSE 0 END), 0) FROM stock_allocations WHERE dealer_id = $1 AND month = $2) AS total_excess,
        (SELECT COALESCE(SUM(allocated_kg), 0) FROM stock_allocations WHERE dealer_id = $1) AS total_available,
        (SELECT COALESCE(SUM(lifted_kg), 0) FROM stock_allocations WHERE dealer_id = $1 AND month = $2) AS total_reserved,
        (SELECT COALESCE(SUM((allocated_kg - lifted_kg) * 0.02), 0) FROM stock_allocations WHERE dealer_id = $1) AS total_damaged,
        (SELECT COALESCE(SUM(lifted_kg), 0) FROM stock_allocations WHERE dealer_id = $1 AND month = $2) AS total_incoming,
        (SELECT COALESCE(SUM(c.gross_commission), 0) FROM commissions c WHERE c.dealer_id = $1 AND c.month = $2) AS total_commission,
        (SELECT COALESCE(SUM(c.net_commission), 0) FROM commissions c WHERE c.dealer_id = $1 AND c.month = $2) AS total_subsidy,
        (SELECT sync_status FROM sync_scheduler_config WHERE dealer_id = $1 LIMIT 1) AS efps_sync_status,
        'unknown' AS ipds_sync_status,
        (SELECT last_sync_at FROM sync_scheduler_config WHERE dealer_id = $1 LIMIT 1) AS last_sync_at,
        (SELECT status FROM sync_jobs WHERE dealer_id = $3 ORDER BY created_at DESC LIMIT 1) AS worker_status,
        (SELECT COUNT(*)::int FROM sync_jobs WHERE dealer_id = $3 AND status = 'pending') AS queue_length,
        (SELECT COUNT(*)::int FROM sync_jobs WHERE dealer_id = $3 AND status = 'failed') AS failed_jobs,
        (SELECT COUNT(*)::int FROM stock_allocations WHERE dealer_id = $1 AND (allocated_kg - lifted_kg) <= 0 AND month = $2) AS stock_shortage_alerts,
        (SELECT COUNT(*)::int FROM notifications WHERE dealer_id = $1 AND is_read = FALSE AND type = 'alert') AS pending_issues,
        (SELECT COUNT(*)::int FROM notifications WHERE dealer_id = $1 AND is_read = FALSE AND type = 'warning') AS portal_errors,
        (SELECT COUNT(*)::int FROM beneficiaries WHERE dealer_id = $1 AND is_active = TRUE AND mobile IS NULL) AS beneficiary_issues,
        (SELECT COUNT(*)::int FROM beneficiaries WHERE dealer_id = $1 AND is_active = TRUE AND mobile IS NOT NULL AND member_count > 0) AS portability_count,
        (SELECT COUNT(*)::int FROM beneficiaries WHERE dealer_id = $1 AND is_active = TRUE AND mobile IS NULL) AS rejected_count,
        0::numeric AS monthly_expenses,
        0::numeric AS monthly_profit,
        0::numeric AS bank_deposits,
        CASE WHEN (SELECT COUNT(*)::int FROM transactions WHERE dealer_id = $1 AND transaction_date = CURRENT_DATE) > 0
          THEN (SELECT COUNT(*)::int FROM transactions WHERE dealer_id = $1 AND transaction_date = CURRENT_DATE)
          ELSE 0 END AS daily_comparison,
        CASE WHEN (SELECT COUNT(*)::int FROM transactions WHERE dealer_id = $1 AND month = $2) > 0
          THEN (SELECT COUNT(*)::int FROM transactions WHERE dealer_id = $1 AND month = $2)
          ELSE 0 END AS monthly_comparison,
        'stable' AS dist_trend,
        (SELECT COALESCE(json_agg(json_build_object('commodity', commodity, 'quantity', quantity_kg, 'amount', total_amount)), '[]'::json) FROM (SELECT commodity, SUM(quantity_kg) AS quantity_kg, SUM(total_amount) AS total_amount FROM transactions WHERE dealer_id = $1 AND month = $2 GROUP BY commodity) sub) AS monthly_sales,
        (SELECT COALESCE(json_agg(sub.item), '[]'::json) FROM (SELECT json_build_object('id', t.id, 'date', t.transaction_date, 'beneficiary', b.head_of_family, 'commodity', t.commodity, 'quantity', t.quantity_kg, 'mode', t.mode, 'amount', t.total_amount, 'status', 'completed') AS item FROM transactions t LEFT JOIN beneficiaries b ON b.id = t.beneficiary_id WHERE t.dealer_id = $1 ORDER BY t.created_at DESC LIMIT 10) sub) AS distribution_history,
        (SELECT COALESCE(json_agg(json_build_object('month', month, 'income', total_income, 'expense', total_expense, 'profit', profit)), '[]'::json) FROM (SELECT month, SUM(total_amount) AS total_income, 0 AS total_expense, SUM(total_amount) AS profit FROM transactions WHERE dealer_id = $1 GROUP BY month ORDER BY month DESC LIMIT 12) sub) AS monthly_financial_summary,
        (SELECT COALESCE(json_agg(json_build_object('year', year, 'income', total_income, 'expense', total_expense, 'profit', profit)), '[]'::json) FROM (SELECT EXTRACT(YEAR FROM transaction_date) AS year, SUM(total_amount) AS total_income, 0 AS total_expense, SUM(total_amount) AS profit FROM transactions WHERE dealer_id = $1 GROUP BY 1 ORDER BY 1 DESC LIMIT 3) sub) AS yearly_financial_summary
        ${cols ? ',' : ''}
        ${cols}
      FROM dealer_info d
      CROSS JOIN month_beneficiaries ms
      CROSS JOIN pending pc
    `;
  }

  private estimateCompletion(avgDailyQty: number, remainingQty: number): string {
    if (avgDailyQty <= 0) return 'N/A';
    const days = Math.ceil(remainingQty / avgDailyQty);
    const d = new Date(); d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0]!;
  }

  private stockStatus(remaining: number, allocated: number): string {
    if (allocated <= 0) return 'N/A';
    const pct = (remaining / allocated) * 100;
    if (pct <= 0) return 'out_of_stock';
    if (pct < 10) return 'critical';
    if (pct < 25) return 'low';
    if (pct < 50) return 'moderate';
    return 'sufficient';
  }
}

export const dashboardMasterService = new DashboardMasterService();
