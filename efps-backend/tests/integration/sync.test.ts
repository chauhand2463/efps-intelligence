import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import pg from 'pg';
import * as argon2 from 'argon2';

const TEST_DEALER = {
  fps_id: '99999998',
  full_name: 'Integration Sync Test',
  mobile: '9999999998',
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

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });

  const passwordHash = await argon2.hash(TEST_DEALER.password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const result = await pool.query(
    `INSERT INTO dealers (fps_id, full_name, mobile, password_hash, role, district, taluka, village, is_active, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, TRUE)
     ON CONFLICT (mobile) DO UPDATE SET password_hash = $4 RETURNING id`,
    [TEST_DEALER.fps_id, TEST_DEALER.full_name, TEST_DEALER.mobile, passwordHash,
     TEST_DEALER.role, TEST_DEALER.district, TEST_DEALER.taluka, TEST_DEALER.village]
  );
  dealerId = result.rows[0]!.id;

  app = await buildApp();
  await app.ready();

  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      fps_id: TEST_DEALER.fps_id,
      password: TEST_DEALER.password,
    },
  });
  const body = JSON.parse(loginRes.payload);
  accessToken = body.data.access_token;
}, 30000);

afterAll(async () => {
  await app.close();
  await pool.query(`DELETE FROM sync_jobs WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM sessions WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM dealers WHERE id = $1`, [dealerId]);
  await pool.end();
});

describe('Sync Integration', () => {
  it('POST /sync/self/trigger — enqueues a sync job', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sync/self/trigger',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        sync_type: 'beneficiaries',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.message).toBe('Sync triggered');
    expect(body.data.dealer_id).toBe(dealerId);

    const jobResult = await pool.query(
      `SELECT * FROM sync_jobs WHERE dealer_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [dealerId]
    );
    expect(jobResult.rows.length).toBeGreaterThan(0);
    expect(jobResult.rows[0]!.status).toBe('pending');
    expect(jobResult.rows[0]!.triggered_by).toBe('manual');
  });

  it('GET /sync/self/status — returns sync status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/self/status',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.jobs).toBeInstanceOf(Array);
    expect(body.data).toHaveProperty('is_syncing');
    expect(body.data).toHaveProperty('last_sync_at');
  });

  it('GET /sync/bank-info — returns bank info (nullable)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/bank-info',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
  });

  it('POST /sync/self/trigger — without auth returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sync/self/trigger',
      payload: {
        sync_type: 'beneficiaries',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('POST /sync/bank-info — updates bank info', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/sync/bank-info',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        bank_name: 'Test Bank',
        branch_name: 'Test Branch',
        account_no: '1234567890',
        ifsc_code: 'TEST0001234',
        account_holder: 'Test Holder',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.bank_name).toBe('Test Bank');
    expect(body.data.ifsc_code).toBe('TEST0001234');
  });
});
