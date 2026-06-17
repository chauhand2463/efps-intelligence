import { Worker, Job, Queue } from 'bullmq';
import { chromium, Browser, Page } from 'playwright';
import { createWorker } from 'tesseract.js';
import { getBullRedis } from '../../config/redis.js';
import { query } from '../../config/database.js';
import { decrypt } from '../../shared/utils/encrypt.js';
import { logger } from '../../shared/utils/logger.js';
import { eventBus, EventTypes } from '../../shared/events/index.js';
import { CircuitBreaker } from '../../shared/utils/circuit-breaker.js';
import { config } from '../../config/index.js';
import crypto from 'crypto';

const QUEUE_NAME = 'ipds-sync';
const INTERNAL_SYNC_URL = config.INTERNAL_SYNC_URL;
const SERVICE_TOKEN = config.INTERNAL_SYNC_SECRET;

const ipdsCircuitBreaker = new CircuitBreaker('ipds-portal', {
  failureThreshold: 3,
  resetTimeoutMs: 60_000,
});

export interface IpdsSyncPayload {
  dealerId: string;
  fpsId: string;
  month?: string;
  year?: string;
  triggeredBy: 'registration' | 'scheduled' | 'manual';
  syncJobId?: string;
}

interface DealerCredentialRow {
  ipds_username: string;
  ipds_password: string;
  iv: string;
  auth_tag: string;
}

interface SocialAuditRow {
  transactionDate: string;
  rationCardNo: string;
  beneficiaryName: string;
  commodity: string;
  allocatedQuantity: number;
  liftedQuantity: number;
  amountPaid: number;
}

export const ipdsSyncQueue = new Queue<IpdsSyncPayload>(QUEUE_NAME, {
  connection: getBullRedis() as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export async function enqueueIpdsSync(data: IpdsSyncPayload) {
  return ipdsSyncQueue.add(`ipds-sync-${data.fpsId}`, data, {
    jobId: `ipds-sync-${data.fpsId}-${Date.now()}`,
  });
}

async function getIpdsCredentials(dealerId: string): Promise<{ username: string; password: string }> {
  const result = await query(
    `SELECT ipds_username, ipds_password, iv, auth_tag
     FROM dealer_credentials WHERE dealer_id = $1`,
    [dealerId]
  );

  if (!result.rows.length) {
    throw new Error(`No IPDS credentials found for dealer ${dealerId}`);
  }

  const cred = result.rows[0] as DealerCredentialRow;
  const username = decrypt(cred.ipds_username, cred.iv, cred.auth_tag);
  const password = decrypt(cred.ipds_password, cred.iv, cred.auth_tag);

  return { username, password };
}

async function loginToIpds(page: Page, username: string, password: string): Promise<void> {
  // IPDS social audit landing page:
  // https://ipds.gujarat.gov.in/PDS/SocialAudit/Landing.aspx
  // Likely uses ASP.NET WebForms patterns similar to eFPS portal.
  // SELECTORS NEED VERIFICATION via scratch/inspect-ipds.js

  await page.goto('https://ipds.gujarat.gov.in/PDS/SocialAudit/Landing.aspx', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  // Check if already logged in (cookie-based SSO)
  const currentUrl = page.url();
  if (currentUrl.includes('SocialAudit/Landing') || currentUrl.includes('SocialAudit/')) {
    const loginField = await page.$('#txtUser, input[name*="user" i], input[name*="login" i]');
    if (!loginField) {
      logger.info('Already logged in to IPDS portal');
      return;
    }
  }

  // Attempt CAPTCHA solving if present
  const captchaImg = await page.$('img[src*="captcha" i], img[src*="Captcha" i]');
  if (captchaImg) {
    const captchaBuffer = await captchaImg.screenshot();
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(captchaBuffer);
    await worker.terminate();
    const captchaText = text.replace(/[^a-zA-Z0-9]/g, '').trim();
    if (captchaText) {
      const captchaInput = await page.$('input[name*="captcha" i], input[id*="Captcha" i]');
      if (captchaInput) {
        await captchaInput.fill(captchaText);
      }
    }
  }

  // Fill credentials — SELECTORS NEED VERIFICATION
  const usernameInput = await page.$('#txtUser, input[name*="user" i]');
  const passwordInput = await page.$('#txtPassword, input[name*="pass" i], input[type="password"]');

  if (usernameInput) await usernameInput.fill(username);
  if (passwordInput) await passwordInput.fill(password);

  const loginBtn = await page.$('#btnLogin, button[type="submit"], input[type="submit"]');
  if (loginBtn) {
    await loginBtn.click();
    await page.waitForTimeout(3000);
  }

  // Check for login error
  const errorEl = await page.$('.error-message, .alert-danger, #lblMessage, .field-validation-error');
  if (errorEl) {
    const errorText = await errorEl.textContent();
    if (errorText && errorText.trim()) {
      throw new Error(`IPDS login failed: ${errorText}`);
    }
  }
}

async function scrapeSocialAudit(page: Page, _fpsId: string, month?: string, year?: string): Promise<SocialAuditRow[]> {
  // Navigate to social audit data page
  // SELECTORS NEED VERIFICATION via scratch/inspect-ipds.js

  // Try filtering by month/year if parameters provided
  if (month) {
    const monthSelect = await page.$('#ddlMonth, select[name*="month" i], select[id*="Month" i]');
    if (monthSelect) {
      await monthSelect.selectOption(month);
    }
  }
  if (year) {
    const yearSelect = await page.$('#ddlYear, select[name*="year" i], select[id*="Year" i]');
    if (yearSelect) {
      await yearSelect.selectOption(year);
    }
  }

  // Try filtering by FPS code
  const fpsInput = await page.$('#txtFpsCode, #ddlFps, input[name*="fps" i], select[name*="fps" i]');
  if (fpsInput) {
    const tagName = await fpsInput.evaluate(el => el.tagName);
    if (tagName === 'SELECT') {
      await fpsInput.selectOption(_fpsId);
    } else {
      await fpsInput.fill(_fpsId);
    }
  }

  // Look for search/submit button
  const searchBtn = await page.$('#btnSearch, #btnShow, button[type="submit"], input[value*="Show" i], input[value*="Search" i]');
  if (searchBtn) {
    await searchBtn.click();
    await page.waitForTimeout(3000);
  }

  // Wait for result table
  try {
    await page.waitForSelector('table', { timeout: 10000 });
  } catch {
    return [];
  }

  // Extract table data — SELECTORS NEED VERIFICATION
  const rows = await page.$$eval('table[id*="gv" i] tbody tr, .grid tbody tr, table.table tbody tr, table tbody tr', (trs) =>
    trs.map((tr) => {
      const cells = tr.querySelectorAll('td');
      if (cells.length < 4) return null;
      return {
        transactionDate: cells[0]?.textContent?.trim() ?? '',
        rationCardNo: cells[1]?.textContent?.trim() ?? '',
        beneficiaryName: cells[2]?.textContent?.trim() ?? '',
        commodity: cells[3]?.textContent?.trim() ?? '',
        allocatedQuantity: parseFloat(cells[4]?.textContent?.trim()?.replace(/,/g, '') || '0'),
        liftedQuantity: parseFloat(cells[5]?.textContent?.trim()?.replace(/,/g, '') || '0'),
        amountPaid: parseFloat(cells[6]?.textContent?.trim()?.replace(/,/g, '') || '0'),
      };
    })
  );

  return rows.filter((r): r is SocialAuditRow => r !== null && r.rationCardNo.length > 0);
}

function mapSocialAudit(rows: SocialAuditRow[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    ration_card_no: r.rationCardNo,
    beneficiary_name: r.beneficiaryName,
    transaction_date: r.transactionDate,
    commodity: r.commodity,
    allocated_quantity: r.allocatedQuantity,
    lifted_quantity: r.liftedQuantity,
    amount_paid: r.amountPaid,
    source: 'ipds-social-audit',
    version: 1,
  }));
}

export let ipdsSyncWorker: Worker<IpdsSyncPayload> | null = null;

if (config.START_SYNC_WORKER) {
  ipdsSyncWorker = new Worker<IpdsSyncPayload>(
    QUEUE_NAME,
    async (job: Job<IpdsSyncPayload>) => {
      const { dealerId, fpsId, month, year, triggeredBy, syncJobId } = job.data;
      let browser: Browser | null = null;
      const traceId = crypto.randomUUID().slice(0, 8);

      if (syncJobId) {
        await query(
          `UPDATE sync_jobs SET status = 'running', started_at = NOW()
           WHERE id = $1 AND dealer_id = $2 AND status = 'pending'`,
          [syncJobId, dealerId]
        );
      }

      if (ipdsCircuitBreaker.getState() === 'OPEN') {
        const msg = `IPDS portal circuit breaker is OPEN — skipping sync for ${fpsId}.`;
        logger.warn({ dealerId, fpsId, traceId, circuitState: 'OPEN' }, msg);
        if (syncJobId) {
          await query(
            `UPDATE sync_jobs SET status = 'failed', completed_at = NOW(), error_message = $1
             WHERE id = $2 AND dealer_id = $3`,
            [msg, syncJobId, dealerId]
          );
        }
        return { success: false, fpsId, error: msg };
      }

      try {
        let socialAuditRows: SocialAuditRow[];

        if (config.MOCK_GOVT_PORTAL) {
          logger.info({ dealerId, fpsId, traceId }, 'IPDS Portal Mock Mode — generating mock social audit data');

          const targetMonth = month ?? String(new Date().getMonth() + 1).padStart(2, '0');
          const targetYear = year ?? String(new Date().getFullYear());
          const dayStr = '15';
          const datePrefix = `${targetYear}-${targetMonth}-${dayStr}`;

          socialAuditRows = [
            { transactionDate: datePrefix, rationCardNo: `GJ${fpsId}001`, beneficiaryName: 'Arvindbhai Patel', commodity: 'Wheat', allocatedQuantity: 15, liftedQuantity: 15, amountPaid: 30 },
            { transactionDate: datePrefix, rationCardNo: `GJ${fpsId}001`, beneficiaryName: 'Arvindbhai Patel', commodity: 'Rice', allocatedQuantity: 20, liftedQuantity: 18, amountPaid: 54 },
            { transactionDate: datePrefix, rationCardNo: `GJ${fpsId}002`, beneficiaryName: 'Savitaben Shah', commodity: 'Wheat', allocatedQuantity: 10, liftedQuantity: 10, amountPaid: 20 },
            { transactionDate: datePrefix, rationCardNo: `GJ${fpsId}002`, beneficiaryName: 'Savitaben Shah', commodity: 'Sugar', allocatedQuantity: 2, liftedQuantity: 2, amountPaid: 30 },
            { transactionDate: datePrefix, rationCardNo: `GJ${fpsId}003`, beneficiaryName: 'Rajeshbhai Mehta', commodity: 'Rice', allocatedQuantity: 25, liftedQuantity: 20, amountPaid: 60 },
          ];
        } else {
          const { username, password } = await getIpdsCredentials(dealerId);

          browser = await chromium.launch({
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu',
            ],
          });

          socialAuditRows = await ipdsCircuitBreaker.call(async () => {
            const context = await browser!.newContext({
              userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              viewport: { width: 1280, height: 720 },
            });
            const page = await context.newPage();

            await loginToIpds(page, username, password);
            return await scrapeSocialAudit(page, fpsId, month, year);
          });
        }

        if (socialAuditRows.length === 0) {
          logger.warn({ dealerId, fpsId, traceId }, 'No social audit data scraped from IPDS portal');
          if (syncJobId) {
            await query(
              `UPDATE sync_jobs SET status = 'success', completed_at = NOW()
               WHERE id = $1 AND dealer_id = $2`,
              [syncJobId, dealerId]
            );
          }
          return { success: true, fpsId, recordCount: 0 };
        }

        const payload = {
          dealer_id: dealerId,
          sync_job_id: syncJobId,
          sync_mode: 'full',
          workers: [
            {
              type: 'transaction' as const,
              records: mapSocialAudit(socialAuditRows),
            },
          ],
          trace_id: traceId,
          worker_version: '1.0.0',
          website_version: 'ipds-gujarat',
        };

        const response = await fetch(INTERNAL_SYNC_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Token': SERVICE_TOKEN,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Internal sync API returned ${response.status}: ${body}`);
        }

        const apiResult = await response.json() as { data?: { processed: number; quarantined: number; errors?: string[] } };
        const processed = apiResult.data?.processed ?? 0;
        const quarantined = apiResult.data?.quarantined ?? 0;

        if (syncJobId) {
          await query(
            `UPDATE sync_jobs SET status = 'success', completed_at = NOW(), processed_count = $1, quarantined_count = $2
             WHERE id = $3 AND dealer_id = $4`,
            [processed, quarantined, syncJobId, dealerId]
          );
        }

        await query(
          `UPDATE sync_scheduler_config SET last_sync_at = NOW(), next_sync_at = NOW() + (sync_interval_mins || ' minutes')::interval, sync_status = 'success', consecutive_failures = 0 WHERE dealer_id = $1`,
          [dealerId]
        );

        await eventBus.emit(EventTypes.SYNC_COMPLETED, {
          syncType: 'ipds-social-audit',
          entityCount: socialAuditRows.length,
          fpsId,
        } as Record<string, unknown>);

        logger.info({ dealerId, fpsId, recordCount: socialAuditRows.length, processed, quarantined, traceId }, 'IPDS social audit sync completed');

        return {
          success: true,
          fpsId,
          recordCount: socialAuditRows.length,
          processed,
          quarantined,
        };
      } catch (error: any) {
        logger.error({ dealerId, fpsId, error: error.message, traceId, circuitState: ipdsCircuitBreaker.getState() }, 'IPDS sync failed');

        if (syncJobId) {
          await query(
            `UPDATE sync_jobs SET status = 'failed', completed_at = NOW(), error_message = $1
             WHERE id = $2 AND dealer_id = $3`,
            [error.message, syncJobId, dealerId]
          );
        }

        await query(
          `UPDATE sync_scheduler_config SET sync_status = 'failed', consecutive_failures = consecutive_failures + 1 WHERE dealer_id = $1`,
          [dealerId]
        );

        throw error;
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    },
    {
      connection: getBullRedis() as any,
      concurrency: 1,
      limiter: {
        max: 5,
        duration: 60000,
      },
    }
  );

  ipdsSyncWorker.on('completed', (job) => {
    logger.info({ fpsId: job.data.fpsId }, 'IPDS sync worker completed');
  });

  ipdsSyncWorker.on('failed', (job, err) => {
    if (!job) return;
    logger.error({ fpsId: job.data.fpsId, error: err.message }, 'IPDS sync worker failed');
  });
}
