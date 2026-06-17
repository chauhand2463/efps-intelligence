import { chromium } from 'playwright';
import { createWorker } from 'tesseract.js';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = 'C:\\Users\\chauh\\.gemini\\antigravity\\brain\\89a5bc5c-5b8f-4da1-bbc7-7214940f7ea1';

async function run() {
  const username = process.env.IPDS_USERNAME;
  const password = process.env.IPDS_PASSWORD;

  if (!username || !password) {
    console.error('Set IPDS_USERNAME and IPDS_PASSWORD environment variables.');
    process.exit(1);
  }

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Step 1: Navigate to IPDS Social Audit landing page
    console.log('Navigating to IPDS Social Audit...');
    await page.goto('https://ipds.gujarat.gov.in/PDS/SocialAudit/Landing.aspx', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    console.log('Current URL:', page.url());

    // Take screenshot of login/landing
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'ipds_landing.png'), fullPage: true });
    console.log('Screenshot saved');

    // Dump ALL interactive elements
    const elements = await page.evaluate(() => {
      const els = document.querySelectorAll('input, button, select, a, table, form, label, img, h1, h2, h3');
      return Array.from(els).slice(0, 300).map(el => ({
        tag: el.tagName,
        id: el.id,
        name: el.getAttribute('name'),
        type: el.getAttribute('type'),
        class: (el.className || '').toString().slice(0, 80),
        href: el.getAttribute('href'),
        src: el.getAttribute('src'),
        placeholder: el.getAttribute('placeholder'),
        text: (el.textContent || '').trim().slice(0, 80),
        action: el.getAttribute('action'),
        value: el.getAttribute('value')?.slice(0, 30),
      }));
    });
    console.log(`Interactive elements (${elements.length}):\n${JSON.stringify(elements, null, 2)}`);

    // Step 2: Check for ASP.NET WebForms patterns
    const aspNetInfo = await page.evaluate(() => {
      const form = document.querySelector('form');
      return {
        hasForm: !!form,
        formAction: form?.getAttribute('action'),
        formMethod: form?.method,
        viewstate: document.querySelector('input[name="__VIEWSTATE"]')?.getAttribute('value')?.slice(0, 40),
        viewstateGen: document.querySelector('input[name="__VIEWSTATEGENERATOR"]')?.getAttribute('value')?.slice(0, 20),
        eventValidation: document.querySelector('input[name="__EVENTVALIDATION"]')?.getAttribute('value')?.slice(0, 40),
        requestVerificationToken: document.querySelector('input[name="__RequestVerificationToken"]')?.getAttribute('value')?.slice(0, 20),
        captchaImg: document.querySelector('img[src*="captcha" i], img[src*="Captcha" i], img[src*="CAPTCHA" i]')?.getAttribute('src'),
      };
    });
    console.log(`ASP.NET info:\n${JSON.stringify(aspNetInfo, null, 2)}`);

    // Step 3: Check for dropdown options (district, taluka, month)
    const selects = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('select')).map(s => ({
        id: s.id,
        name: s.name,
        options: Array.from(s.querySelectorAll('option')).slice(0, 10).map(o => ({
          value: o.value?.slice(0, 40),
          text: (o.textContent || '').trim().slice(0, 40),
        })),
      }));
    });
    console.log(`Select elements:\n${JSON.stringify(selects, null, 2)}`);

    // Step 4: Check for table structure
    const tableInfo = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      return Array.from(tables).slice(0, 3).map((t, i) => {
        const headers = t.querySelectorAll('th');
        const rows = t.querySelectorAll('tr');
        return {
          index: i,
          id: t.id,
          class: t.className?.toString().slice(0, 80),
          thCount: headers.length,
          headers: Array.from(headers).map(h => (h.textContent || '').trim().slice(0, 30)),
          trCount: rows.length,
          sampleRow: rows[1] ? Array.from(rows[1].querySelectorAll('td, th')).map(c => (c.textContent || '').trim().slice(0, 30)) : [],
        };
      });
    });
    console.log(`Table info:\n${JSON.stringify(tableInfo, null, 2)}`);

    // Step 5: Try logging in if login form detected
    const loginInputs = elements.filter(e =>
      (e.type === 'text' && e.id?.toLowerCase().includes('user')) ||
      (e.type === 'password') ||
      (e.type === 'submit' && (e.text?.toLowerCase().includes('login') || e.value?.toLowerCase().includes('login')))
    );
    console.log(`\nPotential login inputs:\n${JSON.stringify(loginInputs, null, 2)}`);

    // Dump full HTML of <main>, <form>, or body for complete analysis
    const bodyHtml = await page.evaluate(() => {
      const main = document.querySelector('main') || document.querySelector('form') || document.body;
      return main ? main.innerHTML.slice(0, 8000) : '';
    });
    console.log(`\nPage body HTML (first 8000 chars):\n${bodyHtml}`);

  } catch (err) {
    console.error('Error during IPDS inspection:', err);
  } finally {
    await browser.close();
  }
}

run();
