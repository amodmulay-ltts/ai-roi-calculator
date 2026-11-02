/**
 * Real PDF rendering: the report HTML is printed to PDF by a local Chrome or Chromium through puppeteer-core.
 * Set CHROME_PATH to choose the browser; otherwise common install locations are checked.
 */

import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

/** A4 at 96 dpi, so the report's viewport-height pages print one per sheet. */
const A4_PX = { width: 794, height: 1123 };

export class PdfUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfUnavailableError';
  }
}

export function findChromeExecutable(): string | null {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ];
  return candidates.find((p): p is string => Boolean(p) && existsSync(p as string)) ?? null;
}

/** Prints a self-contained report page to A4 PDF bytes. Scripts are disabled: the report needs none. */
export async function renderPdf(html: string): Promise<Buffer> {
  const executablePath = findChromeExecutable();
  if (!executablePath) {
    throw new PdfUnavailableError('No Chrome or Chromium found. Set CHROME_PATH to enable PDF export.');
  }

  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setViewport(A4_PX);
    await page.setContent(html, { waitUntil: 'load' });
    await page.emulateMediaType('print');
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
