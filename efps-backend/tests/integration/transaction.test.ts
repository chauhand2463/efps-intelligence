import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { getRedis, closeRedis } from '../../src/config/redis.js';
import { signAccessToken } from '../../src/shared/utils/token.js';
import pg from 'pg';
import * as argon2 from 'argon2';

const TEST_DEALER = {
  fps_id: '99999991',
  full_name: 'Transaction Test Dealer',
  mobile: '9999999991',
  role: 'dealer',
  password: 'Password123',
  district: 'Ahmedabad',
  taluka: 'City',
  village: 'Test',
};

let app: Awaited<ReturnType<typeof buildApp>>;
let pool: pg.Pool;
let accessToken: string;
let dealerId: string;
let beneficiaryId: string;

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });

  const passwordHash = await argon2.hash(TEST_DEALER.password, {
    type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4,
  });

  // Ensure schema columns — tds_rates needed by domain-events queue
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tds_rates (
      id SERIAL PRIMARY KEY,
      commodity VARCHAR(50) NOT NULL,
      tds_percent NUMERIC(5,2) NOT NULL DEFAULT 10,
      effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(commodity, effective_from)
    )
  `);
  await pool.query(`
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_synced_at TIMESTAMPTZ;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sync_job_id UUID;
  `);
  await pool.query(`
    ALTER TABLE stock_allocations ADD COLUMN IF NOT EXISTS allocated_quantity NUMERIC(10,3);
    ALTER TABLE stock_allocations ADD COLUMN IF NOT EXISTS lifted_quantity NUMERIC(10,3);
    ALTER TABLE stock_allocations ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE stock_allocations ADD COLUMN IF NOT EXISTS unit VARCHAR(20) NOT NULL DEFAULT 'Kg';
    ALTER TABLE stock_allocations ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
  `);

  const dealerResult = await pool.query(
    `INSERT INTO dealers (fps_id, full_name, mobile, password_hash, role, district, taluka, village, is_active, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, TRUE)
     ON CONFLICT (mobile) DO UPDATE SET password_hash = $4 RETURNING id`,
    [TEST_DEALER.fps_id, TEST_DEALER.full_name, TEST_DEALER.mobile, passwordHash,
     TEST_DEALER.role, TEST_DEALER.district, TEST_DEALER.taluka, TEST_DEALER.village]
  );
  dealerId = dealerResult.rows[0]!.id;

  // Create test beneficiary
  const benResult = await pool.query(
    `INSERT INTO beneficiaries (dealer_id, ration_card_no, head_of_family, mobile, member_count, category, is_active)
     VALUES ($1, 'RC-TRANS-001', 'Test Beneficiary', '9999999911', 3, 'BPL', TRUE)
     ON CONFLICT (ration_card_no) DO NOTHING RETURNING id`,
    [dealerId]
  );
  if (benResult.rows[0]) {
    beneficiaryId = benResult.rows[0].id;
  } else {
    const existing = await pool.query(
      `SELECT id FROM beneficiaries WHERE ration_card_no = 'RC-TRANS-001'`
    );
    beneficiaryId = existing.rows[0]!.id;
  }

  // Create stock allocation so stock check passes
  await pool.query(
    `INSERT INTO stock_allocations (dealer_id, month, commodity, allocated_kg, allocated_quantity, lifted_quantity, unit)
     VALUES ($1, $2, 'Wheat', 500, 500, 0, 'Kg')
     ON CONFLICT (dealer_id, month, commodity) DO NOTHING`,
    [dealerId, new Date().toISOString().split('T')[0]]
  );

  // Create a second beneficiary for pending check
  await pool.query(
    `INSERT INTO beneficiaries (dealer_id, ration_card_no, head_of_family, member_count, category, is_active)
     VALUES ($1, 'RC-TRANS-002', 'Pending Beneficiary', 2, 'AAY', TRUE)
     ON CONFLICT (ration_card_no) DO NOTHING`,
    [dealerId]
  );

  await getRedis().connect();
  app = await buildApp();
  await app.ready();
  accessToken = signAccessToken({ sub: dealerId, role: 'dealer', fps_id: TEST_DEALER.fps_id });
}, 30000);

afterAll(async () => {
  await app?.close();
  await pool.query(`DELETE FROM bank_settlements WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM commissions WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM inventory_movements WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM transactions WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM beneficiaries WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM stock_allocations WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM sessions WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM dealers WHERE id = $1`, [dealerId]);
  await pool.end();
  await closeRedis();
});

function authCookie() { return `access_token=${accessToken}`; }
const monthStr = () => new Date().toISOString().split('T')[0];

describe('Transaction Integration', () => {
  let txId: string;

  it('POST /transactions — creates a transaction', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: { cookie: authCookie() },
      payload: {
        beneficiary_id: beneficiaryId,
        month: monthStr(),
        commodity: 'Wheat',
        quantity_kg: 10,
        price_per_kg: 25,
        mode: 'pos',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Number(body.data.quantity_kg)).toBe(10);
    expect(body.data.commodity).toBe('Wheat');
    expect(body.data.dealer_id).toBe(dealerId);
    expect(body.data.id).toBeTruthy();
    txId = body.data.id;

    // stock allocation lifted_kg should have increased
    const stock = await pool.query(
      `SELECT lifted_kg FROM stock_allocations WHERE dealer_id = $1 AND commodity = 'Wheat'`,
      [dealerId]
    );
    expect(Number(stock.rows[0]!.lifted_kg)).toBe(10);
  });

  it('POST /transactions — duplicate throws 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: { cookie: authCookie() },
      payload: {
        beneficiary_id: beneficiaryId,
        month: monthStr(),
        commodity: 'Wheat',
        quantity_kg: 5,
        mode: 'pos',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
  });

  it('POST /transactions — insufficient stock throws 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: { cookie: authCookie() },
      payload: {
        beneficiary_id: beneficiaryId,
        month: monthStr(),
        commodity: 'Wheat',
        quantity_kg: 99999,
        mode: 'pos',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('POST /transactions — unauthorized returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      payload: {
        beneficiary_id: beneficiaryId,
        month: monthStr(),
        commodity: 'Wheat',
        quantity_kg: 5,
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('GET /transactions — lists transactions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/transactions',
      headers: { cookie: authCookie() },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.meta).toBeDefined();
  });

  it('GET /transactions/summary — returns summary', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/transactions/summary',
      headers: { cookie: authCookie() },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
  });

  it('GET /transactions/pending — returns pending beneficiaries', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/transactions/pending',
      headers: { cookie: authCookie() },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
  });

  it('GET /transactions/:id — returns transaction by ID', async () => {
    expect(txId).toBeTruthy();

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/transactions/${txId}`,
      headers: { cookie: authCookie() },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(txId);
  });

  it('GET /transactions/:id — wrong ID returns 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/transactions/00000000-0000-0000-0000-000000000000',
      headers: { cookie: authCookie() },
    });

    expect(res.statusCode).toBe(404);
  });

  it('DELETE /transactions/:id — deletes transaction', async () => {
    expect(txId).toBeTruthy();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/transactions/${txId}`,
      headers: { cookie: authCookie() },
    });

    expect(res.statusCode).toBe(204);

    const verify = await pool.query(`SELECT id FROM transactions WHERE id = $1`, [txId]);
    expect(verify.rows.length).toBe(0);

    // stock allocation lifted_kg should have decreased back
    const stock = await pool.query(
      `SELECT lifted_kg FROM stock_allocations WHERE dealer_id = $1 AND commodity = 'Wheat'`,
      [dealerId]
    );
    expect(Number(stock.rows[0]!.lifted_kg)).toBe(0);
  });
});
