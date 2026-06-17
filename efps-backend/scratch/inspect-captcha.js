import { chromium } from 'playwright';
import { createWorker } from 'tesseract.js';
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
    
    // Locate the captcha image
    const captchaImg = await page.$('img[src*="GetCaptchaImage"]');
    if (!captchaImg) {
      console.log('Captcha image element not found!');
      return;
    }
    
    // Screenshot only the captcha image
    const captchaBuffer = await captchaImg.screenshot();
    const captchaPath = 'C:\\Users\\chauh\\.gemini\\antigravity\\brain\\89a5bc5c-5b8f-4da1-bbc7-7214940f7ea1\\captcha_img.png';
    fs.writeFileSync(captchaPath, captchaBuffer);
    console.log('Captcha image saved to:', captchaPath);
    
    // Initialize tesseract worker
    console.log('Initializing Tesseract worker...');
    const worker = await createWorker('eng');
    
    console.log('Running OCR on captcha image...');
    const { data: { text } } = await worker.recognize(captchaBuffer);
    console.log('OCR Raw Output:', text);
    
    const cleanedText = text.replace(/[^a-zA-Z0-9]/g, '').trim();
    console.log('Cleaned CAPTCHA Text:', cleanedText);
    
    await worker.terminate();

  } catch (err) {
    console.error('Error during OCR inspection:', err);
  } finally {
    await browser.close();
  }
}

run();
