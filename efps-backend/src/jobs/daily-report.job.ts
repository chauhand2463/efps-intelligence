import { Queue, Worker, type Job } from 'bullmq';
import { getRedis } from '../config/redis.js';
import { query } from '../config/database.js';

const QUEUE_NAME = 'daily-report';

export const dailyReportQueue = new Queue(QUEUE_NAME, {
  connection: getRedis() as any,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: 30,
    removeOnFail: 10,
  },
});

interface DailyReportPayload {
  dealerId: string;
  date: string;
}

export async function enqueueDailyReport(data: DailyReportPayload) {
  return dailyReportQueue.add('generate-report', data, {
    repeat: { pattern: '0 22 * * *' },
  });
}

const worker = new Worker<DailyReportPayload>(
  QUEUE_NAME,
  async (job: Job<DailyReportPayload>) => {
    const { dealerId, date } = job.data;

    const summary = await query(
      `SELECT
         COUNT(*) as transaction_count,
         COALESCE(SUM(quantity_kg), 0) as total_quantity,
         COALESCE(SUM(total_amount), 0) as total_amount
       FROM transactions
       WHERE dealer_id = $1 AND transaction_date = $2`,
      [dealerId, date]
    );

    const pendingCount = await query(
      `SELECT COUNT(*) as count
       FROM beneficiaries b WHERE b.dealer_id = $1 AND b.is_active = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM transactions t
         WHERE t.beneficiary_id = b.id AND t.transaction_date = $2
       )`,
      [dealerId, date]
    );

    const title = `Daily Summary - ${date}`;
    const body = `Transactions: ${summary.rows[0]?.transaction_count ?? 0}, ` +
      `Total Quantity: ${Number(summary.rows[0]?.total_quantity ?? 0).toFixed(2)} kg, ` +
      `Total Amount: Rs. ${Number(summary.rows[0]?.total_amount ?? 0).toFixed(2)}, ` +
      `Pending Beneficiaries: ${pendingCount.rows[0]?.count ?? 0}`;

    await query(
      `INSERT INTO notifications (dealer_id, title, body, type)
       VALUES ($1, $2, $3, 'info')`,
      [dealerId, title, body]
    );

    console.log(`Daily report generated for dealer ${dealerId} on ${date}`);
  },
  { connection: getRedis() as any }
);

worker.on('completed', (job) => {
  console.log(`Daily report job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Daily report job ${job?.id} failed:`, err);
});

export { worker as dailyReportWorker };
