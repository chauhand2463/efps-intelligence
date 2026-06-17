import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { getRedis, closeRedis } from '../../src/config/redis.js';
import { signAccessToken } from '../../src/shared/utils/token.js';
import pg from 'pg';
import * as argon2 from 'argon2';

const TEST_DEALER = {
  fps_id: '99999994',
  full_name: 'Finance Test Dealer',
  mobile: '9999999994',
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
let incomeId: string;
let expenseId: string;

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });

  const passwordHash = await argon2.hash(TEST_DEALER.password, {
    type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4,
  });

  const dealerResult = await pool.query(
    `INSERT INTO dealers (fps_id, full_name, mobile, password_hash, role, district, taluka, village, is_active, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, TRUE)
     ON CONFLICT (mobile) DO UPDATE SET password_hash = $4 RETURNING id`,
    [TEST_DEALER.fps_id, TEST_DEALER.full_name, TEST_DEALER.mobile, passwordHash,
     TEST_DEALER.role, TEST_DEALER.district, TEST_DEALER.taluka, TEST_DEALER.village]
  );
  dealerId = dealerResult.rows[0]!.id;

  await getRedis().connect();
  app = await buildApp();
  await app.ready();
  accessToken = signAccessToken({ sub: dealerId, role: 'dealer', fps_id: TEST_DEALER.fps_id });
}, 30000);

afterAll(async () => {
  await app?.close();
  await pool.query(`DELETE FROM income_entries WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM expense_entries WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM sessions WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM dealers WHERE id = $1`, [dealerId]);
  await pool.end();
  await closeRedis();
});

function authCookie() { return `access_token=${accessToken}`; }
const today = () => new Date().toISOString().split('T')[0];

describe('Finance Integration', () => {
  it('POST /finance/income — adds income entry', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/finance/income',
      headers: { cookie: authCookie() },
      payload: {
        source: 'Commission',
        amount: 5000,
        entry_date: today(),
        description: 'Monthly commission income',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Number(body.data.amount)).toBe(5000);
    expect(body.data.source).toBe('Commission');
    incomeId = body.data.id;
  });

  it('POST /finance/expense — adds expense entry', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/finance/expense',
      headers: { cookie: authCookie() },
      payload: {
        category: 'Electricity',
        amount: 1200,
        entry_date: today(),
        description: 'Monthly electricity bill',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Number(body.data.amount)).toBe(1200);
    expect(body.data.category).toBe('Electricity');
    expenseId = body.data.id;
  });

  it('POST /finance/income — unauthorized returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/finance/income',
      payload: { source: 'Test', amount: 100, entry_date: today() },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /finance/expense — unauthorized returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/finance/expense',
      payload: { category: 'Test', amount: 100, entry_date: today() },
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /finance/income — lists income entries', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/finance/income',
      headers: { cookie: authCookie() },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /finance/expenses — lists expense entries', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/finance/expenses',
      headers: { cookie: authCookie() },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /finance/profit-loss — returns profit/loss', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/finance/profit-loss',
      headers: { cookie: authCookie() },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('total_income');
    expect(body.data).toHaveProperty('total_expense');
    expect(body.data).toHaveProperty('net_profit');
  });

  it('DELETE /finance/income/:id — deletes income entry', async () => {
    expect(incomeId).toBeTruthy();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/finance/income/${incomeId}`,
      headers: { cookie: authCookie() },
    });

    expect(res.statusCode).toBe(204);

    const verify = await pool.query(`SELECT id FROM income_entries WHERE id = $1`, [incomeId]);
    expect(verify.rows.length).toBe(0);
  });

  it('DELETE /finance/expense/:id — deletes expense entry', async () => {
    expect(expenseId).toBeTruthy();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/finance/expense/${expenseId}`,
      headers: { cookie: authCookie() },
    });

    expect(res.statusCode).toBe(204);

    const verify = await pool.query(`SELECT id FROM expense_entries WHERE id = $1`, [expenseId]);
    expect(verify.rows.length).toBe(0);
  });

  it('DELETE /finance/income/:id — nonexistent returns 404', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/finance/income/00000000-0000-0000-0000-000000000000',
      headers: { cookie: authCookie() },
    });
    expect(res.statusCode).toBe(404);
  });
});
