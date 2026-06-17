import { chromium, type Browser } from 'playwright';

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  const b = await getBrowser();
  const context = await b.newContext();
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  const pdf = await page.pdf({
    format: 'A4',
    margin: { top: '20px', bottom: '20px', left: '15px', right: '15px' },
    printBackground: true,
  });
  await context.close();
  return Buffer.from(pdf);
}
