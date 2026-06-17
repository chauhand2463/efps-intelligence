import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to efps portal...');
  try {
    await page.goto('https://efps.gujarat.gov.in/loginroutingmanager/Login', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    
    console.log('Current URL:', page.url());
    
    // Take a screenshot
    const screenshotPath = 'C:\\Users\\chauh\\.gemini\\antigravity\\brain\\89a5bc5c-5b8f-4da1-bbc7-7214940f7ea1\\efps_login.png';
    await page.screenshot({ path: screenshotPath });
    console.log('Screenshot saved to:', screenshotPath);
    
    // Dump HTML of form
    const formHtml = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form ? form.innerHTML : 'No form found';
    });
    console.log('Form HTML:\n', formHtml);
    
    // Check if there are inputs
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, button, select, img')).map(el => ({
        tagName: el.tagName,
        type: el.getAttribute('type'),
        name: el.getAttribute('name'),
        id: el.getAttribute('id'),
        placeholder: el.getAttribute('placeholder'),
        src: el.getAttribute('src'),
        class: el.getAttribute('class'),
      }));
    });
    console.log('Inputs and interactive elements:', JSON.stringify(inputs, null, 2));

  } catch (err) {
    console.error('Error during inspection:', err);
  } finally {
    await browser.close();
  }
}

run();
