import { Worker, Job, Queue } from 'bullmq';
import { chromium, Browser, Page } from 'playwright';
import { getBullRedis } from '../../config/redis.js';
import { query } from '../../config/database.js';
import { decrypt } from '../../shared/utils/encrypt.js';
import { logger } from '../../shared/utils/logger.js';
import { eventBus, EventTypes } from '../../shared/events/index.js';

const QUEUE_NAME = 'efps-sync';

export interface EfpsSyncPayload {
  dealerId: string;
  fpsId: string;
  triggeredBy: 'registration' | 'scheduled' | 'manual';
}

interface DealerCredentialRow {
  efps_username: string;
  efps_password: string;
  iv: string;
  auth_tag: string;
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
    `SELECT efps_username, efps_password, iv, auth_tag
     FROM dealer_credentials WHERE dealer_id = $1`,
    [dealerId]
  );

  if (!result.rows.length) {
    throw new Error(`No credentials found for dealer ${dealerId}`);
  }

  const cred = result.rows[0] as DealerCredentialRow;
  const username = decrypt(cred.efps_username, cred.iv, cred.auth_tag);
  const password = decrypt(cred.efps_password, cred.iv, cred.auth_tag);

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

async function upsertSyncData(
  dealerId: string,
  beneficiaries: BeneficiaryRow[],
  transactions: TransactionRow[],
  stock: StockRow[],
): Promise<number> {
  let totalRecords = 0;

  for (const b of beneficiaries) {
    await query(
      `INSERT INTO beneficiaries
         (dealer_id, ration_card_no, head_of_family, member_count, category, mobile, synced_from_gov)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       ON CONFLICT (ration_card_no) DO UPDATE SET
         head_of_family = EXCLUDED.head_of_family,
         member_count = EXCLUDED.member_count,
         category = EXCLUDED.category,
         mobile = EXCLUDED.mobile,
         updated_at = NOW()`,
      [dealerId, b.rationCardNo, b.headOfFamily, b.memberCount, b.category, b.mobile]
    );
    totalRecords++;
  }

  for (const t of transactions) {
    await query(
      `INSERT INTO transactions
         (dealer_id, beneficiary_id, transaction_date, month, commodity, quantity_kg, price_per_kg, total_amount, mode, synced_from_gov)
       VALUES ($1,
         (SELECT id FROM beneficiaries WHERE ration_card_no = $2 LIMIT 1),
         $3, date_trunc('month', $3::date)::date, $4, $5, $6, $7, $8, TRUE)
       ON CONFLICT DO NOTHING`,
      [
        dealerId,
        t.beneficiaryRationCard,
        t.transactionDate,
        t.commodity,
        t.quantityKg,
        t.pricePerKg,
        t.totalAmount,
        t.mode,
      ]
    );
    totalRecords++;
  }

  for (const s of stock) {
    const monthDate = s.month
      ? new Date(s.month).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    await query(
      `INSERT INTO stock_allocations (dealer_id, month, commodity, allocated_kg, lifted_kg)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (dealer_id, month, commodity) DO UPDATE SET
         allocated_kg = EXCLUDED.allocated_kg,
         lifted_kg = EXCLUDED.lifted_kg,
         updated_at = NOW()`,
      [dealerId, monthDate, s.commodity, s.allocatedKg, s.liftedKg]
    );
    totalRecords++;
  }

  return totalRecords;
}

async function markJobStatus(dealerId: string, status: string, _errorMessage?: string) {
  if (status === 'running') {
    await query(
      `UPDATE sync_jobs SET status = 'running', started_at = NOW()
       WHERE dealer_id = $1 AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [dealerId]
    );
  }
}

export const efpsSyncWorker = new Worker<EfpsSyncPayload>(
  QUEUE_NAME,
  async (job: Job<EfpsSyncPayload>) => {
    const { dealerId, fpsId } = job.data;
    let browser: Browser | null = null;

    await markJobStatus(dealerId, 'running');

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

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        viewport: { width: 1280, height: 720 },
      });

      const page = await context.newPage();

      await loginToEfps(page, username, password);

      const [beneficiaries, transactions, stockData] = await Promise.all([
        scrapeBeneficiaries(page),
        scrapeTransactions(page),
        scrapeStockAllocations(page),
      ]);

      const recordCount = await upsertSyncData(dealerId, beneficiaries, transactions, stockData);

      await query(
        `UPDATE sync_jobs
         SET status = 'success', completed_at = NOW(), records_synced = $2
         WHERE dealer_id = $1 AND status = 'running'`,
        [dealerId, recordCount]
      );

      await query(
        `UPDATE dealers SET last_sync_at = NOW() WHERE id = $1`,
        [dealerId]
      );

      await query(
        `UPDATE sync_scheduler_config
         SET last_sync_at = NOW(), next_sync_at = NOW() + (sync_interval_mins || ' minutes')::interval,
             sync_status = 'success', consecutive_failures = 0
         WHERE dealer_id = $1`,
        [dealerId]
      );

      await eventBus.emit(EventTypes.SYNC_COMPLETED, {
        syncType: 'efps-govt',
        entityCount: recordCount,
        fpsId,
      } as Record<string, unknown>);

      logger.info({ dealerId, fpsId, recordCount }, 'eFPS Playwright sync completed');

      return { success: true, fpsId, recordCount, beneficiaries: beneficiaries.length, transactions: transactions.length, stock: stockData.length };
    } catch (error: any) {
      logger.error({ dealerId, fpsId, error: error.message }, 'eFPS Playwright sync failed');

      await query(
        `UPDATE sync_jobs
         SET status = 'failed', completed_at = NOW(), error_message = $2
         WHERE dealer_id = $1 AND status = 'running'`,
        [dealerId, error.message]
      );

      await query(
        `UPDATE sync_scheduler_config
         SET sync_status = 'failed', consecutive_failures = consecutive_failures + 1
         WHERE dealer_id = $1`,
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
