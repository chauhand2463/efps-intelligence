/**
 * Standalone Playwright scraper for Gujarat eFPS portal.
 *
 * USAGE:
 *   npx tsx src/scraper/govt-efps-scraper.ts --fps-id=6124 --password=Temp@1234 --output=./downloads
 *
 * REQUIREMENTS:
 *   - Playwright installed (npx playwright install chromium)
 *   - No Mantra biometric hardware required (uses manual login path)
 *
 * The script logs into the Gujarat eFPS portal, navigates to the reports
 * section, and downloads the beneficiary/transaction Excel file.
 *
 * IMPORTANT: This is a decoupled fallback. The primary sync mechanism is
 * manual Excel/CSV upload via the /sync/import/transactions endpoint.
 */

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

// ── Configuration ────────────────────────────────────────
const EFPS_BASE = process.env.EFPS_BASE_URL || 'https://www.efps.gujarat.gov.in';
const DOWNLOAD_TIMEOUT = 60_000; // 60s max for downloads

interface ScraperOptions {
  fpsId: string;
  password: string;
  outputDir: string;
  headless?: boolean;
  reportType?: 'beneficiary' | 'transaction' | 'stock';
  month?: string;  // YYYY-MM
}

interface ScraperResult {
  success: boolean;
  downloadedFile: string | null;
  recordCount: number;
  elapsedSeconds: number;
  error?: string;
}

// ── Scraper Engine ───────────────────────────────────────
export class GovtEfpsScraper {
  private options: ScraperOptions;

  constructor(options: ScraperOptions) {
    this.options = {
      headless: true,
      reportType: 'transaction',
      ...options,
    };
    if (!this.options.month) {
      const d = new Date();
      this.options.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  async run(): Promise<ScraperResult> {
    const startTime = Date.now();
    const browser = await chromium.launch({
      headless: this.options.headless,
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
    });

    try {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1366, height: 768 },
        locale: 'en-IN',
        timezoneId: 'Asia/Kolkata',
        acceptDownloads: true,
      });

      const page = await context.newPage();

      // Set download handler
      let downloadedFilePath: string | null = null;
      page.on('download', async (download) => {
        const ext = path.extname(download.suggestedFilename()) || '.xlsx';
        const safeName = `efps_${this.options.reportType}_${this.options.month}_${Date.now()}${ext}`;
        const filePath = path.join(this.options.outputDir!, safeName);
        await download.saveAs(filePath);
        downloadedFilePath = filePath;
        console.log(`[Scraper] Downloaded: ${filePath}`);
      });

      // ── Step 1: Navigate to login ──
      console.log('[Scraper] Navigating to eFPS portal...');
      await page.goto(`${EFPS_BASE}/login.aspx`, { waitUntil: 'networkidle', timeout: 30_000 });

      // ── Step 2: Login ──
      console.log('[Scraper] Logging in...');
      await page.fill('input[name*="txtUserId"], input[name*="username"], input#txtUserId', this.options.fpsId);
      await page.fill('input[name*="txtPassword"], input[name*="password"], input#txtPassword', this.options.password);

      // Click login button
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {}),
        page.click('input[type="submit"], button[type="submit"], input#btnLogin, button#btnLogin').catch(async () => {
          // Fallback: press Enter
          await page.keyboard.press('Enter');
        }),
      ]);

      // ── Step 3: Check for biometric redirect ──
      const pageUrl = page.url().toLowerCase();
      if (pageUrl.includes('biometric') || pageUrl.includes('aadhaar') || pageUrl.includes('finger')) {
        console.warn('[Scraper] Biometric authentication required. Manual intervention needed.');
        return {
          success: false,
          downloadedFile: null,
          recordCount: 0,
          elapsedSeconds: (Date.now() - startTime) / 1000,
          error: 'BIOMETRIC_REQUIRED: eFPS portal mandates Mantra biometric second-factor auth. Cannot scrape programmatically.',
        };
      }

      // ── Step 4: Navigate to reports ──
      const reportPaths: Record<string, string> = {
        beneficiary: '/Reports/BeneficiaryReport.aspx',
        transaction: '/Reports/TransactionReport.aspx',
        stock: '/Reports/StockReport.aspx',
      };

      const reportPath = reportPaths[this.options.reportType!] || reportPaths.transaction;
      console.log(`[Scraper] Navigating to ${reportPath}...`);
      await page.goto(`${EFPS_BASE}${reportPath}`, { waitUntil: 'networkidle', timeout: 30_000 }).catch(async () => {
        // Try clicking navigation links instead
        const linkSelectors = [
          `a[href*="Report"]`, `a[href*="report"]`,
          `span:has-text("Report")`, `a:has-text("Report")`,
        ];
        for (const sel of linkSelectors) {
          const link = await page.$(sel);
          if (link) {
            await link.click();
            await page.waitForTimeout(3000);
            break;
          }
        }
      });

      // ── Step 5: Fill month filter ──
      const [year, monthNum] = (this.options.month || '').split('-');
      const monthSelectors = [
        'select[name*="ddlMonth"]', 'select#ddlMonth', 'select[name*="Month"]',
        'select[name*="ddlYear"]', 'select#ddlYear', 'select[name*="Year"]',
      ];

      for (const sel of monthSelectors) {
        const el = await page.$(sel);
        if (el) {
          const value = await el.getAttribute('value');
          const optVal = sel.includes('Month') ? String(parseInt(monthNum || '1', 10)) : year;
          try {
            await el.selectOption(String(optVal));
            console.log(`[Scraper] Set ${sel} = ${optVal}`);
          } catch {
            // try by label
          }
        }
      }

      // ── Step 6: Set format and export ──
      // Try to find export/Excel button
      const exportSelectors = [
        'input[value*="Excel"]', 'input[value*="excel"]',
        'a:has-text("Excel")', 'a:has-text("excel")',
        'input[value*="Export"]', 'button:has-text("Export")',
        'input[src*="excel"]', 'img[alt*="excel"]',
      ];

      let exported = false;
      for (const sel of exportSelectors) {
        const btn = await page.$(sel);
        if (btn) {
          await Promise.all([
            page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT }).catch(() => {}),
            btn.click(),
          ]);
          exported = true;
          console.log(`[Scraper] Export clicked via "${sel}"`);
          break;
        }
      }

      if (!exported) {
        // Fallback: render table and screenshot
        console.log('[Scraper] No export button found. Saving page screenshot.');
        const screenshotPath = path.join(this.options.outputDir!, `efps_screenshot_${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        downloadedFilePath = screenshotPath;
      }

      // ── Step 7: Wait for download to complete ──
      await page.waitForTimeout(5000);

      const elapsed = (Date.now() - startTime) / 1000;

      if (downloadedFilePath && fs.existsSync(downloadedFilePath)) {
        const stats = fs.statSync(downloadedFilePath);
        console.log(`[Scraper] Done in ${elapsed.toFixed(1)}s. File: ${downloadedFilePath} (${(stats.size / 1024).toFixed(1)} KB)`);
        return {
          success: true,
          downloadedFile: downloadedFilePath,
          recordCount: 0,
          elapsedSeconds: elapsed,
        };
      }

      return {
        success: true,
        downloadedFile: null,
        recordCount: 0,
        elapsedSeconds: elapsed,
        error: 'No file was downloaded. Check portal UI changes.',
      };

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Scraper] Error: ${msg}`);
      return {
        success: false,
        downloadedFile: null,
        recordCount: 0,
        elapsedSeconds: (Date.now() - startTime) / 1000,
        error: msg,
      };
    } finally {
      await browser.close();
    }
  }
}

// ── API-friendly function (called from Node backend) ─────
export async function triggerScraperDownload(options: {
  fpsId: string;
  efpsPassword: string;
  outputDir: string;
  reportType?: 'beneficiary' | 'transaction' | 'stock';
}): Promise<ScraperResult> {
  const scraper = new GovtEfpsScraper({
    fpsId: options.fpsId,
    password: options.efpsPassword,
    outputDir: options.outputDir,
    reportType: options.reportType,
  });
  return scraper.run();
}

// ── CLI entry point ──────────────────────────────────────
// Usage: npx tsx src/scraper/govt-efps-scraper.ts --fps-id=6124 --password=Temp@1234
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('govt-efps-scraper.ts')) {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const [k, v] = arg.replace(/^--/, '').split('=');
    if (k) args[k.replace(/-/g, '')] = v ?? 'true';
  }

  if (!args.fpsid || !args.password) {
    console.error('Usage: npx tsx src/scraper/govt-efps-scraper.ts --fps-id=6124 --password=Temp@1234 [--output=./downloads] [--report=transaction] [--month=2025-06] [--headed]');
    process.exit(1);
  }

  const outputDir = args.output || './downloads';
  fs.mkdirSync(outputDir, { recursive: true });

  const scraper = new GovtEfpsScraper({
    fpsId: args.fpsid,
    password: args.password,
    outputDir,
    reportType: (args.report || 'transaction') as any,
    month: args.month || new Date().toISOString().slice(0, 7),
    headless: args.headed !== 'true',
  });

  scraper.run().then(result => {
    if (result.success && result.downloadedFile) {
      const hash = createHash('sha256').update(fs.readFileSync(result.downloadedFile)).digest('hex');
      console.log(`\nDownload successful`);
      console.log(`   File : ${result.downloadedFile}`);
      console.log(`   SHA256: ${hash}`);
      console.log(`   Time : ${result.elapsedSeconds.toFixed(1)}s`);
      process.exit(0);
    } else {
      console.error(`\nDownload failed: ${result.error}`);
      process.exit(1);
    }
  }).catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}

export default GovtEfpsScraper;
