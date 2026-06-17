import { Queue, Worker, type Job } from 'bullmq';
import { getBullRedis } from '../config/redis.js';
import { query } from '../config/database.js';
import { EventTypes } from '../shared/events/event-bus.js';

const QUEUE_NAME = 'domain-events';

export const domainEventsQueue = new Queue(QUEUE_NAME, {
  connection: getBullRedis() as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export async function enqueueDomainEvent(event: string, payload: unknown) {
  return domainEventsQueue.add(event, payload);
}

type TransactionPayload = {
  dealerId: string;
  transactionId: string;
  beneficiaryId: string;
  commodity: string;
  quantityKg: number;
  month: string;
};

type LiftingPayload = {
  dealerId: string;
  commodity: string;
  quantityKg: number;
  month: string;
};

type SettlementPayload = {
  dealerId: string;
  month: string;
  netAmount: number;
  settlementId: string;
};

type BeneficiaryPayload = {
  dealerId: string;
  beneficiaryId: string;
};

type StockPayload = {
  dealerId: string;
  commodity: string;
  month: string;
};

const worker = new Worker(
  QUEUE_NAME,
  async (job: Job) => {
    const { name, data } = job;

    switch (name) {
      case EventTypes.TRANSACTION_COMPLETED: {
        const p = data as TransactionPayload;
        const { dealerId, month } = p;

        const txs = await query(
          `SELECT commodity, SUM(quantity_kg) as total_kg
           FROM transactions WHERE dealer_id = $1 AND month = $2
           GROUP BY commodity`,
          [dealerId, month]
        );

        for (const tx of txs.rows) {
          const rateResult = await query(
            `SELECT rate_per_kg FROM commission_rates
             WHERE commodity = $1 AND effective_from <= $2::date
             ORDER BY effective_from DESC LIMIT 1`,
            [tx.commodity, month]
          );

          const rate = Number(rateResult.rows[0]?.rate_per_kg ?? 0);
          const qty = Number(tx.total_kg);
          const gross = qty * rate;

          const tdsResult = await query(
            `SELECT tds_percent FROM tds_rates
             WHERE commodity = $1 AND effective_from <= $2::date
             ORDER BY effective_from DESC LIMIT 1`,
            [tx.commodity, month]
          );
          const tdsPercent = Number(tdsResult.rows[0]?.tds_percent ?? 10);
          const tds = gross * tdsPercent / 100;
          const net = gross - tds;

          await query(
            `INSERT INTO commissions (dealer_id, month, commodity, quantity_sold_kg, commission_rate, gross_commission, tds_percent, tds_deducted, net_commission)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (dealer_id, month, commodity)
             DO UPDATE SET quantity_sold_kg = $4, commission_rate = $5, gross_commission = $6,
                           tds_percent = $7, tds_deducted = $8, net_commission = $9, updated_at = NOW()
             WHERE commissions.status = 'pending'`,
            [dealerId, month, tx.commodity, qty, rate, gross, tdsPercent, tds, net]
          );
        }

        const lowStock = await query(
          `SELECT commodity, (allocated_kg - lifted_kg) as remaining
           FROM stock_allocations
           WHERE dealer_id = $1 AND month = $2 AND (allocated_kg - lifted_kg) < allocated_kg * 0.1`,
          [dealerId, month]
        );

        for (const item of lowStock.rows) {
          await query(
            `INSERT INTO notifications (dealer_id, title, body, type)
             VALUES ($1, $2, $3, 'warning')`,
            [
              dealerId,
              `Low Stock Alert - ${item.commodity}`,
              `Your ${item.commodity} stock is running low. Only ${Number(item.remaining).toFixed(2)} kg remaining.`,
            ]
          );
        }

        const redis = getBullRedis();
        await redis.del(`dashboard:${dealerId}`).catch(() => {});
        break;
      }

      case EventTypes.LIFTING_CREATED: {
        const p = data as LiftingPayload;
        const redis = getBullRedis();
        await redis.del(`dashboard:${p.dealerId}`).catch(() => {});
        break;
      }

      case EventTypes.COMMISSION_SETTLED: {
        const p = data as SettlementPayload;
        const { dealerId, netAmount, settlementId } = p;
        await query(
          `INSERT INTO income_entries (dealer_id, source, amount, entry_date, description, reference_type, reference_id)
           VALUES ($1, $2, $3, CURRENT_DATE, $4, 'commission_settlement', $5)`,
          [
            dealerId,
            'Commission Settlement',
            netAmount,
            `Commission settlement ref: ${settlementId}`,
            settlementId,
          ]
        );
        break;
      }

      case EventTypes.BENEFICIARY_CREATED: {
        const p = data as BeneficiaryPayload;
        const redis = getBullRedis();
        await redis.del(`dashboard:${p.dealerId}`).catch(() => {});
        break;
      }

      case EventTypes.ALLOCATION_CREATED: {
        const p = data as StockPayload;
        await query(
          `INSERT INTO notifications (dealer_id, title, body, type)
           VALUES ($1, $2, $3, 'info')`,
          [
            p.dealerId,
            'New Stock Allocation',
            `New stock allocation has been created for ${p.commodity}.`,
          ]
        );
        break;
      }

      case EventTypes.SYNC_COMPLETED: {
        const syncData = data as { syncType: string; entityCount: number };
        const adminDealers = await query(
          `SELECT id FROM dealers WHERE role = 'admin'`
        );

        for (const admin of adminDealers.rows) {
          await query(
            `INSERT INTO notifications (dealer_id, title, body, type)
             VALUES ($1, $2, $3, 'info')`,
            [
              admin.id,
              'Govt Sync Completed',
              `Sync of ${syncData.syncType} completed. ${String(syncData.entityCount)} records processed.`,
            ]
          );
        }
        break;
      }

      case EventTypes.STOCK_LOW: {
        const p = data as StockPayload;
        await query(
          `INSERT INTO notifications (dealer_id, title, body, type)
           VALUES ($1, $2, $3, 'alert')`,
          [
            p.dealerId,
            `Critical Stock - ${p.commodity}`,
            `Your ${p.commodity} stock has reached a critically low level. Please arrange lifting immediately.`,
          ]
        );
        break;
      }

      case EventTypes.BENEFICIARY_UPDATED: {
        const p = data as Record<string, unknown> & { dealerId: string };
        const { dealerId } = p;

        const redis2 = getBullRedis();
        await redis2.del(`dashboard:${dealerId}`).catch(() => {});

        const changeCount = Number(p.newRecords ?? 0) + Number(p.updatedRecords ?? 0) + Number(p.deletedRecords ?? 0);
        if (changeCount > 0) {
          await query(
            `INSERT INTO notifications (dealer_id, title, body, type)
             VALUES ($1, $2, $3, 'info')`,
            [
              dealerId,
              'Govt Data Updated',
              `Government beneficiary data synced: ${String(p.newRecords)} new, ${String(p.updatedRecords)} updated, ${String(p.deletedRecords)} deactivated.`,
            ]
          );
        }
        break;
      }

      case EventTypes.ALLOCATION_UPDATED: {
        const p = data as StockPayload;
        const redis = getBullRedis();
        await redis.del(`dashboard:${p.dealerId}`).catch(() => {});
        break;
      }
      case EventTypes.COMMISSION_CALCULATED:
      case EventTypes.DASHBOARD_REFRESH:
      case EventTypes.GOVT_SYNC_BATCH:
        break;

      default:
        console.warn(`[DomainEvents] Unknown event type: ${name}`);
    }
  },
  { connection: getBullRedis() as any, concurrency: 5 }
);

worker.on('completed', (job) => {
  console.log(`[DomainEvents] Job ${job.id} (${job.name}) completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[DomainEvents] Job ${job?.id} (${job?.name}) failed:`, err);
});

export { worker as domainEventsWorker };
