import { query } from '../../config/database.js';
import { eventBus, EventTypes } from '../../shared/events/index.js';
import { enqueueEfpsSync } from '../../jobs/sync/efps-sync.worker.js';
import { enqueueGovtSync } from '../../jobs/sync/govt-data-sync.job.js';
import { encrypt } from '../../shared/utils/encrypt.js';
import type { TriggerSyncInput, UpdateBankInfoInput, SaveCredentialsInput } from './sync.schema.js';

export class SyncService {
  async triggerSync(input: TriggerSyncInput) {
    if (input.dealer_id) {
      return this.triggerDealerSync(input.dealer_id, input.sync_type);
    }

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

      await eventBus.emit(EventTypes.SYNC_COMPLETED, {
        syncType: input.sync_type,
        entityCount,
      } as Record<string, unknown>);

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

  async triggerDealerSync(dealerId: string, syncType?: string) {
    const dealer = await query(
      `SELECT id, fps_id, sync_enabled FROM dealers WHERE id = $1 AND is_active = TRUE`,
      [dealerId]
    );

    if (!dealer.rows.length) {
      throw new Error('Dealer not found or inactive');
    }

    const d = dealer.rows[0] as { id: string; fps_id: string; sync_enabled: boolean };
    const syncMode = syncType === 'priority' ? 'priority' : 'full';

    const syncJob = await query(
      `INSERT INTO sync_jobs (dealer_id, status, sync_mode, triggered_by)
       VALUES ($1, 'pending', $2, 'manual')
       RETURNING id`,
      [dealerId, syncMode]
    );
    const syncJobId = syncJob.rows[0]!.id as string;

    const hasCredentials = await query(
      `SELECT id FROM dealer_credentials WHERE dealer_id = $1`,
      [dealerId]
    );

    if (hasCredentials.rows.length > 0) {
      await enqueueEfpsSync({
        dealerId: d.id,
        fpsId: d.fps_id,
        triggeredBy: 'manual',
        syncMode,
        syncJobId,
      });
    } else {
      await enqueueGovtSync({
        dealerId: d.id,
        fpsId: d.fps_id,
        district: '',
        taluka: '',
      });
    }

    return { message: 'Sync triggered', dealer_id: dealerId, has_playwright_creds: hasCredentials.rows.length > 0, sync_mode: syncMode };
  }

  async getSyncStatus(dealerId: string) {
    const result = await query(
      `SELECT id, status, triggered_by, started_at, completed_at, error_message, records_synced, created_at
       FROM sync_jobs WHERE dealer_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [dealerId]
    );

    const latestJob = result.rows[0] as {
      status: string; started_at: string; completed_at: string | null;
    } | undefined;

    return {
      jobs: result.rows,
      is_syncing: latestJob?.status === 'running' || latestJob?.status === 'pending',
      last_sync_at: latestJob?.completed_at ?? null,
    };
  }

  async getSyncHistory() {
    const result = await query(
      `SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 50`
    );
    return result.rows;
  }

  async getSelfDashboard(dealerId: string) {
    const lastSync = await query(
      `SELECT id, dealer_id, status, processed_count, quarantined_count, error_message, error_detail, priority, sync_mode, worker_version, website_version, trace_id, created_at, started_at, completed_at
       FROM sync_jobs WHERE dealer_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [dealerId]
    );

    const syncHistory = await query(
      `SELECT id, dealer_id, status, processed_count, quarantined_count, error_message, error_detail, priority, sync_mode, worker_version, website_version, trace_id, created_at, started_at, completed_at
       FROM sync_jobs WHERE dealer_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [dealerId]
    );

    const counts = await query(
      `SELECT
         (SELECT COUNT(*) FROM beneficiaries WHERE dealer_id = $1) as total_beneficiaries,
         (SELECT COUNT(*) FROM transactions WHERE dealer_id = $1) as total_transactions,
         (SELECT COUNT(*) FROM stock_allocations WHERE dealer_id = $1) as total_stock,
         (SELECT COUNT(*) FROM sync_quarantine WHERE dealer_id = $1 AND reviewed_at IS NULL) as recent_quarantined`,
      [dealerId]
    );

    const queueLength = await query(
      `SELECT COUNT(*) as count FROM sync_jobs WHERE dealer_id = $1 AND status IN ('pending', 'running')`,
      [dealerId]
    );

    const c = counts.rows[0] ?? { total_beneficiaries: 0, total_transactions: 0, total_stock: 0, recent_quarantined: 0 };

    return {
      lastSync: lastSync.rows[0] ?? null,
      syncHistory: syncHistory.rows,
      totalBeneficiaries: parseInt(c.total_beneficiaries, 10),
      totalTransactions: parseInt(c.total_transactions, 10),
      totalStockAllocations: parseInt(c.total_stock, 10),
      recentQuarantined: parseInt(c.recent_quarantined, 10),
      queueLength: parseInt(queueLength.rows[0]?.count ?? '0', 10),
    };
  }

  async getBankInfo(dealerId: string) {
    const result = await query(
      `SELECT * FROM dealer_bank_info WHERE dealer_id = $1`,
      [dealerId]
    );
    return result.rows[0] ?? null;
  }

  async getImportBatches() {
    const result = await query(
      `SELECT * FROM sync_import_batches ORDER BY created_at DESC LIMIT 20`
    );
    return result.rows;
  }

  async getChangeLog(batchId: string) {
    const result = await query(
      `SELECT gcl.*, b.ration_card_no, b.head_of_family
       FROM govt_change_log gcl
       LEFT JOIN beneficiaries b ON b.id = gcl.beneficiary_id
       WHERE gcl.sync_batch_id = $1
       ORDER BY gcl.created_at DESC
       LIMIT 100`,
      [batchId]
    );
    return result.rows;
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

  async saveCredentials(dealerId: string, input: SaveCredentialsInput) {
    const usernameEnc = encrypt(input.efps_username);
    const passwordEnc = encrypt(input.efps_password);

    await query(
      `INSERT INTO dealer_credentials (dealer_id, efps_username, efps_password, iv, auth_tag, iv_efps_password, auth_tag_efps_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (dealer_id)
       DO UPDATE SET
         efps_username = EXCLUDED.efps_username,
         efps_password = EXCLUDED.efps_password,
         iv = EXCLUDED.iv,
         auth_tag = EXCLUDED.auth_tag,
         iv_efps_password = EXCLUDED.iv_efps_password,
         auth_tag_efps_password = EXCLUDED.auth_tag_efps_password,
         updated_at = NOW()`,
      [dealerId, usernameEnc.ciphertext, passwordEnc.ciphertext, usernameEnc.iv, usernameEnc.authTag, passwordEnc.iv, passwordEnc.authTag]
    );

    await query(
      `INSERT INTO sync_scheduler_config (dealer_id, sync_status, sync_enabled)
       VALUES ($1, 'idle', TRUE)
       ON CONFLICT (dealer_id)
       DO UPDATE SET sync_status = 'idle', sync_enabled = TRUE, updated_at = NOW()`,
      [dealerId]
    );

    return { message: 'Credentials saved successfully' };
  }

  async getCredentialsStatus(dealerId: string) {
    const result = await query(
      `SELECT id FROM dealer_credentials WHERE dealer_id = $1`,
      [dealerId]
    );
    return { hasCredentials: result.rows.length > 0 };
  }
}

export const syncService = new SyncService();
