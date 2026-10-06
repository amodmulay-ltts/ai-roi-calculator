// Browser smoke test: serves the built client, drives an installed Edge/Chrome, saves screenshots.
// Usage: npm run build && npm run smoke   (set BROWSER_PATH to use a specific browser)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { createExampleScenario } from '../packages/engine/dist/index.js';

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
    // Dialogs are fixed to the viewport, so capture those without fullPage
    const shot = (name, fullPage = true) => page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage });

    // 1. First visit: the example
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    let body = await text(page);
    check('example loads by default', body.includes('Vantara Motors') && body.includes('EXAMPLE CALCULATION'));
    check('headline results render', /Net value created/.test(body) && /Month \d+/.test(body));
    check(
      'LTTS logo loads in the header',
      await page.$eval('header img[alt="L&T Technology Services"]', img => img.complete && img.naturalWidth > 0)
    );
    await shot('01-dashboard-example');

    // 1b. Story layout: section bar, delivery model selection, cost basis, assumption tabs
    for (const id of ['results', 'advice', 'delivery', 'cashflow', 'sensitivity', 'assumptions']) {
      check(`section #${id} present`, !!(await page.$(`#${id}`)));
    }
    await clickByText(page, '[aria-label="Delivery models ranked by NPV"] [role="radio"]', 'AI + BCC');
    body = await text(page);
    check('selecting a model in the comparison updates the verdict', body.includes('This is the model currently selected'));
    await clickByText(page, '[aria-label="Cost basis"] [role="radio"]', 'Client-chargeable');
    check(
      'cost basis toggle switches',
      await page.$eval('[aria-label="Cost basis"] [aria-checked="true"]', el => el.textContent?.includes('Client-chargeable'))
    );
    await clickByText(page, '[aria-label="Cost basis"] [role="radio"]', 'Total cost of ownership');
    for (const [tab, expected] of [
      ['Workload', 'h / month'],
      ['AI seats and usage', 'Claude Sonnet 5.5'],
      ['Costs and investment', 'One-off investment'],
      ['Team', 'Team size'],
    ]) {
      await clickByText(page, '[role="tab"]', tab);
      // innerText reflects CSS text-transform, so compare case-insensitively
      const panelText = await page.$eval('#assumptions-panel', el => el.innerText.toLowerCase());
      check(`assumptions tab "${tab}" shows its content`, panelText.includes(expected.toLowerCase()));
    }
    await clickByText(page, '[aria-label="Delivery models ranked by NPV"] [role="radio"]', 'Onshore + AI');
    await shot('01b-dashboard-after-interaction');

    // 1c. Currency: convert to USD via the dialog
    await clickByText(page, 'header button', 'EUR');
    await clickByText(page, '[role="menuitem"]', 'USD');
    await clickByText(page, '[role="dialog"] button', 'Convert all amounts');
    body = await text(page);
    check('currency converts to USD', body.includes('$') && !body.includes('Change currency'));
    await clickByText(page, 'header button', 'USD');
    await clickByText(page, '[role="menuitem"]', 'EUR');
    await clickByText(page, '[role="dialog"] button', 'Convert all amounts');

    // 1c2. AI effect: the central assumption is editable and drives the verdict
    await clickByText(page, '[role="tab"]', 'AI effect');
    const setCut = async value => {
      const input = await page.$('#assumptions-panel #cut-mature');
      await input.click({ clickCount: 3 });
      await input.type(String(value));
    };
    await setCut(15);
    check('a 15% effort cut turns the advice to "does not pay back"', (await text(page)).includes('Does not pay back within'));
    await setCut(30);
    check('restoring 30% restores the verdict', (await text(page)).includes('Pays back in month 15'));

    // 1c3. Seats: costed from assigned roles, editable, double-count guard
    await clickByText(page, '[role="tab"]', 'AI seats and usage');
    let aiPanel = await page.$eval('#assumptions-panel', el => el.innerText.toLowerCase());
    check('seats panel shows a cost and a seat count', aiPanel.includes('ai seats') && aiPanel.includes('seats once mature'));
    await clickByText(page, 'button', 'Edit seats and prices');
    const seatType = await page.$('select[aria-label="AI coding assistant seats (engineers) seat type"]');
    await seatType.select('claude-team-standard');
    check(
      'a bundled-usage seat warns in the editor',
      (await page.$eval('#assumptions-panel', el => el.innerText.toLowerCase())).includes('do not also meter tokens')
    );
    await clickByText(page, '#assumptions-panel button', 'Save changes');
    body = await text(page);
    check('bundled seat plus token usage raises the double-count warning', body.includes('already include model usage'));
    await shot('01f-seats');

    // 1d. Roles: hourly rates, working hours, add/remove, persisted on the scenario
    await clickByText(page, '[role="tab"]', 'Team');
    await clickByText(page, 'button', 'Edit roles, FTE and rates');
    await clickByText(page, '[aria-label="Rate unit"] [role="radio"]', 'Hour');
    const architectRate = () => page.$eval('input[aria-label="Software Architect cost / hour"]', el => Number(el.value));
    check('hourly rate shown from monthly cost (12,000 / 160 h)', (await architectRate()) === 75);
    const hours = await page.$('input[aria-invalid]');
    await hours.click({ clickCount: 3 });
    await hours.type('150');
    check('changing working hours keeps hourly rates', (await architectRate()) === 75);
    await clickByText(page, 'button', 'Add role');
    check('a role can be added', !!(await page.$('input[aria-label="New role FTE Today"]')));
    const removeButtons = await page.$$('#assumptions-panel button');
    for (const b of removeButtons.reverse()) {
      if ((await b.evaluate(el => el.textContent?.trim())) === 'Remove') { await b.click(); break; }
    }
    check('a role can be removed', !(await page.$('input[aria-label="New role FTE Today"]')));
    await shot('01d-roles-editor');
    await clickByText(page, '#assumptions-panel button', 'Save changes');
    await new Promise(r => setTimeout(r, 600)); // autosave delay
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('valueai.currentScenario.v1') ?? '{}').scenario);
    check('rate unit "hour" is stored on the scenario', saved?.rateUnit === 'hour');
    check('working hours are stored (150)', saved?.globalAssumptions?.workingHrsPerFtePerMonth === 150);
    check(
      'monthly cost follows the hours (75 / hour × 150 h = 11,250)',
      Math.round(saved?.roles?.find(r => r.id === 'sw-architect')?.costPerFte) === 11_250
    );
    await page.click('#assumptions-panel details summary');
    const panel = await page.$eval('#assumptions-panel', el => el.innerText.toLowerCase());
    check('team panel lists rates per hour', panel.includes('onshore / hour') && panel.includes('75'));

    // 1e. Onshore and offshore rates side by side
    await clickByText(page, 'button', 'Edit roles, FTE and rates');
    check(
      'onshore-only role has its offshore rate locked',
      await page.$eval('input[aria-label="Functional Safety Engineer offshore cost / hour"]', el => el.disabled)
    );
    const offshore = await page.$('input[aria-label="Embedded Developer offshore cost / hour"]');
    await offshore.type('25');
    await clickByText(page, '#assumptions-panel button', 'Save changes');
    await new Promise(r => setTimeout(r, 600));
    const withOffshore = await page.evaluate(() => JSON.parse(localStorage.getItem('valueai.currentScenario.v1') ?? '{}').scenario);
    check(
      'role-specific offshore rate is stored as monthly cost (25 / hour × 150 h = 3,750)',
      Math.round(withOffshore?.roles?.find(r => r.id === 'embedded-dev')?.bccCostPerFte) === 3_750
    );
    await page.click('#assumptions-panel details summary');
    const teamPanel = await page.$eval('#assumptions-panel', el => el.innerText.toLowerCase());
    check('team panel shows onshore and offshore rates side by side', teamPanel.includes('offshore saving') && teamPanel.includes('stays onshore'));
    await shot('01e-onshore-offshore');

    // 2. Help presentation opens and closes with Escape
    await clickByText(page, 'button', 'How it works');
    await page.waitForSelector('[aria-label="How VALUEAI works"]');
    await shot('02-help');
    // innerText reflects CSS text-transform (slide kickers are uppercased), so compare case-insensitively
    const helpText = (await page.$eval('[aria-label="How VALUEAI works"]', el => el.innerText)).toLowerCase();
    for (const flavour of ['Frontier models', 'Enterprise models', 'Local / open-weight models'])
      check(`help covers ${flavour}`, helpText.includes(flavour.toLowerCase()));
    check('help compares the flavours on the same team', helpText.includes('the three flavours, same team'));
    check(
      'help keeps the calculator walkthrough',
      helpText.includes('three moments in time') && helpText.includes('of value created over')
    );
    await page.keyboard.press('Escape');
    check('help opens and closes', !(await page.$('[aria-label="How VALUEAI works"]')));

    // 3. New customer scenario through the guided setup
    await clickByText(page, 'button', 'Scenario');
    await clickByText(page, '[role="menuitem"]', 'New scenario');
    await page.type('input[placeholder^="e.g., Acme Corp"]', 'Smoke Test Bank - AI testing');
    await page.type('input[placeholder="e.g., Acme Corporation"]', 'Smoke Test Bank');
    for (let i = 0; i < 3; i++) await clickByText(page, '[role="dialog"] button', 'Next');
    check(
      'automotive template is preselected for an automotive use case',
      await page.$eval('[aria-label="Use case"] [aria-checked="true"]', el => el.textContent?.includes('Automotive'))
    );
    await clickByText(page, '[role="dialog"] button', 'Apply template');
    check('automotive template sets the workload', (await text(page)).includes('5,280 h of work a month'));
    await shot('03a-setup-automotive-template', false);
    await clickByText(page, '[role="dialog"] button', 'Next');
    check('setup has an AI effect step with the mature cut', (await page.$eval('#cut-mature', el => Number(el.value))) === 30);
    await shot('03b-setup-ai-effect', false);
    for (let i = 0; i < 3; i++) await clickByText(page, '[role="dialog"] button', 'Next');
    await shot('03-setup-review', false);
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

    // 4b. An example saved by an older version must not hide the current built-in example
    const oldExample = { ...createExampleScenario(), name: 'Example: AI-augmented testing at Northwind Insurance', clientName: 'Northwind Insurance (fictional)' };
    await page.evaluate(
      saved => localStorage.setItem('valueai.currentScenario.v1', JSON.stringify(saved)),
      { savedAt: '2026-10-01T10:00:00.000Z', scenario: oldExample }
    );
    await page.reload({ waitUntil: 'networkidle0' });
    body = await text(page);
    check('a saved old example is replaced by the current example', body.includes('Vantara Motors') && !body.includes('Northwind'));
    check('no restore notice for a saved example', !body.includes('Restored the scenario saved in this browser'));

    // 5. Corrupt storage falls back to the example
    await page.evaluate(() => localStorage.setItem('valueai.currentScenario.v1', '{"scenario":{"name":1}}'));
    await page.reload({ waitUntil: 'networkidle0' });
    check('corrupt saved data falls back to the example', (await text(page)).includes('Vantara Motors'));

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
