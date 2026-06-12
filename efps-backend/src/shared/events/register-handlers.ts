import { eventBus, EventTypes } from './event-bus.js';
import { query } from '../../config/database.js';
import { getRedis } from '../../config/redis.js';

type TransactionPayload = Record<string, unknown> & {
  dealerId: string;
  transactionId: string;
  beneficiaryId: string;
  commodity: string;
  quantityKg: number;
  month: string;
};

type LiftingPayload = Record<string, unknown> & {
  dealerId: string;
  commodity: string;
  quantityKg: number;
  month: string;
};

type CommissionPayload = Record<string, unknown> & {
  dealerId: string;
  month: string;
  commodity: string;
  netCommission: number;
  grossCommission: number;
};

type SettlementPayload = Record<string, unknown> & {
  dealerId: string;
  month: string;
  netAmount: number;
  settlementId: string;
};

type BeneficiaryPayload = Record<string, unknown> & {
  dealerId: string;
  beneficiaryId: string;
};

type StockPayload = Record<string, unknown> & {
  dealerId: string;
  commodity: string;
  month: string;
};

export function registerEventHandlers() {
  eventBus.on(EventTypes.TRANSACTION_COMPLETED, async (payload: unknown) => {
    const p = payload as TransactionPayload;
    const { dealerId, month } = p;

    try {
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
        const tdsPercent = 10;
        const tds = gross * tdsPercent / 100;
        const net = gross - tds;

        await query(
          `INSERT INTO commissions (dealer_id, month, commodity, quantity_sold_kg, commission_rate, gross_commission, tds_percent, tds_deducted, net_commission)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (dealer_id, month, commodity)
           DO UPDATE SET quantity_sold_kg = $4, commission_rate = $5, gross_commission = $6,
                         tds_percent = $7, tds_deducted = $8, net_commission = $9, updated_at = NOW()`,
          [dealerId, month, tx.commodity, qty, rate, gross, tdsPercent, tds, net]
        );
      }
    } catch (err) {
      console.error(`[EventBus] Auto-commission failed for dealer ${dealerId}:`, err);
    }

    try {
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
    } catch (err) {
      console.error(`[EventBus] Low-stock check failed for dealer ${dealerId}:`, err);
    }

    try {
      const redis = getRedis();
      await redis.del(`dashboard:${dealerId}`);
    } catch {
    }
  });

  eventBus.on(EventTypes.LIFTING_CREATED, async (payload) => {
    const p = payload as LiftingPayload;
    const { dealerId } = p;

    try {
      const redis = getRedis();
      await redis.del(`dashboard:${dealerId}`);
    } catch {
    }
  });

  eventBus.on(EventTypes.COMMISSION_SETTLED, async (payload) => {
    const p = payload as SettlementPayload;
    const { dealerId, netAmount, settlementId } = p;

    try {
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
    } catch (err) {
      console.error(`[EventBus] Auto-income entry failed for dealer ${dealerId}:`, err);
    }
  });

  eventBus.on(EventTypes.BENEFICIARY_CREATED, async (payload) => {
    const p = payload as BeneficiaryPayload;
    const { dealerId } = p;

    try {
      const redis = getRedis();
      await redis.del(`dashboard:${dealerId}`);
    } catch {
    }
  });

  eventBus.on(EventTypes.ALLOCATION_CREATED, async (payload) => {
    const p = payload as StockPayload;
    const { dealerId, commodity } = p;

    try {
      await query(
        `INSERT INTO notifications (dealer_id, title, body, type)
         VALUES ($1, $2, $3, 'info')`,
        [
          dealerId,
          'New Stock Allocation',
          `New stock allocation has been created for ${commodity}.`,
        ]
      );
    } catch (err) {
      console.error(`[EventBus] Allocation notification failed for dealer ${dealerId}:`, err);
    }
  });

  eventBus.on(EventTypes.SYNC_COMPLETED, async (payload) => {
    const data = payload as Record<string, unknown> & { syncType: string; entityCount: number };

    try {
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
            `Sync of ${data.syncType} completed. ${String(data.entityCount)} records processed.`,
          ]
        );
      }
    } catch (err) {
      console.error(`[EventBus] Sync notification failed:`, err);
    }
  });

  eventBus.on(EventTypes.STOCK_LOW, async (payload) => {
    const p = payload as StockPayload;
    const { dealerId, commodity } = p;

    try {
      await query(
        `INSERT INTO notifications (dealer_id, title, body, type)
         VALUES ($1, $2, $3, 'alert')`,
        [
          dealerId,
          `Critical Stock - ${commodity}`,
          `Your ${commodity} stock has reached a critically low level. Please arrange lifting immediately.`,
        ]
      );
    } catch (err) {
      console.error(`[EventBus] Critical stock notification failed for dealer ${dealerId}:`, err);
    }
  });

  eventBus.on(EventTypes.BENEFICIARY_UPDATED, async (payload) => {
    const p = payload as Record<string, unknown> & { dealerId: string; batchId: string };
    const { dealerId } = p;

    try {
      const redis = getRedis();
      await redis.del(`dashboard:${dealerId}`);
    } catch {
    }

    try {
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
    } catch (err) {
      console.error(`[EventBus] Beneficiary update notification failed:`, err);
    }
  });
}
