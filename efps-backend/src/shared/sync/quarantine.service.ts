import pool from '../../config/database.js';
import type { ValidationError } from './validation.service';

export interface QuarantineEntry {
  dealerId: string;
  syncJobId?: string;
  recordType: string;
  rawData: Record<string, unknown>;
  errors: ValidationError[];
  source?: string;
}

export async function insertQuarantineRecords(entries: QuarantineEntry[]): Promise<number> {
  if (entries.length === 0) return 0;

  let count = 0;
  for (const e of entries) {
    const result = await pool.query(
      `INSERT INTO sync_quarantine (dealer_id, sync_job_id, record_type, raw_data, errors, source)
       VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, $5::jsonb, $6)`,
      [
        e.dealerId,
        e.syncJobId ?? null,
        e.recordType,
        JSON.stringify(e.rawData),
        JSON.stringify(e.errors),
        e.source ?? 'playwright',
      ]
    );
    count += result.rowCount ?? 1;
  }

  return count;
}

export interface QuarantineSummary {
  total: number;
  byType: Record<string, number>;
  byReason: Record<string, number>;
}

export async function getQuarantineSummary(dealerId?: string): Promise<QuarantineSummary> {
  const params: (string | number)[] = [];
  let whereClause = '';
  if (dealerId) {
    params.push(dealerId);
    whereClause = `WHERE dealer_id = $1::uuid`;
  }

  const result = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COALESCE(JSONB_AGG(record_type ORDER BY record_type) FILTER (WHERE record_type IS NOT NULL), '[]'::jsonb) AS types,
       COALESCE(JSONB_AGG(errors->0->>'code' ORDER BY errors->0->>'code') FILTER (WHERE errors->0->>'code' IS NOT NULL), '[]'::jsonb) AS codes
     FROM sync_quarantine
     ${whereClause}`,
    params
  );

  const row = result.rows[0];
  if (!row) return { total: 0, byType: {}, byReason: {} };

  const byType: Record<string, number> = {};
  for (const t of row.types) byType[t] = (byType[t] ?? 0) + 1;

  const byReason: Record<string, number> = {};
  for (const c of row.codes) byReason[c] = (byReason[c] ?? 0) + 1;

  return { total: parseInt(row.total, 10), byType, byReason };
}
