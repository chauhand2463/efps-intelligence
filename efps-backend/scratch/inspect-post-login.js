import { chromium } from 'playwright';
import { createWorker } from 'tesseract.js';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = 'C:\\Users\\chauh\\.gemini\\antigravity\\brain\\89a5bc5c-5b8f-4da1-bbc7-7214940f7ea1';

const PAGES = [
  { name: 'beneficiaries', url: 'https://efps.gujarat.gov.in/Beneficiary/BeneficiaryList' },
  { name: 'transactions', url: 'https://efps.gujarat.gov.in/Transaction/TransactionList' },
  { name: 'stock', url: 'https://efps.gujarat.gov.in/Stock/AllocationView' },
  { name: 'dashboard', url: 'https://efps.gujarat.gov.in/Dashboard' },
];

async function login(page, username, password) {
  console.log('Navigating to login page...');
  await page.goto('https://efps.gujarat.gov.in/loginroutingmanager/Login', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  const captchaImg = await page.$('img[src*="GetCaptchaImage"]');
  if (!captchaImg) throw new Error('CAPTCHA image not found');
  const captchaBuffer = await captchaImg.screenshot();

  console.log('Solving CAPTCHA via Tesseract OCR...');
  const worker = await createWorker('eng');
  const { data: { text } } = await worker.recognize(captchaBuffer);
  await worker.terminate();
  const captchaText = text.replace(/[^a-zA-Z0-9]/g, '').trim();
  console.log('CAPTCHA text:', captchaText);

  await page.fill('input#txtuser', username);
  await page.fill('input#txtpass', password);
  await page.fill('input[name="clientCaptcha"]', captchaText);
  await page.click('button#btnlogin');

  await page.waitForURL(
    (url) => !url.pathname.toLowerCase().includes('/login'),
    { timeout: 15000 }
  );

  console.log('Login successful. Post-login URL:', page.url());
}

async function inspectPostLoginPage(page, name, url) {
  console.log(`\n=== Inspecting ${name} page: ${url} ===`);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`  Loaded: ${page.url()}`);

    // Take screenshot
    const screenshotPath = path.join(OUTPUT_DIR, `efps_${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  Screenshot saved: ${screenshotPath}`);

    // Dump page title
    const title = await page.title();
    console.log(`  Page title: "${title}"`);

    // Dump ALL interactive elements (inputs, buttons, selects, tables, links)
    const elements = await page.evaluate(() => {
      const els = document.querySelectorAll('input, button, select, a, table, form, label, h1, h2, h3, .grid, .table, [class*="table"], [class*="grid"], [class*="list"], [class*="data"], [id*="grid"], [id*="table"], [id*="list"]');
      return Array.from(els).slice(0, 200).map(el => ({
        tag: el.tagName,
        id: el.id,
        name: el.getAttribute('name'),
        type: el.getAttribute('type'),
        class: el.className?.slice(0, 100),
        href: el.getAttribute('href'),
        text: (el.textContent || '').trim().slice(0, 80),
        action: el.getAttribute('action'),
      }));
    });
    console.log(`  Elements (first 200):\n${JSON.stringify(elements, null, 2)}`);

    // Dump table structure if any table exists
    const tableCount = await page.evaluate(() => document.querySelectorAll('table').length);
    console.log(`  Tables found: ${tableCount}`);

    if (tableCount > 0) {
      for (let i = 0; i < Math.min(tableCount, 3); i++) {
        const tableHtml = await page.evaluate((idx) => {
          const t = document.querySelectorAll('table')[idx];
          if (!t) return '';
          // Get header row and first 3 data rows
          const thead = t.querySelector('thead');
          const tbody = t.querySelector('tbody');
          let html = '';
          if (thead) html += '<thead>' + thead.innerHTML + '</thead>';
          if (tbody) {
            const rows = Array.from(tbody.querySelectorAll('tr')).slice(0, 3);
            html += '<tbody>' + rows.map(r => r.outerHTML).join('') + '</tbody>';
          }
          return html;
        }, i);
        console.log(`  Table #${i + 1} HTML:\n${tableHtml.slice(0, 2000)}`);
      }
    }

    // Dump page source for forms/ASPNET patterns
    const aspNetInfo = await page.evaluate(() => {
      const viewstate = document.querySelector('input[name="__VIEWSTATE"]');
      const viewstateGen = document.querySelector('input[name="__VIEWSTATEGENERATOR"]');
      const eventValidation = document.querySelector('input[name="__EVENTVALIDATION"]');
      return {
        hasForm: !!document.querySelector('form'),
        viewstate: viewstate ? viewstate.value?.slice(0, 50) : null,
        viewstateGenerator: viewstateGen ? viewstateGen.value?.slice(0, 20) : null,
        eventValidation: eventValidation ? eventValidation.value?.slice(0, 50) : null,
        forms: Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          name: f.name,
          action: f.action,
          method: f.method,
        })),
      };
    });
    console.log(`  ASP.NET info:\n${JSON.stringify(aspNetInfo, null, 2)}`);

  } catch (err) {
    console.error(`  FAILED to inspect ${name}: ${err.message}`);
  }
}

async function run() {
  const username = process.env.EFPS_USERNAME;
  const password = process.env.EFPS_PASSWORD;

  if (!username || !password) {
    console.error('Set EFPS_USERNAME and EFPS_PASSWORD environment variables.');
    console.error('Usage: $env:EFPS_USERNAME="your_username"; $env:EFPS_PASSWORD="your_pass"; npx tsx scratch/inspect-post-login.js');
    process.exit(1);
  }

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  try {
    await login(page, username, password);

    for (const p of PAGES) {
      await inspectPostLoginPage(page, p.name, p.url);
    }

    console.log('\n=== All pages inspected ===');
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await browser.close();
  }
}

run();
