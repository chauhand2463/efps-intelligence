import pool from '../../config/database.js';
import { normalizeRecord } from '../../shared/sync/normalization.service.js';
import { validateBatch, type ValidationError, type RecordType } from '../../shared/sync/validation.service.js';
import { insertQuarantineRecords } from '../../shared/sync/quarantine.service.js';
import type { SyncPayload } from './internal-sync.schema';

interface SyncResult {
  totalRecords: number;
  processed: number;
  quarantined: number;
  errors: string[];
}

function makeHash(...parts: (string | number)[]): string {
  const str = parts.join('||');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function computeBeneficiaryKey(dealerId: string, record: Record<string, unknown>): { external_id: string } {
  const rc = (record.ration_card_no ?? record.rc_no ?? 'UNKNOWN') as string;
  return { external_id: `${dealerId}_${rc}_beneficiary` };
}

function computeTransactionKey(dealerId: string, record: Record<string, unknown>): { transaction_hash: string } {
  const rc = (record.ration_card_no ?? 'UNKNOWN') as string;
  const date = (record.transaction_date ?? '') as string;
  const commodity = (record.commodity ?? '') as string;
  return { transaction_hash: makeHash(dealerId, rc, date, commodity) };
}

function computeStockKey(dealerId: string, record: Record<string, unknown>): { month: string; commodity: string } {
  return {
    month: (record.month ?? record.month_year ?? '') as string,
    commodity: (record.commodity ?? '') as string,
  };
}

export async function processSyncPayload(payload: SyncPayload): Promise<SyncResult> {
  const result: SyncResult = { totalRecords: 0, processed: 0, quarantined: 0, errors: [] };
  const { dealer_id, sync_job_id, trace_id } = payload;

  for (const worker of payload.workers) {
    result.totalRecords += worker.records.length;

    const recordType = worker.type as RecordType;

    const normalized = worker.records.map((r) => normalizeRecord(r));

    const { pass, fail } = validateBatch(normalized, recordType);

    if (fail.length > 0) {
      await insertQuarantineRecords(
        fail.map((f) => ({
          dealerId: dealer_id,
          syncJobId: sync_job_id,
          recordType,
          rawData: f.record,
          errors: f.errors,
          source: 'playwright',
        }))
      );
      result.quarantined += fail.length;
    }

    if (pass.length === 0) continue;

    try {
      switch (recordType) {
        case 'beneficiary':
          result.processed += await upsertBeneficiaries(dealer_id, pass.map((p) => p.record), sync_job_id);
          break;
        case 'transaction':
          result.processed += await upsertTransactions(dealer_id, pass.map((p) => p.record), sync_job_id);
          break;
        case 'stock_allocation':
          result.processed += await upsertStockAllocations(dealer_id, pass.map((p) => p.record), sync_job_id);
          break;
        case 'lifting_record':
          result.processed += await upsertLiftingRecords(dealer_id, pass.map((p) => p.record), sync_job_id);
          break;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error during upsert';
      result.errors.push(`[${recordType}] ${msg}`);
      await insertQuarantineRecords(
        pass.map((p) => ({
          dealerId: dealer_id,
          syncJobId: sync_job_id,
          recordType,
          rawData: p.record,
          errors: [{ field: '_upsert', message: msg, code: 'UPSERT_FAILED' }],
          source: 'playwright',
        }))
      );
      result.quarantined += pass.length;
    }
  }

  await updateSyncJobStats(dealer_id, sync_job_id, result);
  return result;
}

async function upsertBeneficiaries(dealerId: string, records: Record<string, unknown>[], syncJobId?: string): Promise<number> {
  let count = 0;
  for (const rec of records) {
    const { external_id } = computeBeneficiaryKey(dealerId, rec);
    const version = (rec.version as number) ?? 1;

    const existing = await pool.query(
      `SELECT version FROM beneficiaries WHERE dealer_id = $1 AND external_id = $2`,
      [dealerId, external_id]
    );

    if (existing.rows.length > 0 && existing.rows[0].version >= version) continue;

    await pool.query(
      `INSERT INTO beneficiaries (dealer_id, external_id, ration_card_no, beneficiary_name, father_name, address, district, taluka, mobile_no, date_of_issue, ration_type, category, status, source_synced_at, sync_job_id, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (dealer_id, external_id) DO UPDATE SET
         beneficiary_name = EXCLUDED.beneficiary_name,
         father_name = EXCLUDED.father_name,
         address = EXCLUDED.address,
         district = EXCLUDED.district,
         taluka = EXCLUDED.taluka,
         mobile_no = EXCLUDED.mobile_no,
         date_of_issue = EXCLUDED.date_of_issue,
         ration_type = EXCLUDED.ration_type,
         category = EXCLUDED.category,
         status = EXCLUDED.status,
         source_synced_at = EXCLUDED.source_synced_at,
         sync_job_id = EXCLUDED.sync_job_id,
         version = EXCLUDED.version,
         updated_at = NOW()`,
      [
        dealerId, external_id,
        rec.ration_card_no, rec.beneficiary_name, rec.father_name ?? '',
        rec.address ?? '', rec.district ?? rec.district_name ?? '', rec.taluka ?? rec.taluka_name ?? '',
        rec.mobile_no ?? rec.mobile ?? '', rec.date_of_issue ?? null,
        rec.ration_type ?? '', rec.category ?? '', rec.status ?? 'active',
        rec.source_synced_at ?? new Date().toISOString(),
        syncJobId ?? null, version,
      ]
    );
    count++;
  }
  return count;
}

async function upsertTransactions(dealerId: string, records: Record<string, unknown>[], syncJobId?: string): Promise<number> {
  let count = 0;
  for (const rec of records) {
    const { transaction_hash } = computeTransactionKey(dealerId, rec);
    const version = (rec.version as number) ?? 1;

    const existing = await pool.query(
      `SELECT version FROM transactions WHERE dealer_id = $1 AND transaction_hash = $2`,
      [dealerId, transaction_hash]
    );

    if (existing.rows.length > 0 && existing.rows[0].version >= version) continue;

    await pool.query(
      `INSERT INTO transactions (dealer_id, transaction_hash, ration_card_no, beneficiary_name, transaction_date, commodity, allocated_quantity, lifted_quantity, amount_paid, transaction_id, shop_no, month, year, status, source_synced_at, sync_job_id, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (dealer_id, transaction_hash) DO UPDATE SET
         beneficiary_name = EXCLUDED.beneficiary_name,
         transaction_date = EXCLUDED.transaction_date,
         commodity = EXCLUDED.commodity,
         allocated_quantity = EXCLUDED.allocated_quantity,
         lifted_quantity = EXCLUDED.lifted_quantity,
         amount_paid = EXCLUDED.amount_paid,
         transaction_id = EXCLUDED.transaction_id,
         shop_no = EXCLUDED.shop_no,
         month = EXCLUDED.month,
         year = EXCLUDED.year,
         status = EXCLUDED.status,
         source_synced_at = EXCLUDED.source_synced_at,
         sync_job_id = EXCLUDED.sync_job_id,
         version = EXCLUDED.version,
         updated_at = NOW()`,
      [
        dealerId, transaction_hash,
        rec.ration_card_no, rec.beneficiary_name ?? '', rec.transaction_date,
        rec.commodity, rec.allocated_quantity ?? 0, rec.lifted_quantity ?? 0, rec.amount_paid ?? 0,
        rec.transaction_id ?? '', rec.shop_no ?? '', rec.month ?? '', rec.year ?? '',
        rec.status ?? 'completed',
        rec.source_synced_at ?? new Date().toISOString(),
        syncJobId ?? null, version,
      ]
    );
    count++;
  }
  return count;
}

async function upsertStockAllocations(dealerId: string, records: Record<string, unknown>[], syncJobId?: string): Promise<number> {
  let count = 0;
  for (const rec of records) {
    const { month, commodity } = computeStockKey(dealerId, rec);
    const version = (rec.version as number) ?? 1;

    const existing = await pool.query(
      `SELECT version FROM stock_allocations WHERE dealer_id = $1 AND month = $2 AND commodity = $3`,
      [dealerId, month, commodity]
    );

    if (existing.rows.length > 0 && existing.rows[0].version >= version) continue;

    await pool.query(
      `INSERT INTO stock_allocations (dealer_id, commodity, allocated_quantity, lifted_quantity, month, year, month_year, unit, status, source_synced_at, sync_job_id, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (dealer_id, month, commodity) DO UPDATE SET
         allocated_quantity = EXCLUDED.allocated_quantity,
         lifted_quantity = EXCLUDED.lifted_quantity,
         year = EXCLUDED.year,
         month_year = EXCLUDED.month_year,
         unit = EXCLUDED.unit,
         status = EXCLUDED.status,
         source_synced_at = EXCLUDED.source_synced_at,
         sync_job_id = EXCLUDED.sync_job_id,
         version = EXCLUDED.version,
         updated_at = NOW()`,
      [
        dealerId, commodity, rec.allocated_quantity ?? 0, rec.lifted_quantity ?? 0,
        month, rec.year ?? rec.month_year?.toString().split(' ')[1] ?? '',
        rec.month_year ?? '', rec.unit ?? 'Kg', rec.status ?? 'pending',
        rec.source_synced_at ?? new Date().toISOString(),
        syncJobId ?? null, version,
      ]
    );
    count++;
  }
  return count;
}

async function upsertLiftingRecords(dealerId: string, records: Record<string, unknown>[], syncJobId?: string): Promise<number> {
  let count = 0;
  for (const rec of records) {
    const month = rec.month as string;
    const commodity = rec.commodity as string;
    const version = (rec.version as number) ?? 1;

    const existing = await pool.query(
      `SELECT version FROM lifting_records WHERE dealer_id = $1 AND month = $2 AND commodity = $3 AND year = $4`,
      [dealerId, month, commodity, rec.year]
    );

    if (existing.rows.length > 0 && existing.rows[0].version >= version) continue;

    await pool.query(
      `INSERT INTO lifting_records (dealer_id, commodity, allocated_quantity, lifted_quantity, month, year, unit, status, source_synced_at, sync_job_id, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (dealer_id, month, commodity, year) DO UPDATE SET
         allocated_quantity = EXCLUDED.allocated_quantity,
         lifted_quantity = EXCLUDED.lifted_quantity,
         unit = EXCLUDED.unit,
         status = EXCLUDED.status,
         source_synced_at = EXCLUDED.source_synced_at,
         sync_job_id = EXCLUDED.sync_job_id,
         version = EXCLUDED.version,
         updated_at = NOW()`,
      [
        dealerId, commodity, rec.allocated_quantity ?? 0, rec.lifted_quantity ?? 0,
        month, rec.year ?? '', rec.unit ?? 'Kg', rec.status ?? 'pending',
        rec.source_synced_at ?? new Date().toISOString(),
        syncJobId ?? null, version,
      ]
    );
    count++;
  }
  return count;
}

async function updateSyncJobStats(dealerId: string, syncJobId: string | undefined, result: SyncResult): Promise<void> {
  if (!syncJobId) return;
  try {
    await pool.query(
      `UPDATE sync_jobs SET
        processed_count = processed_count + $1,
        quarantined_count = quarantined_count + $2,
        error_detail = CASE WHEN $3::text[] IS NOT NULL AND array_length($3::text[], 1) > 0 THEN to_jsonb($3::text[]) ELSE error_detail END
      WHERE id = $4 AND dealer_id = $5`,
      [result.processed, result.quarantined, result.errors.length > 0 ? result.errors : null, syncJobId, dealerId]
    );
  } catch {
    // best-effort stats update
  }
}
