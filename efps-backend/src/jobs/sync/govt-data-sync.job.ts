import { Queue, Worker, type Job } from 'bullmq';
import { getRedis } from '../../config/redis.js';
import { query } from '../../config/database.js';
import { govtImporterService } from '../../modules/sync/govt-importer.service.js';
import { eventBus, EventTypes } from '../../shared/events/index.js';

const QUEUE_NAME = 'govt-data-sync';

export const govtDataSyncQueue = new Queue(QUEUE_NAME, {
  connection: getRedis() as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

interface GovtSyncPayload {
  dealerId: string;
  fpsId: string;
  district: string;
  taluka: string;
  sourceUrl?: string;
}

interface FpsSyncConfig {
  id: string;
  dealer_id: string;
  fps_id: string;
  district: string;
  taluka: string;
  source_url: string | null;
}

export async function enqueueGovtSync(data: GovtSyncPayload) {
  return govtDataSyncQueue.add(`sync-${data.fpsId}`, data, {
    jobId: `govt-sync-${data.fpsId}`,
  });
}

export async function enqueueFullStateSync() {
  const dealers = await query(
    `SELECT id as dealer_id, fps_id, district, taluka FROM dealers WHERE is_active = TRUE AND role = 'dealer'`
  );

  for (const dealer of dealers.rows) {
    await enqueueGovtSync({
      dealerId: dealer.dealer_id,
      fpsId: dealer.fps_id,
      district: dealer.district ?? '',
      taluka: dealer.taluka ?? '',
    });
  }

  return { queued: dealers.rows.length };
}

export async function enqueueDistrictSync(district: string) {
  const dealers = await query(
    `SELECT id as dealer_id, fps_id, district, taluka FROM dealers
     WHERE is_active = TRUE AND district = $1`,
    [district]
  );

  for (const dealer of dealers.rows) {
    await enqueueGovtSync({
      dealerId: dealer.dealer_id,
      fpsId: dealer.fps_id,
      district: dealer.district ?? '',
      taluka: dealer.taluka ?? '',
    });
  }

  return { district, queued: dealers.rows.length };
}

const worker = new Worker<GovtSyncPayload>(
  QUEUE_NAME,
  async (job: Job<GovtSyncPayload>) => {
    const { dealerId, fpsId, sourceUrl } = job.data;

    const syncResult = await tryFetchFromGovtPortal(fpsId, sourceUrl);

    if (!syncResult || syncResult.rows.length === 0) {
      await query(
        `INSERT INTO sync_logs (sync_type, direction, status, entity, entity_count, error_message, started_at, completed_at)
         VALUES ('beneficiaries', 'import', 'failed', $1, 0, 'No data returned from govt portal', NOW(), NOW())`,
        [fpsId]
      );
      return { fpsId, status: 'failed', reason: 'No data' };
    }

    const rows = syncResult.rows;
    const result = await govtImporterService.importBeneficiaries(dealerId, rows, 'govt_api');

    const activeCards = rows.map((r: GovtBeneficiaryRow) => r.rationCardNo);
    const deactivatedCount = await govtImporterService.markDeactivatedBeneficiaries(
      dealerId, activeCards, result.batchId
    );
    result.deletedRecords = deactivatedCount;

    await query(
      `INSERT INTO sync_logs (sync_type, direction, status, entity, entity_count, payload, started_at, completed_at)
       VALUES ('beneficiaries', 'import', 'completed', $1, $2, $3, NOW(), NOW())`,
      [fpsId, result.totalRecords, JSON.stringify(result)]
    );

    await query(
      `UPDATE sync_scheduler_config SET last_sync_at = NOW(), next_sync_at = NOW() + (sync_interval_mins || ' minutes')::interval,
       sync_status = 'success', consecutive_failures = 0 WHERE dealer_id = $1`,
      [dealerId]
    );

    await eventBus.emit(EventTypes.SYNC_COMPLETED, {
      syncType: 'beneficiaries',
      entityCount: result.totalRecords,
      fpsId,
    } as Record<string, unknown>);

    const changeCount = result.newRecords + result.updatedRecords + result.deletedRecords;
    if (changeCount > 0) {
      await eventBus.emit(EventTypes.BENEFICIARY_UPDATED, {
        dealerId,
        batchId: result.batchId,
        newRecords: result.newRecords,
        updatedRecords: result.updatedRecords,
        deletedRecords: result.deletedRecords,
      } as Record<string, unknown>);
    }

    return {
      fpsId,
      status: 'completed',
      total: result.totalRecords,
      new: result.newRecords,
      updated: result.updatedRecords,
      deactivated: result.deletedRecords,
    };
  },
  {
    connection: getRedis() as any,
    concurrency: 10,
    limiter: { max: 5, duration: 1000 },
  }
);

worker.on('completed', (job) => {
  console.log(`[GovtSync] ${job.data.fpsId} sync completed`);
});

worker.on('failed', async (job, err) => {
  if (!job) return;
  console.error(`[GovtSync] ${job.data.fpsId} sync failed:`, err);

  await query(
    `INSERT INTO sync_logs (sync_type, direction, status, entity, entity_count, error_message, started_at, completed_at)
     VALUES ('beneficiaries', 'import', 'failed', $1, 0, $2, NOW(), NOW())`,
    [job.data.fpsId, err.message]
  );

  await query(
    `UPDATE sync_scheduler_config SET sync_status = 'failed', consecutive_failures = consecutive_failures + 1
     WHERE dealer_id = $1`,
    [job.data.dealerId]
  );
});

export { worker as govtDataSyncWorker };

interface GovtBeneficiaryRow {
  cardHolderName: string;
  hofAsPerNFSA: string;
  rationCardNo: string;
  cardCategory: string;
  familyMember: number;
  lpgStatus?: string;
  pngStatus?: string;
  address?: string;
  village?: string;
}

async function tryFetchFromGovtPortal(fpsId: string, sourceUrl?: string): Promise<{ rows: GovtBeneficiaryRow[] } | null> {
  if (sourceUrl) {
    try {
      const response = await fetch(sourceUrl, {
        headers: { 'User-Agent': 'eFPS-Intelligence/1.0' },
        signal: AbortSignal.timeout(30000),
      });

      if (response.ok) {
        const text = await response.text();
        return parseGovtResponse(text, fpsId);
      }
    } catch (err) {
      console.warn(`[GovtSync] HTTP fetch failed for ${fpsId}:`, err);
    }
  }

  return null;
}

function parseGovtResponse(text: string, fpsId: string): { rows: GovtBeneficiaryRow[] } {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { rows: [] };

  const headers = lines[0]!.split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, '_'));
  const rows: GovtBeneficiaryRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]!);
    if (cols.length < 4) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cols[idx] ?? ''; });

    rows.push({
      cardHolderName: row.card_holder_name || row.name || '',
      hofAsPerNFSA: row.hof_as_per_nfsa || row.head_of_family || row.hof || row.card_holder_name || '',
      rationCardNo: row.ration_card_no || row.rationcardno || row.card_no || '',
      cardCategory: row.card_category || row.category || 'NFSA-AAY',
      familyMember: parseInt(row.family_member || row.member_count || '1', 10) || 1,
      lpgStatus: row.lpg_status || '',
      pngStatus: row.png_status || '',
      address: row.addr1 || row.address || '',
      village: row.village || '',
    });
  }

  return { rows };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}
