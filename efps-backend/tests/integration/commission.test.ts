import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { getRedis, closeRedis } from '../../src/config/redis.js';
import { signAccessToken } from '../../src/shared/utils/token.js';
import pg from 'pg';
import * as argon2 from 'argon2';

const TEST_ADMIN = {
  fps_id: '99999992',
  full_name: 'Commission Test Admin',
  mobile: '9999999992',
  role: 'admin',
  password: 'Password123',
  district: 'Gandhinagar',
};

const TEST_DEALER = {
  fps_id: '99999993',
  full_name: 'Commission Test Dealer',
  mobile: '9999999993',
  role: 'dealer',
  password: 'Password123',
  district: 'Ahmedabad',
  taluka: 'City',
  village: 'Test',
};

let app: Awaited<ReturnType<typeof buildApp>>;
let pool: pg.Pool;
let dealerToken: string;
let adminToken: string;
let dealerId: string;

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });

  const hash = await argon2.hash(TEST_ADMIN.password, {
    type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4,
  });

  const adminResult = await pool.query(
    `INSERT INTO dealers (fps_id, full_name, mobile, password_hash, role, district, is_active, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)
     ON CONFLICT (mobile) DO UPDATE SET password_hash = $4 RETURNING id`,
    [TEST_ADMIN.fps_id, TEST_ADMIN.full_name, TEST_ADMIN.mobile, hash,
     TEST_ADMIN.role, TEST_ADMIN.district]
  );
  adminToken = signAccessToken({ sub: adminResult.rows[0]!.id, role: 'admin', fps_id: TEST_ADMIN.fps_id });

  const dealerHash = await argon2.hash(TEST_DEALER.password, {
    type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4,
  });

  const dealerResult = await pool.query(
    `INSERT INTO dealers (fps_id, full_name, mobile, password_hash, role, district, taluka, village, is_active, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, TRUE)
     ON CONFLICT (mobile) DO UPDATE SET password_hash = $4 RETURNING id`,
    [TEST_DEALER.fps_id, TEST_DEALER.full_name, TEST_DEALER.mobile, dealerHash,
     TEST_DEALER.role, TEST_DEALER.district, TEST_DEALER.taluka, TEST_DEALER.village]
  );
  dealerId = dealerResult.rows[0]!.id;
  dealerToken = signAccessToken({ sub: dealerId, role: 'dealer', fps_id: TEST_DEALER.fps_id });

  await getRedis().connect();
  app = await buildApp();
  await app.ready();
}, 30000);

afterAll(async () => {
  await app?.close();
  await pool.query(`DELETE FROM bank_settlements WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM commissions WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM dealer_bank_info WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM sessions WHERE dealer_id IN (SELECT id FROM dealers WHERE fps_id IN ($1, $2))`, [TEST_ADMIN.fps_id, TEST_DEALER.fps_id]);
  await pool.query(`DELETE FROM dealers WHERE fps_id IN ($1, $2)`, [TEST_ADMIN.fps_id, TEST_DEALER.fps_id]);
  await pool.end();
  await closeRedis();
});

function authCookie(token: string) { return `access_token=${token}`; }
const monthStr = () => new Date().toISOString().split('T')[0];

describe('Commission Integration', () => {
  it('GET /commission/rates — returns empty array initially', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/commission/rates',
      headers: { cookie: authCookie(dealerToken) },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
  });

  it('POST /commission/rates — dealer cannot set rates (403)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/commission/rates',
      headers: { cookie: authCookie(dealerToken) },
      payload: { commodity: 'Wheat', rate_per_kg: 2.5, effective_from: monthStr() },
    });

    expect(res.statusCode).toBe(403);
  });

  it('POST /commission/rates — admin sets a rate', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/commission/rates',
      headers: { cookie: authCookie(adminToken) },
      payload: { commodity: 'Wheat', rate_per_kg: 2.5, effective_from: monthStr() },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.commodity).toBe('Wheat');
    expect(Number(body.data.rate_per_kg)).toBe(2.5);
  });

  it('GET /commission/rates — returns the rate', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/commission/rates',
      headers: { cookie: authCookie(dealerToken) },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    const wheat = body.data.find((r: any) => r.commodity === 'Wheat');
    expect(Number(wheat?.rate_per_kg)).toBe(2.5);
  });

  it('GET /commission — unauthorized returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/commission',
    });

    expect(res.statusCode).toBe(401);
  });

  it('GET /commission — returns empty list with no transactions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/commission',
      headers: { cookie: authCookie(dealerToken) },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeInstanceOf(Array);
  });

  it('POST /commission/settle — no pending commissions returns 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/commission/settle',
      headers: { cookie: authCookie(dealerToken) },
      payload: { month: monthStr() },
    });

    expect(res.statusCode).toBe(404);
  });
});
