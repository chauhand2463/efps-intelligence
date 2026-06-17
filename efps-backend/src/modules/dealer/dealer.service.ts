import { query } from '../../config/database.js';
import { getRedis } from '../../config/redis.js';
import { hashPassword } from '../../shared/utils/hash.js';
import { encryptMany } from '../../shared/utils/encrypt.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ERROR_CODES } from '../../config/constants.js';
import { enqueueEfpsSync } from '../../jobs/sync/efps-sync.worker.js';
import type { RegisterDealerInput, UpdateDealerInput } from './dealer.schema.js';
import type { Dealer } from '../../shared/types/models.js';

export class DealerService {
  async register(input: RegisterDealerInput) {
    const existingFpsId = await query('SELECT id FROM dealers WHERE fps_id = $1', [input.fps_id]);
    if (existingFpsId.rows.length > 0) {
      throw new AppError('FPS ID is already registered', 409, ERROR_CODES.FPS_ID_TAKEN);
    }

    const existingMobile = await query('SELECT id FROM dealers WHERE mobile = $1', [input.mobile]);
    if (existingMobile.rows.length > 0) {
      throw new AppError('Mobile number is already registered', 409, ERROR_CODES.MOBILE_TAKEN);
    }

    const passwordHash = await hashPassword(input.password);

    const hasCredentials = input.efps_username && input.efps_password;

    const result = await query(
      `INSERT INTO dealers (fps_id, full_name, mobile, password_hash, address, district, taluka, village, area_id${hasCredentials ? ', sync_enabled' : ''})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9${hasCredentials ? ', TRUE' : ''})
       RETURNING id, fps_id, full_name, mobile, role, is_active, is_verified, sync_enabled, created_at`,
      [
        input.fps_id,
        input.full_name,
        input.mobile,
        passwordHash,
        input.address ?? null,
        input.district ?? null,
        input.taluka ?? null,
        input.village ?? null,
        input.area_id ?? null,
      ]
    );

    const dealer = result.rows[0] as Dealer & { sync_enabled: boolean };

    if (hasCredentials) {
      const encrypted = encryptMany({
        efps_username: input.efps_username!,
        efps_password: input.efps_password!,
      });

      await query(
        `INSERT INTO dealer_credentials (dealer_id, efps_username, efps_password, iv, auth_tag, iv_efps_password, auth_tag_efps_password)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          dealer.id,
          encrypted.efps_username!.ciphertext,
          encrypted.efps_password!.ciphertext,
          encrypted.efps_username!.iv,
          encrypted.efps_username!.authTag,
          encrypted.efps_password!.iv,
          encrypted.efps_password!.authTag,
        ]
      );

      await query(
        `INSERT INTO sync_scheduler_config (dealer_id, sync_enabled, next_sync_at, source_url)
         VALUES ($1, TRUE, NOW() + INTERVAL '1 hour', $2)`,
        [dealer.id, input.source_url ?? null]
      );

      enqueueEfpsSync({
        dealerId: dealer.id,
        fpsId: dealer.fps_id,
        triggeredBy: 'registration',
      }).catch((err) => {
        console.error(`[DealerService] Failed to enqueue initial sync for ${dealer.id}:`, err);
      });
    }

    return dealer;
  }

  async getById(id: string) {
    const result = await query(
      `SELECT id, fps_id, area_id, full_name, mobile, address, district, taluka, village,
              role, is_active, is_verified, last_login_at, created_at, updated_at
       FROM dealers WHERE id = $1`,
      [id]
    );

    const dealer = result.rows[0] as Dealer | undefined;
    if (!dealer) {
      throw new AppError('Dealer not found', 404, ERROR_CODES.DEALER_NOT_FOUND);
    }

    return dealer;
  }

  async update(id: string, input: UpdateDealerInput) {
    const existing = await this.getById(id);

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const updateableFields: (keyof UpdateDealerInput)[] = ['full_name', 'address', 'district', 'taluka', 'village', 'area_id'];

    for (const field of updateableFields) {
      if (input[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(input[field]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE dealers SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, fps_id, area_id, full_name, mobile, address, district, taluka, village,
                 role, is_active, is_verified, last_login_at, created_at, updated_at`,
      values
    );

    return result.rows[0] as Dealer;
  }

  async getStats(id: string) {
    const redis = getRedis();
    const onlineCount = await redis.scard('online_dealers');

    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const monthStr = firstOfMonth.toISOString().split('T')[0];

    const todayTxResult = await query(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
       FROM transactions WHERE dealer_id = $1 AND transaction_date = $2`,
      [id, today]
    );

    const monthTxResult = await query(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
       FROM transactions WHERE dealer_id = $1 AND month = $2`,
      [id, monthStr]
    );

    const beneficiaryCount = await query(
      `SELECT COUNT(*) as count FROM beneficiaries WHERE dealer_id = $1 AND is_active = TRUE`,
      [id]
    );

    const pendingBeneficiaries = await query(
      `SELECT COUNT(*) as count FROM beneficiaries b
       WHERE b.dealer_id = $1 AND b.is_active = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM transactions t
         WHERE t.beneficiary_id = b.id AND t.month = $2
       )`,
      [id, monthStr]
    );

    const pendingTransactions = await query(
      `SELECT b.id, b.ration_card_no, b.head_of_family, b.mobile
       FROM beneficiaries b
       WHERE b.dealer_id = $1 AND b.is_active = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM transactions t
         WHERE t.beneficiary_id = b.id AND t.month = $2
       )
       ORDER BY b.head_of_family
       LIMIT 10`,
      [id, monthStr]
    );

    const stockResult = await query(
      `SELECT commodity, allocated_kg, lifted_kg,
              (allocated_kg - lifted_kg) as remaining_kg
       FROM stock_allocations WHERE dealer_id = $1 AND month = $2`,
      [id, monthStr]
    );

    const isOnline = await redis.exists(`dealer:${id}:online`);

    return {
      online_count: Number(onlineCount),
      is_online: Boolean(isOnline),
      today: {
        transactions: Number(todayTxResult.rows[0]?.count ?? 0),
        total_amount: Number(todayTxResult.rows[0]?.total ?? 0),
      },
      monthly: {
        transactions: Number(monthTxResult.rows[0]?.count ?? 0),
        total_amount: Number(monthTxResult.rows[0]?.total ?? 0),
        pending_beneficiaries: Number(pendingBeneficiaries.rows[0]?.count ?? 0),
      },
      total_beneficiaries: Number(beneficiaryCount.rows[0]?.count ?? 0),
      pending_transactions: pendingTransactions.rows,
      current_stock: stockResult.rows,
    };
  }

  async getSessions(id: string) {
    const result = await query(
      `SELECT id, user_agent, ip_address, created_at, expires_at
       FROM sessions WHERE dealer_id = $1 AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [id]
    );

    return result.rows;
  }

  async revokeSession(dealerId: string, sessionId: string) {
    const result = await query(
      `DELETE FROM sessions WHERE id = $1 AND dealer_id = $2 RETURNING id`,
      [sessionId, dealerId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Session not found', 404, ERROR_CODES.SESSION_NOT_FOUND);
    }

    return { message: 'Session revoked successfully' };
  }

  async lookupByFpsId(fpsId: string) {
    const result = await query(
      `SELECT fps_id, full_name FROM dealers WHERE fps_id = $1 AND is_active = TRUE`,
      [fpsId]
    );

    return { exists: result.rows.length > 0, dealer: result.rows[0] ?? null };
  }

  async heartbeat(dealerId: string) {
    const redis = getRedis();
    const key = `dealer:${dealerId}:online`;
    await redis.set(key, '1', 'EX', 900);
    await redis.sadd('online_dealers', dealerId);
    const onlineCount = await redis.scard('online_dealers');

    await query(`UPDATE dealers SET last_login_at = NOW() WHERE id = $1`, [dealerId]);

    return {
      status: 'online',
      online_dealers: onlineCount,
      timestamp: new Date().toISOString(),
    };
  }
}

export const dealerService = new DealerService();
