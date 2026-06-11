import { query } from '../../config/database.js';
import { getRedis } from '../../config/redis.js';
import type { TriggerSyncInput, UpdateBankInfoInput } from './sync.schema.js';

export class SyncService {
  async triggerSync(input: TriggerSyncInput) {
    const log = await query(
      `INSERT INTO sync_logs (sync_type, direction, status, entity, started_at)
       VALUES ($1, 'export', 'in_progress', $2, NOW())
       RETURNING *`,
      [input.sync_type, input.sync_type]
    );

    try {
      let entityCount = 0;
      const syncId = log.rows[0]!.id;

      if (input.sync_type === 'sales') {
        const result = await query(
          `SELECT COUNT(*) as count FROM transactions WHERE month = date_trunc('month', NOW())::date`
        );
        entityCount = Number(result.rows[0]?.count ?? 0);
      } else if (input.sync_type === 'stock') {
        const result = await query(
          `SELECT COUNT(*) as count FROM stock_allocations WHERE month = date_trunc('month', NOW())::date`
        );
        entityCount = Number(result.rows[0]?.count ?? 0);
      } else if (input.sync_type === 'beneficiaries') {
        const result = await query(`SELECT COUNT(*) as count FROM beneficiaries`);
        entityCount = Number(result.rows[0]?.count ?? 0);
      } else if (input.sync_type === 'reports') {
        const result = await query(
          `SELECT COUNT(*) as count FROM transactions WHERE month = date_trunc('month', NOW())::date`
        );
        entityCount = Number(result.rows[0]?.count ?? 0);
      }

      await query(
        `UPDATE sync_logs SET status = 'completed', entity_count = $1, completed_at = NOW()
         WHERE id = $2`,
        [entityCount, syncId]
      );

      return { id: syncId, sync_type: input.sync_type, status: 'completed', entity_count: entityCount };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      await query(
        `UPDATE sync_logs SET status = 'failed', error_message = $1, completed_at = NOW()
         WHERE id = $2`,
        [msg, log.rows[0]!.id]
      );
      throw err;
    }
  }

  async getSyncHistory() {
    const result = await query(
      `SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 50`
    );
    return result.rows;
  }

  async getBankInfo(dealerId: string) {
    const result = await query(
      `SELECT * FROM dealer_bank_info WHERE dealer_id = $1`,
      [dealerId]
    );
    return result.rows[0] ?? null;
  }

  async updateBankInfo(dealerId: string, input: UpdateBankInfoInput) {
    const existing = await this.getBankInfo(dealerId);
    if (existing) {
      const result = await query(
        `UPDATE dealer_bank_info SET bank_name = COALESCE($1, bank_name), branch_name = COALESCE($2, branch_name),
         account_no = COALESCE($3, account_no), ifsc_code = COALESCE($4, ifsc_code),
         account_holder = COALESCE($5, account_holder), updated_at = NOW()
         WHERE dealer_id = $6 RETURNING *`,
        [input.bank_name, input.branch_name, input.account_no, input.ifsc_code, input.account_holder, dealerId]
      );
      return result.rows[0];
    }

    const result = await query(
      `INSERT INTO dealer_bank_info (dealer_id, bank_name, branch_name, account_no, ifsc_code, account_holder)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [dealerId, input.bank_name, input.branch_name, input.account_no, input.ifsc_code, input.account_holder]
    );
    return result.rows[0];
  }
}

export const syncService = new SyncService();
