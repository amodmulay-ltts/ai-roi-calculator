// Browser smoke test for the AI Business Case app (apps/exec): serves the built app and drives an installed Chrome/Edge.
// Expected numbers are the golden values in EXEC_BUILD_SPEC.md section 6 (default inputs), not recomputed here.
// Usage: npm run build:exec && npm run smoke:exec   (set BROWSER_PATH to use a specific browser)
// page.evaluate runs only the fixed snippets in this file, inside a throwaway browser pointed at the local build.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.smoke');
const PORT = 4180;
const URL = `http://localhost:${PORT}/`;
const STORAGE_KEY = 'execcase.v1';

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
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? `  (${detail})` : ''}`);
};
const has = (haystack, ...needles) => needles.every(n => haystack.includes(n));

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

const pause = (ms = 350) => new Promise(r => setTimeout(r, ms));
const text = page => page.evaluate(() => document.body.innerText);

const goStep = async (page, label) => {
  await page.evaluate(
    l => [...document.querySelectorAll('nav button')].find(b => b.textContent.trim().startsWith(l)).click(),
    label
  );
  await pause();
};

const clickButton = async (page, label) => {
  await page.evaluate(
    l => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === l).click(),
    label
  );
  await pause();
};

/** Sets a controlled React input: the native setter plus an input event. */
const setInput = async (page, selector, value) => {
  await page.evaluate(
    (sel, v) => {
      const el = document.querySelector(sel);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    selector,
    value
  );
  await pause();
};

const cardTexts = page =>
  page.evaluate(() =>
    [...document.querySelectorAll('button[aria-pressed]')].filter(b => b.querySelector('dl')).map(b => b.innerText.replace(/\n+/g, ' | '))
  );

async function main() {
  const executablePath = BROWSERS.find(p => existsSync(p));
  if (!executablePath) throw new Error('No Edge/Chrome found; set BROWSER_PATH');
  if (!existsSync(path.join(root, 'dist/exec/index.html'))) throw new Error('Run npm run build:exec first');
  mkdirSync(outDir, { recursive: true });

  const vite = path.join(root, 'node_modules/vite/bin/vite.js');
  const server = spawn(process.execPath, [vite, 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: path.join(root, 'apps/exec'),
    stdio: 'ignore',
  });
  // A throwaway profile avoids clashing with a browser the user already has open
  const profile = mkdtempSync(path.join(os.tmpdir(), 'bizcase-smoke-'));
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    userDataDir: profile,
    args: ['--window-size=1280,1000', '--no-first-run', '--no-default-browser-check'],
  });

  try {
    await waitForServer(URL);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    // The browser asks for a favicon the app does not ship; that is not an app error
    page.on('console', m => m.type() === 'error' && !m.text().includes('404') && errors.push(m.text()));
    page.on('dialog', d => d.accept());

    await page.goto(URL, { waitUntil: 'networkidle0' });
    await page.evaluate(key => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload({ waitUntil: 'networkidle0' });

    // Step 1: Situation
    let body = await text(page);
    check('opens on the Situation step with the header', has(body, 'AI Business Case', 'People in scope', 'Print summary'));
    check('Situation shows today\'s position', has(body, 'Today: 30 people, €2.4M a year, 4,800 hours a month.'));
    check('editable defaults are labelled as assumptions to validate', body.includes('Assumption to validate'));

    // Step 2: Opportunity
    await goStep(page, '2 Opportunity');
    body = await text(page);
    check('Opportunity shows the work mix total', body.includes('Total 100%'));
    const tiles = await page.$$eval('p.text-2xl', els => els.map(e => e.textContent));
    check('live tiles match the enterprise result (1,440 hours, 9.0 people, 30.0% net efficiency)', tiles[0] === '1,440' && tiles[1] === '9.0' && tiles[2] === '30.0%', tiles.join(' / '));
    body = await text(page);
    check('the efficiency bridge shows gross, review and net (36.8%, -6.8%, 30.0%)', has(body, 'How the efficiency is built', '36.8%', '-6.8%', 'Where the effort is saved', '24.0%', '34.0%', 'Shown for the Enterprise option.'));

    // Step 3: Right-size, spec 6.2 and 6.3
    await goStep(page, '3 Right-size');
    body = await text(page);
    check('the data-rules gate line reads 4 of 4', body.includes('Data rules: Public cloud AI is acceptable. 4 of 4 options are open to you.'));
    const [local, hybrid, enterprise, frontier] = await cardTexts(page);
    check('Local card: marginal, €239K, Month 35, €16,328', has(local, 'Marginal', '€239K', 'Month 35', '€16,328', 'Breaks even if AI delivers 97%'));
    check('Hybrid card: does not pay back, -€187K', has(hybrid, 'Does not pay back', '€329K', 'Not within 36 months', '-€187K', 'delivers 119%'));
    check('Enterprise card: recommended, pays back, Month 15, €418K', has(enterprise, 'Recommended', 'Pays back', '€199K', 'Month 15', '€418K', 'delivers 70%'));
    check('Frontier card: marginal, €139K, Month 33, €14,748', has(frontier, 'Marginal', '€139K', 'Month 33', '€14,748', 'delivers 99%'));
    check('the bar chart renders', !!(await page.$('.recharts-bar-rectangle')));
    check('the assumptions section starts collapsed', !(await page.$('details[open]')));
    await page.screenshot({ path: path.join(outDir, 'exec-03-right-size.png'), fullPage: true });

    // Step 4: Investment
    await goStep(page, '4 Investment');
    body = await text(page);
    check('investment lines add up to the total (€199K)', has(body, 'Platform setup', '€90,000', 'Data readiness', '€60,000', 'Governance setup', '€25,000', 'Training', '€24,000', '€199K'));

    // Step 5: Result, spec 6.4
    await goStep(page, '5 Result');
    body = await text(page);
    check('Result headline states the enterprise verdict', body.includes('Enterprise AI pays back in month 15 and returns €418K over 3 years (expected case).'));
    const rows = await page.$$eval('table tr', trs => trs.map(tr => [...tr.children].map(c => c.textContent).join(' | ')));
    check('Result table matches the conservative, expected and stretch cases', rows.some(r => r === 'Payback | Not within 36 months | Month 15 | Month 10') && rows.some(r => r === 'Net per month at maturity | €2,600 | €19,400 | €25,700') && rows.some(r => r === 'Counted as saving per month | €25,200 | €42,000 | €48,300'));
    check('the cumulative chart draws three lines', (await page.$$('.recharts-line')).length === 3);

    // Step 6: Risks
    await goStep(page, '6 Risks');
    check('the default readiness gap is 0 of 8', (await text(page)).includes('Readiness gap: 0 of 8.'));

    // Step 7: Decision
    await goStep(page, '7 Decision');
    body = await text(page);
    check('the decision summary has its parts', has(body, 'What must be true', 'Range:', 'The ask', 'Next steps', 'Net efficiency gain', 'Assumptions are presenter-entered and not independently verified.'));
    check('the decision summary shows the verdict of every option', has(body, 'Local: Marginal', 'Hybrid: Does not pay back', 'Enterprise: Pays back', 'Frontier: Marginal'));
    const panels = await page.$$eval('.print-area h2', els => els.map(e => e.textContent));
    const expectedPanels = ['Cumulative position', '3-year net value by option', 'How the efficiency is built', 'Where the effort is saved', 'Monthly position at maturity', 'One-time investment', 'Safety margin', 'What must be true'];
    check('the decision summary is a dashboard of eight panels', expectedPanels.every(p => panels.includes(p)), panels.join(' | '));
    check('the dashboard draws six charts', (await page.$$('.print-area .recharts-wrapper')).length === 6);
    check('the safety margin shows both break-evens and the readiness gap', has(body, 'Break-even: 70%', 'Assumed: 100%', 'Break-even: 49%', 'Assumed: 70%', 'Readiness gap: 0 of 8.'));
    await page.screenshot({ path: path.join(outDir, 'exec-07-decision.png'), fullPage: true });

    // Readiness: a partly-ready answer moves the gap and sentences on step 6, and the dashboard follows
    await goStep(page, '6 Risks');
    await page.evaluate(() => document.querySelector('input[name="readiness-data"][value="partial"]').click());
    await pause();
    body = await text(page);
    check('a partly-ready answer moves the gap and adds a readiness sentence', has(body, 'Readiness gap: 1 of 8.', 'Readiness gaps reduce the 3-year value by'));
    await goStep(page, '7 Decision');
    body = await text(page);
    check('the dashboard follows the readiness answer (gap 1 of 8, break-even 73%)', has(body, 'Readiness gap: 1 of 8.', 'Break-even: 73%'));

    // Persistence across a reload
    await setInput(page, 'header input[type=text]', 'Acme Motors');
    await page.reload({ waitUntil: 'networkidle0' });
    const persisted = await page.evaluate(() => ({
      name: document.querySelector('header input[type=text]').value,
      data: JSON.parse(localStorage.getItem('execcase.v1')).state.inputs.readiness.data,
      step: document.querySelector('nav [aria-current="step"]').textContent,
    }));
    check('the customer name and readiness answer survive a reload', persisted.name === 'Acme Motors' && persisted.data === 'partial');
    check('the step is not saved: a reload opens on step 1', persisted.step.startsWith('1'), persisted.step);

    // Saved data that is malformed or the wrong shape is ignored
    for (const [label, value] of [
      ['malformed JSON', '{not json'],
      ['a wrong shape', JSON.stringify({ state: { inputs: { teamSize: 'x' } }, version: 0 })],
      ['a missing tier', JSON.stringify({ state: { inputs: { customerName: 'x' } }, version: 0 })],
    ]) {
      await page.evaluate((k, v) => localStorage.setItem(k, v), STORAGE_KEY, value);
      await page.reload({ waitUntil: 'networkidle0' });
      const loaded = await page.evaluate(() => ({ name: document.querySelector('header input[type=text]').value, ok: !!document.querySelector('h1') }));
      check(`saved data with ${label} falls back to the defaults`, loaded.ok && loaded.name === '');
    }
    await page.evaluate(key => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload({ waitUntil: 'networkidle0' });

    // Data rules: sovereign leaves only Local open
    await page.evaluate(() => document.querySelector('input[name="dataConstraint"][value="sovereign"]').click());
    await pause();
    await goStep(page, '3 Right-size');
    body = await text(page);
    const disabled = await page.$$eval('button[aria-pressed][disabled]', els => els.length);
    check('sovereign data rules leave 1 of 4 options open', body.includes('1 of 4 options are open to you.'));
    check('the three closed options are disabled with the sovereign reason', disabled === 3 && body.includes('Needs a model outside your own infrastructure, which your data rules do not allow.'));
    const selected = await page.$$eval('button[aria-pressed="true"]', els => els.map(e => e.innerText.split('\n')[0]));
    check('the selection falls back to the open option (Local)', selected.length === 1 && selected[0] === 'Local', selected.join(','));
    await goStep(page, '1 Situation');
    await page.evaluate(() => document.querySelector('input[name="dataConstraint"][value="public-ok"]').click());
    await pause();

    // Validation: a work mix that does not add up blocks results and printing
    await goStep(page, '2 Opportunity');
    await setInput(page, 'input[aria-label="Test design share of work (%)"]', '20');
    body = await text(page);
    check('an invalid work mix shows the issue and a red total', has(body, 'Work mix must add up to 100%.', 'Total 90%'));
    const printDisabled = await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Print summary').disabled);
    check('Print summary is disabled while the inputs are invalid', printDisabled);
    await goStep(page, '3 Right-size');
    check('results are replaced by the fix-the-inputs message', (await text(page)).includes('Fix the inputs on the earlier steps to see results.'));
    await goStep(page, '2 Opportunity');
    await setInput(page, 'input[aria-label="Test design share of work (%)"]', '30');

    // Print: from any step it goes to the decision step; the print layout hides the controls
    await goStep(page, '3 Right-size');
    await page.evaluate(() => {
      window.__printed = 0;
      window.print = () => {
        window.__printed += 1;
      };
    });
    await clickButton(page, 'Print summary');
    await pause(400);
    const afterPrint = await page.evaluate(() => ({ printed: window.__printed, step: document.querySelector('nav [aria-current="step"]').textContent }));
    check('Print summary from step 3 goes to step 7 and opens the print dialog', afterPrint.printed === 1 && afterPrint.step.startsWith('7'), JSON.stringify(afterPrint));
    await page.emulateMediaType('print');
    const printLayout = await page.evaluate(() => ({
      header: getComputedStyle(document.querySelector('header')).display,
      nav: getComputedStyle(document.querySelector('nav').parentElement).display,
      footer: getComputedStyle(document.querySelector('footer')).display,
      summary: getComputedStyle(document.querySelector('.print-area')).visibility,
    }));
    check('the print layout hides the header, step bar and buttons and shows the summary', printLayout.header === 'none' && printLayout.nav === 'none' && printLayout.footer === 'none' && printLayout.summary === 'visible', JSON.stringify(printLayout));
    const pdf = await page.pdf({ preferCSSPageSize: true });
    const pages = (Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    check('the decision summary prints on one A4 landscape page', pages === 1, `${pages} pages`);
    await page.emulateMediaType('screen');

    // Accessibility: every form field has an accessible name, on every screen
    let unnamed = [];
    for (const step of ['1 Situation', '2 Opportunity', '3 Right-size', '4 Investment', '6 Risks', '7 Decision']) {
      await goStep(page, step);
      if (step === '3 Right-size') await page.evaluate(() => document.querySelector('details').setAttribute('open', ''));
      const missing = await page.evaluate(() =>
        [...document.querySelectorAll('input, select, textarea')]
          .filter(el => !(el.labels && el.labels.length) && !el.getAttribute('aria-label'))
          .map(el => el.outerHTML.slice(0, 80))
      );
      unnamed = unnamed.concat(missing.map(m => `${step}: ${m}`));
    }
    check('every form field has an accessible name', unnamed.length === 0, unnamed.slice(0, 3).join(' ; '));

    check('no console or page errors during the run', errors.length === 0, errors.slice(0, 3).join(' ; '));
  } finally {
    await browser.close();
    server.kill();
    rmSync(profile, { recursive: true, force: true });
  }

  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots in .smoke/`);
  process.exit(failed.length ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
