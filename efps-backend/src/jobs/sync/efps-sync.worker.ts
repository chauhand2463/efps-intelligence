import { Worker, Job, Queue } from 'bullmq';
import { chromium, Browser, Page } from 'playwright';
import { getBullRedis } from '../../config/redis.js';
import { query } from '../../config/database.js';
import { decrypt } from '../../shared/utils/encrypt.js';
import { logger } from '../../shared/utils/logger.js';
import { eventBus, EventTypes } from '../../shared/events/index.js';
import { CircuitBreaker } from '../../shared/utils/circuit-breaker.js';
import crypto from 'crypto';

const QUEUE_NAME = 'efps-sync';
const INTERNAL_SYNC_URL = process.env.INTERNAL_SYNC_URL || 'http://localhost:3000/api/internal/sync';
const SERVICE_TOKEN = process.env.INTERNAL_SYNC_SECRET || process.env.INTERNAL_SERVICE_TOKEN || '';

const efpsCircuitBreaker = new CircuitBreaker('efps-portal', {
  failureThreshold: 3,
  resetTimeoutMs: 60_000,
});

export interface EfpsSyncPayload {
  dealerId: string;
  fpsId: string;
  triggeredBy: 'registration' | 'scheduled' | 'manual';
  syncMode?: 'full' | 'incremental' | 'priority';
  syncJobId?: string;
}

interface DealerCredentialRow {
  efps_username: string;
  efps_password: string;
  iv: string;
  auth_tag: string;
  iv_efps_password: string;
  auth_tag_efps_password: string;
}

interface BeneficiaryRow {
  rationCardNo: string;
  headOfFamily: string;
  memberCount: number;
  category: string;
  mobile: string;
}

interface TransactionRow {
  transactionDate: string;
  commodity: string;
  quantityKg: number;
  pricePerKg: number;
  totalAmount: number;
  beneficiaryRationCard: string;
  mode: string;
}

interface StockRow {
  commodity: string;
  allocatedKg: number;
  liftedKg: number;
  month: string;
}

export const efpsSyncQueue = new Queue<EfpsSyncPayload>(QUEUE_NAME, {
  connection: getBullRedis() as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export async function enqueueEfpsSync(data: EfpsSyncPayload) {
  return efpsSyncQueue.add(`sync-${data.fpsId}`, data, {
    jobId: `efps-sync-${data.fpsId}-${Date.now()}`,
  });
}

async function getCredentials(dealerId: string): Promise<{ username: string; password: string }> {
  const result = await query(
    `SELECT efps_username, efps_password, iv, auth_tag, iv_efps_password, auth_tag_efps_password
     FROM dealer_credentials WHERE dealer_id = $1`,
    [dealerId]
  );

  if (!result.rows.length) {
    throw new Error(`No credentials found for dealer ${dealerId}`);
  }

  const cred = result.rows[0] as DealerCredentialRow;

  const passwordIv = cred.iv_efps_password || cred.iv;
  const passwordAuthTag = cred.auth_tag_efps_password || cred.auth_tag;

  const username = decrypt(cred.efps_username, cred.iv, cred.auth_tag);
  const password = decrypt(cred.efps_password, passwordIv, passwordAuthTag);

  return { username, password };
}

async function loginToEfps(page: Page, username: string, password: string): Promise<void> {
  await page.goto('https://efps.gujarat.gov.in/loginroutingmanager/Login', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  const errorEl = await page.$('.error-message, .alert-danger');
  if (errorEl) {
    const errorText = await errorEl.textContent();
    throw new Error(`eFPS login failed: ${errorText}`);
  }
}

async function scrapeBeneficiaries(page: Page): Promise<BeneficiaryRow[]> {
  await page.goto('https://efps.gujarat.gov.in/Beneficiary/BeneficiaryList', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  try {
    await page.waitForSelector('table', { timeout: 10000 });
  } catch {
    return [];
  }

  const rows = await page.$$eval('table tbody tr', (trs) =>
    trs.map((tr) => {
      const cells = tr.querySelectorAll('td');
      return {
        rationCardNo: cells[0]?.textContent?.trim() ?? '',
        headOfFamily: cells[1]?.textContent?.trim() ?? '',
        memberCount: parseInt(cells[2]?.textContent?.trim() || '0', 10),
        category: cells[3]?.textContent?.trim() ?? '',
        mobile: cells[4]?.textContent?.trim() ?? '',
      };
    })
  );

  return rows.filter((r) => r.rationCardNo.length > 0);
}

async function scrapeTransactions(page: Page): Promise<TransactionRow[]> {
  try {
    await page.goto('https://efps.gujarat.gov.in/Transaction/TransactionList', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('table', { timeout: 10000 });

    const rows = await page.$$eval('table tbody tr', (trs) =>
      trs.map((tr) => {
        const cells = tr.querySelectorAll('td');
        return {
          transactionDate: cells[0]?.textContent?.trim() ?? '',
          commodity: cells[1]?.textContent?.trim() ?? '',
          quantityKg: parseFloat(cells[2]?.textContent?.trim() || '0'),
          pricePerKg: parseFloat(cells[3]?.textContent?.trim() || '0'),
          totalAmount: parseFloat(cells[4]?.textContent?.trim() || '0'),
          beneficiaryRationCard: cells[5]?.textContent?.trim() ?? '',
          mode: cells[6]?.textContent?.trim() ?? 'pos',
        };
      })
    );

    return rows.filter((r) => r.transactionDate.length > 0);
  } catch {
    return [];
  }
}

async function scrapeStockAllocations(page: Page): Promise<StockRow[]> {
  try {
    await page.goto('https://efps.gujarat.gov.in/Stock/AllocationView', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('table', { timeout: 10000 });

    const rows = await page.$$eval('table tbody tr', (trs) =>
      trs.map((tr) => {
        const cells = tr.querySelectorAll('td');
        return {
          commodity: cells[0]?.textContent?.trim() ?? '',
          allocatedKg: parseFloat(cells[1]?.textContent?.trim() || '0'),
          liftedKg: parseFloat(cells[2]?.textContent?.trim() || '0'),
          month: cells[3]?.textContent?.trim() ?? '',
        };
      })
    );

    return rows.filter((r) => r.commodity.length > 0);
  } catch {
    return [];
  }
}

function mapBeneficiaries(rows: BeneficiaryRow[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    ration_card_no: r.rationCardNo,
    beneficiary_name: r.headOfFamily,
    category: r.category,
    mobile_no: r.mobile,
    status: 'active',
    version: 1,
  }));
}

function mapTransactions(rows: TransactionRow[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    ration_card_no: r.beneficiaryRationCard,
    transaction_date: r.transactionDate,
    commodity: r.commodity,
    allocated_quantity: r.quantityKg,
    lifted_quantity: r.quantityKg,
    amount_paid: r.totalAmount,
    version: 1,
  }));
}

function mapStockAllocations(rows: StockRow[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    commodity: r.commodity,
    allocated_quantity: r.allocatedKg,
    lifted_quantity: r.liftedKg,
    month: r.month,
    version: 1,
  }));
}

async function postToInternalApi(
  dealerId: string,
  syncJobId: string | undefined,
  syncMode: string,
  workers: { type: string; records: Record<string, unknown>[] }[],
  traceId: string
): Promise<{ processed: number; quarantined: number; errors?: string[] }> {
  const payload = {
    dealer_id: dealerId,
    sync_job_id: syncJobId,
    sync_mode: syncMode,
    workers,
    trace_id: traceId,
    worker_version: '2.0.0',
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

  const result = await response.json() as { data?: { processed: number; quarantined: number; errors?: string[] } };
  return result.data ?? { processed: 0, quarantined: 0 };
}

async function markJobStatus(syncJobId: string | undefined, dealerId: string, status: string, errorMessage?: string) {
  if (!syncJobId) return;
  if (status === 'running') {
    await query(
      `UPDATE sync_jobs SET status = 'running', started_at = NOW()
       WHERE id = $1 AND dealer_id = $2 AND status = 'pending'`,
      [syncJobId, dealerId]
    );
  }
  if (status === 'success') {
    await query(
      `UPDATE sync_jobs SET status = 'success', completed_at = NOW()
       WHERE id = $1 AND dealer_id = $2 AND status = 'running'`,
      [syncJobId, dealerId]
    );
  }
  if (status === 'failed' && errorMessage) {
    await query(
      `UPDATE sync_jobs SET status = 'failed', completed_at = NOW(), error_message = $2
       WHERE id = $1 AND dealer_id = $3 AND status = 'running'`,
      [syncJobId, errorMessage, dealerId]
    );
  }
}

export const efpsSyncWorker = new Worker<EfpsSyncPayload>(
  QUEUE_NAME,
  async (job: Job<EfpsSyncPayload>) => {
    const { dealerId, fpsId, triggeredBy, syncMode, syncJobId } = job.data;
    let browser: Browser | null = null;
    const traceId = crypto.randomUUID().slice(0, 8);

    await markJobStatus(syncJobId, dealerId, 'running');

    // Fast-fail if circuit breaker is open
    if (efpsCircuitBreaker.getState() === 'OPEN') {
      const msg = `eFPS portal circuit breaker is OPEN — portal may be down. Skipping sync for ${fpsId}.`;
      logger.warn({ dealerId, fpsId, traceId, circuitState: 'OPEN' }, msg);
      await markJobStatus(syncJobId, dealerId, 'failed', msg);
      await query(
        `UPDATE sync_scheduler_config SET sync_status = 'failed' WHERE dealer_id = $1`,
        [dealerId]
      );
      return { success: false, fpsId, error: msg };
    }

    try {
      const { username, password } = await getCredentials(dealerId);

      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const scrapeResult = await efpsCircuitBreaker.call(async () => {
        const context = await browser!.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          viewport: { width: 1280, height: 720 },
        });

        const page = await context.newPage();

        await loginToEfps(page, username, password);

        const [beneficiaryRows, transactionRows, stockRows] = await Promise.all([
          scrapeBeneficiaries(page),
          scrapeTransactions(page),
          scrapeStockAllocations(page),
        ]);

        return { beneficiaryRows, transactionRows, stockRows };
      });

      const { beneficiaryRows, transactionRows, stockRows } = scrapeResult;

      const workers: { type: string; records: Record<string, unknown>[] }[] = [];
      if (beneficiaryRows.length > 0) {
        workers.push({ type: 'beneficiary', records: mapBeneficiaries(beneficiaryRows) });
      }
      if (transactionRows.length > 0) {
        workers.push({ type: 'transaction', records: mapTransactions(transactionRows) });
      }
      if (stockRows.length > 0) {
        workers.push({ type: 'stock_allocation', records: mapStockAllocations(stockRows) });
      }

      if (workers.length === 0) {
        logger.warn({ dealerId, fpsId, traceId }, 'No data scraped from eFPS portal');
        await Promise.all([
          markJobStatus(syncJobId, dealerId, 'success'),
          query(`UPDATE dealers SET last_sync_at = NOW() WHERE id = $1`, [dealerId]),
          query(
            `UPDATE sync_scheduler_config SET last_sync_at = NOW(), next_sync_at = NOW() + (sync_interval_mins || ' minutes')::interval, sync_status = 'success', consecutive_failures = 0 WHERE dealer_id = $1`,
            [dealerId]
          ),
        ]);
        return { success: true, fpsId, recordCount: 0, beneficiaries: 0, transactions: 0, stock: 0 };
      }

      const apiResult = await postToInternalApi(
        dealerId,
        syncJobId,
        syncMode ?? 'full',
        workers,
        traceId
      );

      const recordCount = apiResult.processed + apiResult.quarantined;

      await Promise.all([
        markJobStatus(syncJobId, dealerId, 'success'),
        query(`UPDATE dealers SET last_sync_at = NOW() WHERE id = $1`, [dealerId]),
        query(
          `UPDATE sync_scheduler_config SET last_sync_at = NOW(), next_sync_at = NOW() + (sync_interval_mins || ' minutes')::interval, sync_status = 'success', consecutive_failures = 0 WHERE dealer_id = $1`,
          [dealerId]
        ),
      ]);

      await eventBus.emit(EventTypes.SYNC_COMPLETED, {
        syncType: 'efps-govt',
        entityCount: recordCount,
        fpsId,
      } as Record<string, unknown>);

      logger.info({ dealerId, fpsId, recordCount, traceId, processed: apiResult.processed, quarantined: apiResult.quarantined }, 'eFPS Playwright sync completed via Internal API');

      return {
        success: true,
        fpsId,
        recordCount,
        processed: apiResult.processed,
        quarantined: apiResult.quarantined,
        beneficiaries: beneficiaryRows.length,
        transactions: transactionRows.length,
        stock: stockRows.length,
      };
    } catch (error: any) {
      logger.error({ dealerId, fpsId, error: error.message, traceId, circuitState: efpsCircuitBreaker.getState() }, 'eFPS Playwright sync failed');

      await markJobStatus(syncJobId, dealerId, 'failed', error.message);

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
      max: 10,
      duration: 60000,
    },
  }
);

efpsSyncWorker.on('completed', (job) => {
  logger.info({ fpsId: job.data.fpsId }, 'eFPS sync worker completed');
});

efpsSyncWorker.on('failed', (job, err) => {
  if (!job) return;
  logger.error({ fpsId: job.data.fpsId, error: err.message }, 'eFPS sync worker failed');
});
