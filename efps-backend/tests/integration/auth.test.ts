import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { getRedis, closeRedis } from '../../src/config/redis.js';
import pg from 'pg';
import * as argon2 from 'argon2';

const TEST_DEALER = {
  fps_id: '99999999',
  full_name: 'Integration Auth Test',
  mobile: '9999999999',
  role: 'dealer',
  password: 'Password123',
  district: 'Ahmedabad',
  taluka: 'City',
  village: 'Test',
};

let app: Awaited<ReturnType<typeof buildApp>>;
let pool: pg.Pool;

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });

  const passwordHash = await argon2.hash(TEST_DEALER.password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  await pool.query(
    `INSERT INTO dealers (fps_id, full_name, mobile, password_hash, role, district, taluka, village, is_active, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, TRUE)
     ON CONFLICT (mobile) DO UPDATE SET password_hash = $4`,
    [TEST_DEALER.fps_id, TEST_DEALER.full_name, TEST_DEALER.mobile, passwordHash,
     TEST_DEALER.role, TEST_DEALER.district, TEST_DEALER.taluka, TEST_DEALER.village]
  );

  await getRedis().connect();
  app = await buildApp();
  await app.ready();
}, 30000);

afterAll(async () => {
  await app?.close();
  await pool.query(`DELETE FROM sessions WHERE dealer_id = (SELECT id FROM dealers WHERE fps_id = $1)`, [TEST_DEALER.fps_id]);
  await pool.query(`DELETE FROM dealers WHERE fps_id = $1`, [TEST_DEALER.fps_id]);
  await pool.end();
  await closeRedis();
});

describe('Auth Integration', () => {
  let accessToken: string;
  let refreshToken: string;
  let dealerId: string;

  it('POST /auth/login — valid credentials returns tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        fps_id: TEST_DEALER.fps_id,
        password: TEST_DEALER.password,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.access_token).toBeTruthy();
    expect(body.data.refresh_token).toBeTruthy();
    expect(body.data.dealer.fps_id).toBe(TEST_DEALER.fps_id);
    expect(body.data.dealer.role).toBe('dealer');

    accessToken = body.data.access_token;
    refreshToken = body.data.refresh_token;
    dealerId = body.data.dealer.id;
  });

  it('POST /auth/login — wrong password returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        fps_id: TEST_DEALER.fps_id,
        password: 'wrong-password',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('POST /auth/login — non-existent fps_id returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        fps_id: '00000000',
        password: 'SomePass1',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('POST /auth/refresh — refreshes tokens with rotation', async () => {
    expect(refreshToken).toBeTruthy();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {
        refresh_token: refreshToken,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.access_token).toBeTruthy();
    expect(body.data.refresh_token).toBeTruthy();
    expect(body.data.refresh_token).not.toBe(refreshToken);

    accessToken = body.data.access_token;
    refreshToken = body.data.refresh_token;
  });

  it('POST /auth/refresh — invalid token returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {
        refresh_token: 'invalid-jwt-token',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('GET /auth/me — returns current dealer profile', async () => {
    expect(accessToken).toBeTruthy();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.fps_id).toBe(TEST_DEALER.fps_id);
    expect(body.data.id).toBe(dealerId);
    expect(body.data.role).toBe('dealer');
  });

  it('GET /auth/me — missing token returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(res.statusCode).toBe(401);
  });

  it('POST /auth/logout — succeeds and blacklists token', async () => {
    expect(accessToken).toBeTruthy();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
  });

  it('GET /auth/me — blacklisted token rejected after logout', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(res.statusCode).toBe(401);
  });
});
