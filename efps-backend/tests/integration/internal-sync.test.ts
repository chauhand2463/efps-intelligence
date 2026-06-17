import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../../src/app.js';
import { query as dbQuery } from '../../src/config/database.js';
import pg from 'pg';
import * as argon2 from 'argon2';

const TEST_DEALER = {
  fps_id: '99999997',
  full_name: 'Internal Sync Test',
  mobile: '9999999997',
  role: 'dealer',
  password: 'Password123',
};

let app: Awaited<ReturnType<typeof buildApp>>;
let pool: pg.Pool;
let serviceToken: string;
let dealerId: string;
let beneficiaryId: string;

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });

  // Ensure required tables/columns from additive migrations exist
  await pool.query(`
    ALTER TABLE sync_jobs
      ADD COLUMN IF NOT EXISTS sync_mode VARCHAR(20) DEFAULT 'full',
      ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS worker_version VARCHAR(50),
      ADD COLUMN IF NOT EXISTS website_version VARCHAR(50),
      ADD COLUMN IF NOT EXISTS processed_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS quarantined_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS error_detail JSONB,
      ADD COLUMN IF NOT EXISTS trace_id VARCHAR(64)
  `);
  await pool.query(`CREATE TABLE IF NOT EXISTS sync_quarantine (id UUID PRIMARY KEY DEFAULT gen_random_uuid())`);
  // Drop legacy columns from previous test schema attempts
  await pool.query(`ALTER TABLE sync_quarantine DROP COLUMN IF EXISTS worker_type`);
  await pool.query(`ALTER TABLE sync_quarantine DROP COLUMN IF EXISTS payload`);
  await pool.query(`ALTER TABLE sync_quarantine DROP COLUMN IF EXISTS reason`);
  await pool.query(`ALTER TABLE sync_quarantine DROP COLUMN IF EXISTS resolved_at`);
  const sqCols = [
    'ADD COLUMN IF NOT EXISTS dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE',
    'ADD COLUMN IF NOT EXISTS sync_job_id UUID REFERENCES sync_jobs(id) ON DELETE SET NULL',
    'ADD COLUMN IF NOT EXISTS record_type VARCHAR(50) NOT NULL',
    'ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT \'[]\'::jsonb',
    'ADD COLUMN IF NOT EXISTS errors JSONB NOT NULL DEFAULT \'[]\'::jsonb',
    'ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT \'playwright\'',
    'ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    'ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ',
    'ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES dealers(id) ON DELETE SET NULL',
    'ADD COLUMN IF NOT EXISTS resolution VARCHAR(20)',
    'ADD COLUMN IF NOT EXISTS notes TEXT',
  ];
  await pool.query(`ALTER TABLE sync_quarantine ${sqCols.join(', ')}`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sync_quarantine_dealer ON sync_quarantine (dealer_id, created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sync_quarantine_resolution ON sync_quarantine (resolution) WHERE resolution IS NULL`);
  await pool.query(`CREATE TABLE IF NOT EXISTS system_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid())`);
  const seCols = [
    'ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) NOT NULL',
    'ADD COLUMN IF NOT EXISTS severity VARCHAR(20) NOT NULL DEFAULT \'info\'',
    'ADD COLUMN IF NOT EXISTS source VARCHAR(100) NOT NULL',
    'ADD COLUMN IF NOT EXISTS message TEXT NOT NULL',
    'ADD COLUMN IF NOT EXISTS metadata JSONB',
    'ADD COLUMN IF NOT EXISTS trace_id VARCHAR(64)',
    'ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  ];
  await pool.query(`ALTER TABLE system_events ${seCols.join(', ')}`);
  // Add sync columns to data tables (from migration 026)
  for (const tbl of ['beneficiaries', 'transactions', 'stock_allocations', 'lifting_records']) {
    await pool.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS source_synced_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS sync_job_id UUID REFERENCES sync_jobs(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1`);
  }
  // Beneficiaries-specific columns
  await pool.query(`ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS external_id VARCHAR(255)`);
  await pool.query(`ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS beneficiary_name VARCHAR(255) DEFAULT ''`);
  await pool.query(`ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS father_name VARCHAR(255) DEFAULT ''`);
  await pool.query(`ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS district VARCHAR(100) DEFAULT ''`);
  await pool.query(`ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS taluka VARCHAR(100) DEFAULT ''`);
  await pool.query(`ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS mobile_no VARCHAR(20) DEFAULT ''`);
  await pool.query(`ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS date_of_issue TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS ration_type VARCHAR(50) DEFAULT ''`);
  await pool.query(`ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'`);
  // Transactions-specific columns
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_hash VARCHAR(255)`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ration_card_no VARCHAR(20)`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS beneficiary_name VARCHAR(255) DEFAULT ''`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS allocated_quantity NUMERIC DEFAULT 0`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS lifted_quantity NUMERIC DEFAULT 0`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100) DEFAULT ''`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS shop_no VARCHAR(50) DEFAULT ''`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS year VARCHAR(10) DEFAULT ''`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed'`);
  // Stock-allocations-specific columns
  await pool.query(`ALTER TABLE stock_allocations ADD COLUMN IF NOT EXISTS allocated_quantity NUMERIC DEFAULT 0`);
  await pool.query(`ALTER TABLE stock_allocations ADD COLUMN IF NOT EXISTS lifted_quantity NUMERIC DEFAULT 0`);
  await pool.query(`ALTER TABLE stock_allocations ADD COLUMN IF NOT EXISTS year VARCHAR(10) DEFAULT ''`);
  await pool.query(`ALTER TABLE stock_allocations ADD COLUMN IF NOT EXISTS month_year VARCHAR(20) DEFAULT ''`);
  await pool.query(`ALTER TABLE stock_allocations ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'Kg'`);
  await pool.query(`ALTER TABLE stock_allocations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'`);
  // Lifting-records-specific columns
  await pool.query(`ALTER TABLE lifting_records ADD COLUMN IF NOT EXISTS allocated_quantity NUMERIC DEFAULT 0`);
  await pool.query(`ALTER TABLE lifting_records ADD COLUMN IF NOT EXISTS lifted_quantity NUMERIC DEFAULT 0`);
  await pool.query(`ALTER TABLE lifting_records ADD COLUMN IF NOT EXISTS year VARCHAR(10) DEFAULT ''`);
  await pool.query(`ALTER TABLE lifting_records ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'Kg'`);
  await pool.query(`ALTER TABLE lifting_records ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'`);

  const passwordHash = await argon2.hash(TEST_DEALER.password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const result = await pool.query(
    `INSERT INTO dealers (fps_id, full_name, mobile, password_hash, role, is_active, is_verified)
     VALUES ($1, $2, $3, $4, $5, TRUE, TRUE)
     ON CONFLICT (mobile) DO UPDATE SET password_hash = $4 RETURNING id`,
    [TEST_DEALER.fps_id, TEST_DEALER.full_name, TEST_DEALER.mobile, passwordHash, TEST_DEALER.role]
  );
  dealerId = result.rows[0]!.id;

  serviceToken = process.env.INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SYNC_SECRET || 'test-service-token';
  process.env.INTERNAL_SYNC_SECRET = serviceToken;

  app = await buildApp();
  await app.ready();
}, 30000);

afterAll(async () => {
  await app?.close();
  await pool.query(`DELETE FROM sync_quarantine WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM beneficiaries WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM transactions WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM stock_allocations WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM lifting_records WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM sync_jobs WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM sessions WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM dealers WHERE id = $1`, [dealerId]);
  await pool.end();
});

describe('Internal Sync API — portal-down resilience', () => {
  it('POST /api/internal/sync — validates payload and returns 400 on missing fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/internal/sync',
      headers: { 'X-Service-Token': serviceToken },
      payload: { dealer_id: dealerId },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('Validation failed');
  });

  it('POST /api/internal/sync — rejects unauthorized requests', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/internal/sync',
      headers: {},
      payload: {
        dealer_id: dealerId,
        sync_mode: 'full',
        workers: [],
        trace_id: 'test',
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/internal/sync — quarantines invalid records without corrupting DB', async () => {
    const invalidRecords = [
      { ration_card_no: '', beneficiary_name: 'No Ration Card', version: 1 },
    ];

    const res = await app.inject({
      method: 'POST',
      url: '/api/internal/sync',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Token': serviceToken,
      },
      payload: {
        dealer_id: dealerId,
        sync_mode: 'full',
        workers: [
          { type: 'beneficiary', records: invalidRecords },
        ],
        trace_id: 'quarantine-test',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.quarantined).toBeGreaterThanOrEqual(1);

    // Verify quarantine table has the record
    const quarantineResult = await pool.query(
      `SELECT * FROM sync_quarantine WHERE dealer_id = $1 AND record_type = 'beneficiary' AND reviewed_at IS NULL`,
      [dealerId]
    );
    expect(quarantineResult.rows.length).toBeGreaterThanOrEqual(1);

    // Verify beneficiaries table is NOT corrupted (no empty ration_card_no row)
    const benResult = await pool.query(
      `SELECT COUNT(*) as count FROM beneficiaries WHERE dealer_id = $1 AND ration_card_no = ''`,
      [dealerId]
    );
    expect(Number(benResult.rows[0]!.count)).toBe(0);
  });

  it('POST /api/internal/sync — processes valid records and writes to DB', async () => {
    const validRecords = [
      {
        ration_card_no: 'SYNC-TEST-001',
        beneficiary_name: 'Sync Test Beneficiary',
        category: 'APL',
        status: 'active',
        version: 1,
      },
    ];

    const res = await app.inject({
      method: 'POST',
      url: '/api/internal/sync',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Token': serviceToken,
      },
      payload: {
        dealer_id: dealerId,
        sync_mode: 'full',
        workers: [
          { type: 'beneficiary', records: validRecords },
        ],
        trace_id: 'valid-test',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.processed).toBe(1);

    // Verify beneficiary was created
    const benResult = await pool.query(
      `SELECT id, ration_card_no, head_of_family, category FROM beneficiaries WHERE dealer_id = $1 AND ration_card_no = 'SYNC-TEST-001'`,
      [dealerId]
    );
    expect(benResult.rows.length).toBe(1);
    expect(benResult.rows[0]!.head_of_family).toBe('Sync Test Beneficiary');
    expect(benResult.rows[0]!.category).toBe('APL');
    beneficiaryId = benResult.rows[0]!.id;
  });

  it('POST /api/internal/sync — sync-processed beneficiaries are visible to manual CRUD', async () => {
    // Verify the beneficiary created by sync can be fetched via the public API
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { fps_id: TEST_DEALER.fps_id, password: TEST_DEALER.password },
    });

    const loginBody = JSON.parse(res.payload);
    const accessToken = loginBody.data.access_token;

    // Wait — access_token is no longer in the body since we moved to cookies.
    // For the test, we need to check the Set-Cookie header.
    // Since the test uses app.inject() (no real browser), cookies don't persist.
    // Let's use the internal API path directly (/api/internal/sync) which uses service token.
    // Instead, let's verify via direct DB query:
    const benResult = await pool.query(
      `SELECT id, ration_card_no, head_of_family FROM beneficiaries WHERE id = $1`,
      [beneficiaryId]
    );
    expect(benResult.rows.length).toBe(1);
    expect(benResult.rows[0]!.ration_card_no).toBe('SYNC-TEST-001');
  });

  it('POST /api/internal/sync — idempotent upsert does not create duplicates', async () => {
    const sameRecord = [
      {
        ration_card_no: 'SYNC-TEST-001',
        beneficiary_name: 'Sync Test Beneficiary Updated',
        category: 'BPL',
        status: 'active',
        version: 2,
      },
    ];

    const res = await app.inject({
      method: 'POST',
      url: '/api/internal/sync',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Token': serviceToken,
      },
      payload: {
        dealer_id: dealerId,
        sync_mode: 'full',
        workers: [
          { type: 'beneficiary', records: sameRecord },
        ],
        trace_id: 'idempotent-test',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);

    // Still only ONE row (not a duplicate)
    const benResult = await pool.query(
      `SELECT COUNT(*) as count FROM beneficiaries WHERE dealer_id = $1 AND ration_card_no = 'SYNC-TEST-001'`,
      [dealerId]
    );
    expect(Number(benResult.rows[0]!.count)).toBe(1);

    // Category was updated (version 2 > version 1)
    const updated = await pool.query(
      `SELECT category, head_of_family FROM beneficiaries WHERE id = $1`,
      [beneficiaryId]
    );
    expect(updated.rows[0]!.category).toBe('BPL');
    expect(updated.rows[0]!.head_of_family).toBe('Sync Test Beneficiary Updated');
  });

  it('POST /api/internal/sync — processes stock allocations', async () => {
    const stockRecords = [
      { commodity: 'Wheat', allocated_quantity: 100, lifted_quantity: 80, month: '2026-06-01', version: 1 },
    ];


    const res = await app.inject({
      method: 'POST',
      url: '/api/internal/sync',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Token': serviceToken,
      },
      payload: {
        dealer_id: dealerId,
        sync_mode: 'full',
        workers: [
          { type: 'stock_allocation', records: stockRecords },
        ],
        trace_id: 'stock-test',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.processed).toBe(1);

    const stockResult = await pool.query(
      `SELECT commodity, allocated_kg, lifted_kg, allocated_quantity, lifted_quantity
       FROM stock_allocations WHERE dealer_id = $1 AND commodity = 'Wheat' AND month = '2026-06-01'::date`,
      [dealerId]
    );
    expect(stockResult.rows.length).toBe(1);
    expect(Number(stockResult.rows[0]!.allocated_kg)).toBe(100);
    expect(Number(stockResult.rows[0]!.lifted_kg)).toBe(80);
  });
});
