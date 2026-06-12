import { Queue, Worker, type Job } from 'bullmq';
import { getRedis, getBullRedis } from '../config/redis.js';
import { query } from '../config/database.js';

const QUEUE_NAME = 'session-cleanup';

export const sessionCleanupQueue = new Queue(QUEUE_NAME, {
  connection: getBullRedis() as any,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: 10,
    removeOnFail: 5,
  },
});

const worker = new Worker(
  QUEUE_NAME,
  async (_job: Job) => {
    const deletedSessions = await query(
      `DELETE FROM sessions WHERE expires_at < NOW()`
    );

    const expiredOtp = await query(
      `UPDATE otp_requests SET used_at = NOW()
       WHERE used_at IS NULL AND expires_at < NOW()`
    );

    const redis = getRedis();
    const onlineDealers = await redis.smembers('online_dealers');

    for (const dealerId of onlineDealers) {
      const exists = await redis.exists(`dealer:${dealerId}:online`);
      if (!exists) {
        await redis.srem('online_dealers', dealerId);
      }
    }

    console.log(
      `Session cleanup: ${deletedSessions.rowCount} sessions deleted, ` +
      `${expiredOtp.rowCount} OTPs expired, online dealers cleaned`
    );
  },
  { connection: getBullRedis() as any }
);

worker.on('completed', (job) => {
  console.log(`Session cleanup job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Session cleanup job ${job?.id} failed:`, err);
});

export { worker as sessionCleanupWorker };
