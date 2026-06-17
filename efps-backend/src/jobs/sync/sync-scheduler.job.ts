import { Queue, Worker, type Job } from 'bullmq';
import { getBullRedis } from '../../config/redis.js';
import { query } from '../../config/database.js';
import { enqueueEfpsSync } from './efps-sync.worker.js';

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
      `SELECT ssc.id, ssc.dealer_id, d.fps_id, d.district, d.taluka, ssc.source_url,
              ssc.sync_mode, ssc.jitter_minutes, ssc.consecutive_failures,
              dc.id IS NOT NULL as has_credentials
       FROM sync_scheduler_config ssc
       JOIN dealers d ON d.id = ssc.dealer_id
       LEFT JOIN dealer_credentials dc ON dc.dealer_id = ssc.dealer_id
       WHERE ssc.sync_enabled = TRUE
         AND (ssc.next_sync_at IS NULL OR ssc.next_sync_at <= NOW())
         AND d.is_active = TRUE
       ORDER BY ssc.next_sync_at ASC NULLS FIRST
       LIMIT 50`
    );

    let processed = 0;
    let skipped = 0;

    for (const row of pendingSyncs.rows) {
      if (!row.has_credentials && !row.source_url) {
        skipped++;
        continue;
      }

      const syncMode = row.sync_mode ?? 'full';

      await enqueueEfpsSync({
        dealerId: row.dealer_id,
        fpsId: row.fps_id,
        triggeredBy: 'scheduled',
        syncMode,
      });

      const consecutiveFailures = row.consecutive_failures ?? 0;
      const baseInterval = 24 * 60;
      const backoffMultiplier = Math.min(1 + consecutiveFailures * 0.5, 3);
      const jitterMinutes = Math.min(row.jitter_minutes ?? 30, 60);

      await query(
        `UPDATE sync_scheduler_config
         SET sync_status = 'queued',
             last_sync_at = NOW(),
             next_sync_at = NOW() + (($1 * $2) || ' minutes')::interval + (random() * $3 || ' minutes')::interval
         WHERE id = $4`,
        [baseInterval, backoffMultiplier, jitterMinutes, row.id]
      );

      processed++;
    }

    return { processed, skipped };
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
