import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { getRedis, closeRedis } from '../../src/config/redis.js';
import { signAccessToken } from '../../src/shared/utils/token.js';
import pg from 'pg';
import * as argon2 from 'argon2';

const TEST_DEALER = {
  fps_id: '99999995',
  full_name: 'Audit Test Dealer',
  mobile: '9999999995',
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
let meetingId: string;

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
  await pool.query(`DELETE FROM social_audit_meetings WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM sessions WHERE dealer_id = $1`, [dealerId]);
  await pool.query(`DELETE FROM dealers WHERE id = $1`, [dealerId]);
  await pool.end();
  await closeRedis();
});

function authCookie() { return `access_token=${accessToken}`; }
const today = () => new Date().toISOString().split('T')[0];

describe('Audit Integration', () => {
  it('POST /audit/meetings — creates a meeting', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/audit/meetings',
      headers: { cookie: authCookie() },
      payload: {
        title: 'Monthly Social Audit - June 2026',
        meeting_date: today(),
        venue: 'Community Hall, Navrangpura',
        total_beneficiaries_verified: 25,
        issues_identified: '3 ghost beneficiaries found',
        resolutions: 'Will update records after home visit',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Monthly Social Audit - June 2026');
    expect(body.data.dealer_id).toBe(dealerId);
    expect(body.data.total_beneficiaries_verified).toBe(25);
    meetingId = body.data.id;
  });

  it('POST /audit/meetings — unauthorized returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/audit/meetings',
      payload: { title: 'Test', meeting_date: today() },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /audit/meetings — invalid payload returns 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/audit/meetings',
      headers: { cookie: authCookie() },
      payload: { title: '', meeting_date: 'invalid-date' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('GET /audit/meetings — lists meetings', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/audit/meetings',
      headers: { cookie: authCookie() },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.meta).toBeDefined();
  });

  it('GET /audit/meetings/:id — returns meeting by ID', async () => {
    expect(meetingId).toBeTruthy();

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/audit/meetings/${meetingId}`,
      headers: { cookie: authCookie() },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(meetingId);
    expect(body.data.issues_identified).toContain('ghost beneficiaries');
  });

  it('GET /audit/meetings/:id — nonexistent returns 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/audit/meetings/00000000-0000-0000-0000-000000000000',
      headers: { cookie: authCookie() },
    });

    expect(res.statusCode).toBe(404);
  });

  it('PATCH /audit/meetings/:id — updates meeting', async () => {
    expect(meetingId).toBeTruthy();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/audit/meetings/${meetingId}`,
      headers: { cookie: authCookie() },
      payload: {
        title: 'Updated Audit Title',
        resolutions: 'All issues resolved',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Updated Audit Title');
    expect(body.data.resolutions).toBe('All issues resolved');
  });

  it('DELETE /audit/meetings/:id — deletes meeting', async () => {
    expect(meetingId).toBeTruthy();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/audit/meetings/${meetingId}`,
      headers: { cookie: authCookie() },
    });

    expect(res.statusCode).toBe(204);

    const verify = await pool.query(
      `SELECT id FROM social_audit_meetings WHERE id = $1`, [meetingId]
    );
    expect(verify.rows.length).toBe(0);
  });

  it('DELETE /audit/meetings/:id — nonexistent returns 404', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/audit/meetings/00000000-0000-0000-0000-000000000000',
      headers: { cookie: authCookie() },
    });

    expect(res.statusCode).toBe(404);
  });
});
