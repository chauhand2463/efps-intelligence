import { query } from '../../config/database.js';
import { getRedis } from '../../config/redis.js';
import { parsePaginationParams, buildPaginationMeta } from '../../shared/utils/pagination.js';
import type { ListDealersInput, BulkNotifyInput } from './admin.schema.js';

export class AdminService {
  async listDealers(input: ListDealersInput) {
    const { offset, limit, page } = parsePaginationParams({ page: input.page, limit: input.limit });

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.district) {
      conditions.push(`district = $${paramIndex}`);
      values.push(input.district);
      paramIndex++;
    }

    if (input.taluka) {
      conditions.push(`taluka = $${paramIndex}`);
      values.push(input.taluka);
      paramIndex++;
    }

    if (input.is_active !== undefined) {
      conditions.push(`is_active = $${paramIndex}`);
      values.push(input.is_active);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM dealers ${whereClause}`,
      values
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const dataResult = await query(
      `SELECT id, fps_id, area_id, full_name, mobile, district, taluka, village,
              role, is_active, is_verified, last_login_at, created_at
       FROM dealers ${whereClause}
       ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    return buildPaginationMeta(dataResult.rows, total, page, limit);
  }

  async suspendDealer(id: string) {
    const result = await query(
      `UPDATE dealers SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 RETURNING id, fps_id, full_name, is_active`,
      [id]
    );

    const redis = getRedis();
    await redis.del(`dealer:${id}:online`);
    await redis.srem('online_dealers', id);

    return result.rows[0] ?? null;
  }

  async getPlatformStats() {
    const dealerCount = await query('SELECT COUNT(*) as count FROM dealers');
    const activeDealers = await query('SELECT COUNT(*) as count FROM dealers WHERE is_active = TRUE');
    const beneficiaryCount = await query('SELECT COUNT(*) as count FROM beneficiaries WHERE is_active = TRUE');
    const totalTransactions = await query('SELECT COUNT(*) as count FROM transactions');
    const monthlyTransactions = await query(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
       FROM transactions WHERE month = date_trunc('month', NOW())::date`
    );

    const redis = getRedis();
    const onlineCount = await redis.scard('online_dealers');

    const districtStats = await query(
      `SELECT district, COUNT(*) as count FROM dealers WHERE district IS NOT NULL GROUP BY district ORDER BY count DESC LIMIT 10`
    );

    const commodityStats = await query(
      `SELECT commodity, COALESCE(SUM(quantity_kg), 0) as total_kg
       FROM transactions WHERE month = date_trunc('month', NOW())::date
       GROUP BY commodity ORDER BY total_kg DESC`
    );

    return {
      dealers: {
        total: Number(dealerCount.rows[0]?.count ?? 0),
        active: Number(activeDealers.rows[0]?.count ?? 0),
        online: onlineCount,
      },
      beneficiaries: Number(beneficiaryCount.rows[0]?.count ?? 0),
      transactions: {
        total: Number(totalTransactions.rows[0]?.count ?? 0),
        this_month: Number(monthlyTransactions.rows[0]?.count ?? 0),
        this_month_amount: Number(monthlyTransactions.rows[0]?.total ?? 0),
      },
      districts: districtStats.rows,
      commodity_distribution: commodityStats.rows,
    };
  }

  async bulkNotify(input: BulkNotifyInput) {
    if (input.dealer_ids) {
      const values = input.dealer_ids.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ');
      const params: unknown[] = [];
      for (const dealerId of input.dealer_ids) {
        params.push(dealerId, input.title, input.body, input.type);
      }
      const result = await query(
        `INSERT INTO notifications (dealer_id, title, body, type) VALUES ${values}`,
        params
      );
      return { sent: result.rowCount };
    }

    if (input.district) {
      const result = await query(
        `INSERT INTO notifications (dealer_id, title, body, type)
         SELECT id, $2, $3, $4 FROM dealers WHERE district = $1 AND is_active = TRUE
         RETURNING id`,
        [input.district, input.title, input.body, input.type]
      );
      return { sent: result.rowCount };
    }

    const result = await query(
      `INSERT INTO notifications (dealer_id, title, body, type)
       SELECT id, $1, $2, $3 FROM dealers WHERE is_active = TRUE
       RETURNING id`,
      [input.title, input.body, input.type]
    );
    return { sent: result.rowCount };
  }
}

export const adminService = new AdminService();
