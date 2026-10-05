// Browser smoke test: serves the built client, drives an installed Edge/Chrome, saves screenshots.
// Usage: npm run build && npm run smoke   (set BROWSER_PATH to use a specific browser)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.smoke');
const PORT = 4179;
const URL = `http://localhost:${PORT}/`;

const BROWSERS = [
  process.env.BROWSER_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

async function waitForServer(url, timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Server did not start at ${url}`);
}

const clickByText = async (page, selector, text) => {
  const handle = await page.waitForFunction(
    (sel, t) => [...document.querySelectorAll(sel)].find(el => el.textContent?.trim().startsWith(t)),
    { timeout: 5_000 },
    selector,
    text
  );
  await handle.asElement().click();
};

const text = page => page.evaluate(() => document.body.innerText);

async function main() {
  const executablePath = BROWSERS.find(p => existsSync(p));
  if (!executablePath) throw new Error('No Edge/Chrome found; set BROWSER_PATH');
  if (!existsSync(path.join(root, 'dist/client/index.html'))) throw new Error('Run npm run build first');
  mkdirSync(outDir, { recursive: true });

  const vite = path.join(root, 'node_modules/vite/bin/vite.js');
  const server = spawn(process.execPath, [vite, 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: path.join(root, 'apps/client'),
    stdio: 'ignore',
  });
  // A throwaway profile avoids clashing with a browser the user already has open
  const profile = mkdtempSync(path.join(os.tmpdir(), 'valueai-smoke-'));
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    userDataDir: profile,
    args: ['--window-size=1440,1000', '--no-first-run', '--no-default-browser-check'],
  });

  try {
    await waitForServer(URL);
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    page.on('dialog', d => d.accept());
    const shot = name => page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });

    // 1. First visit: the example
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    let body = await text(page);
    check('example loads by default', body.includes('Northwind Insurance') && body.includes('EXAMPLE CALCULATION'));
    check('headline results render', /Net value created/.test(body) && /Month \d+/.test(body));
    await shot('01-dashboard-example');

    // 2. Help presentation opens and closes with Escape
    await clickByText(page, 'button', 'How it works');
    await page.waitForSelector('[aria-label="How VALUEAI works"]');
    await shot('02-help');
    await page.keyboard.press('Escape');
    check('help opens and closes', !(await page.$('[aria-label="How VALUEAI works"]')));

    // 3. New customer scenario through the guided setup
    await clickByText(page, 'button', 'Scenario');
    await clickByText(page, '[role="menuitem"]', 'New scenario');
    await page.type('input[placeholder^="e.g., Acme Corp"]', 'Smoke Test Bank - AI testing');
    await page.type('input[placeholder="e.g., Acme Corporation"]', 'Smoke Test Bank');
    for (let i = 0; i < 6; i++) await clickByText(page, '[role="dialog"] button', 'Next');
    await shot('03-setup-review');
    await clickByText(page, '[role="dialog"] button', 'Create scenario');
    body = await text(page);
    check('setup creates a customer scenario', body.includes('Smoke Test Bank - AI testing') && !body.includes('EXAMPLE CALCULATION'));

    // 4. Autosave: the customer scenario survives a reload
    await new Promise(r => setTimeout(r, 600));
    await page.reload({ waitUntil: 'networkidle0' });
    body = await text(page);
    check('autosave restores the scenario after reload', body.includes('Smoke Test Bank - AI testing'));
    check('restore notice is shown', body.includes('Restored the scenario saved in this browser'));
    await shot('04-restored');

    // 5. Corrupt storage falls back to the example
    await page.evaluate(() => localStorage.setItem('valueai.currentScenario.v1', '{"scenario":{"name":1}}'));
    await page.reload({ waitUntil: 'networkidle0' });
    check('corrupt saved data falls back to the example', (await text(page)).includes('Northwind Insurance'));

    check('no console or page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
    server.kill();
    rmSync(profile, { recursive: true, force: true });
  }

  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed. Screenshots in .smoke/`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
