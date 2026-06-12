import { Queue, Worker, type Job } from 'bullmq';
import { getBullRedis } from '../config/redis.js';
import { query } from '../config/database.js';

const QUEUE_NAME = 'audit-flush';

export const auditFlushQueue = new Queue(QUEUE_NAME, {
  connection: getBullRedis() as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 50,
    removeOnFail: 20,
  },
});

interface AuditFlushPayload {
  dealerId: string;
  action: string;
  entity: string;
  entityId: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ipAddress: string;
  userAgent: string;
}

export async function enqueueAuditLog(data: AuditFlushPayload) {
  return auditFlushQueue.add('flush-audit', data);
}

const worker = new Worker<AuditFlushPayload>(
  QUEUE_NAME,
  async (job: Job<AuditFlushPayload>) => {
    const { dealerId, action, entity, entityId, oldData, newData, ipAddress, userAgent } = job.data;

    await query(
      `INSERT INTO audit_logs (dealer_id, action, entity, entity_id, old_data, new_data, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        dealerId,
        action,
        entity,
        entityId,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        ipAddress,
        userAgent,
      ]
    );
  },
  { connection: getBullRedis() as any, concurrency: 5 }
);

worker.on('completed', (job) => {
  console.log(`Audit flush job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Audit flush job ${job?.id} failed:`, err);
});

export { worker as auditFlushWorker };
