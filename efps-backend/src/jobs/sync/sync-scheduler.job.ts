import { Queue, Worker, type Job } from 'bullmq';
import { getBullRedis } from '../../config/redis.js';
import { query } from '../../config/database.js';
import { enqueueGovtSync } from './govt-data-sync.job.js';

const QUEUE_NAME = 'sync-scheduler';

export const syncSchedulerQueue = new Queue(QUEUE_NAME, {
  connection: getBullRedis() as any,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: 50,
    removeOnFail: 20,
  },
});

const worker = new Worker(
  QUEUE_NAME,
  async (_job: Job) => {
    const pendingSyncs = await query(
      `SELECT ssc.id, ssc.dealer_id, d.fps_id, d.district, d.taluka, ssc.source_url
       FROM sync_scheduler_config ssc
       JOIN dealers d ON d.id = ssc.dealer_id
       WHERE ssc.sync_enabled = TRUE
         AND (ssc.next_sync_at IS NULL OR ssc.next_sync_at <= NOW())
         AND d.is_active = TRUE
       ORDER BY ssc.next_sync_at ASC NULLS FIRST
       LIMIT 50`
    );

    console.log(`[SyncScheduler] Found ${pendingSyncs.rows.length} dealers ready for sync`);

    for (const row of pendingSyncs.rows) {
      await enqueueGovtSync({
        dealerId: row.dealer_id,
        fpsId: row.fps_id,
        district: row.district ?? '',
        taluka: row.taluka ?? '',
        sourceUrl: row.source_url ?? undefined,
      });

      await query(
        `UPDATE sync_scheduler_config SET sync_status = 'queued' WHERE id = $1`,
        [row.id]
      );
    }

    return { processed: pendingSyncs.rows.length };
  },
  { connection: getBullRedis() as any }
);

worker.on('completed', (job) => {
  console.log(`[SyncScheduler] Run ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[SyncScheduler] Run ${job?.id} failed:`, err);
});

export { worker as syncSchedulerWorker };
