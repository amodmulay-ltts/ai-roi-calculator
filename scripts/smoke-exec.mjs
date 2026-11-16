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

/** Sets the nth match of a controlled input, for lists of identical fields such as each phase's AI use. */
const setNth = async (page, selector, index, value) => {
  await page.evaluate(
    (sel, i, v) => {
      const el = document.querySelectorAll(sel)[i];
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    selector,
    index,
    value
  );
  await pause(150);
};

const netEfficiencyTile = page => page.$$eval('p.text-2xl', els => els[2]?.textContent);
const issueList = page => page.$('ul.text-red-700');

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
    const failedRequests = [];
    page.on('response', r => r.status() >= 400 && failedRequests.push(`${r.status()} ${r.url()}`));

    await page.goto(URL, { waitUntil: 'networkidle0' });
    await page.evaluate(key => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload({ waitUntil: 'networkidle0' });

    // Step 1: Situation
    let body = await text(page);
    check('opens on the Situation step with the header', has(body, 'AI Business Case', 'People in scope', 'Print summary'));
    check('Situation shows today\'s position', has(body, 'Today: 30 people, €2.4M a year, 4,800 hours a month.'));
    check('editable defaults are labelled as assumptions to validate', body.includes('Assumption to validate'));

    // Look and feel: the same identity as VALUEAI
    const look = await page.evaluate(() => {
      const logo = document.querySelector('header img');
      return {
        logo: !!logo && logo.complete && logo.naturalWidth > 0,
        brand: document.querySelector('header h1')?.textContent,
        subtitle: document.querySelector('header p')?.textContent,
        sticky: getComputedStyle(document.querySelector('header').parentElement).position,
        title: document.title,
        banner: document.querySelector('aside[aria-label="Placeholder assumptions"]')?.textContent ?? '',
        runningResult: document.querySelector('[aria-label="Running result"]')?.textContent ?? '',
        footer: [...document.querySelectorAll('footer')].map(f => f.textContent).join(' '),
      };
    });
    check('the header shows the L&T logo and the VALUEAI name', look.logo && look.brand === 'VALUEAI' && look.subtitle === 'AI Business Case', JSON.stringify(look));
    check('the header and step bar stay in view while scrolling (sticky)', look.sticky === 'sticky', look.sticky);
    check('the browser tab carries the VALUEAI title', look.title === 'VALUEAI AI Business Case · L&T Technology Services', look.title);
    check('the step bar carries a running result (€418K, month 15, ROI 210%)', has(look.runningResult, '€418K', 'month 15', 'ROI 210%'), look.runningResult);
    check('a notice states that the starting figures are placeholders', has(look.banner, 'Placeholder assumptions', 'not a benchmark or a vendor price'));
    check('the page ends with the VALUEAI footer', look.footer.includes('VALUEAI — AI Business Case'));

    // Step 2: Opportunity
    await goStep(page, '2 Opportunity');
    body = await text(page);
    check('Opportunity shows the phase effort total and each phase work total', has(body, 'Phase effort total 100%', 'Phase work total 100%'));
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
    await setInput(page, 'input[aria-label="Customer name"]', 'Acme Motors');
    await page.reload({ waitUntil: 'networkidle0' });
    const persisted = await page.evaluate(() => ({
      name: document.querySelector('input[aria-label="Customer name"]').value,
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
      const loaded = await page.evaluate(() => ({ name: document.querySelector('input[aria-label="Customer name"]').value, ok: !!document.querySelector('h1') }));
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
    await setInput(page, 'input[aria-label="Design share of all effort (%)"]', '20');
    body = await text(page);
    check('phase effort that does not add up shows the issue and a red total', has(body, 'Phase effort must add up to 100%.', 'Phase effort total 90%'));
    const printDisabled = await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Print summary').disabled);
    check('Print summary is disabled while the inputs are invalid', printDisabled);
    await goStep(page, '3 Right-size');
    check('results are replaced by the fix-the-inputs message', (await text(page)).includes('Fix the inputs on the earlier steps to see results.'));
    await goStep(page, '2 Opportunity');
    await setInput(page, 'input[aria-label="Design share of all effort (%)"]', '30');

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

    // Work in scope: other lifecycles, and AI use set for each phase on its own
    await goStep(page, '1 Situation');
    await page.select('select', 'mechanical-design');
    await pause();
    check('the situation names the industry of the chosen work', (await text(page)).includes('Mechanical engineering.'));
    await goStep(page, '2 Opportunity');
    // A phase shows the average AI use of its work; AI use itself is entered on each piece of work
    const aiUse = async () => page.$$eval('[aria-label$=" average AI use"]', els => els.map(e => Number.parseInt(e.textContent, 10)));
    const workUse = '[aria-label$=" AI use (%)"]';
    let uses = await aiUse();
    check('mechanical design has eight phases, each with its own AI use', uses.join(',') === '50,45,55,70,50,5,80,75', uses.join(','));
    check('the phase AI use adds up to 430%, not 100%, and is accepted', uses.reduce((a, b) => a + b, 0) === 430 && !(await issueList(page)));
    check('mechanical design shows 19.9% net efficiency', (await netEfficiencyTile(page)) === '19.9%', await netEfficiencyTile(page));
    check('the phase chart shows the physical prototype phase barely touched (5% use, 2.1% efficiency)', has(await text(page), 'Prototype', '2.1%'));
    const workCount = (await page.$$(`input${workUse}`)).length;
    for (let i = 0; i < workCount; i++) await setNth(page, `input${workUse}`, i, '100');
    uses = await aiUse();
    check('every phase can be 100% at once without an error', uses.every(u => u === 100) && !(await issueList(page)));
    check('more AI use gives more net efficiency', Number.parseFloat(await netEfficiencyTile(page)) > 19.9, await netEfficiencyTile(page));
    await setNth(page, `input${workUse}`, 0, '0');
    check('one piece of work can be 0% on its own: only its phase average changes', (await aiUse()).join(',') === '0,100,100,100,100,100,100,100');

    // Editing the phases and work makes the case custom, and a rename moves the phase's work with it
    await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Add phase').click());
    await pause();
    check('Add phase adds a ninth phase', (await aiUse()).length === 9);
    await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Add work').pop().click());
    await pause();
    const newWorkRows = await page.$$eval('input[type=text]', els => els.filter(e => e.value === 'New work').length);
    check('a new phase starts with one piece of work, and Add work adds a 0% row that keeps both totals at 100%', newWorkRows === 2 && has(await text(page), 'Phase effort total 100%', 'Phase work total 100%') && !(await issueList(page)));
    await setInput(page, 'input[aria-label="Phase 2 name"]', 'Design and CAD');
    const cadPhase = await page.evaluate(() => {
      const row = [...document.querySelectorAll('input[type=text]')].find(i => i.value === '3D CAD modelling');
      const block = row?.closest('.rounded-xl.border');
      return block?.querySelector('input[aria-label="Phase 2 name"]')?.value;
    });
    check('renaming a phase keeps its work inside it', cadPhase === 'Design and CAD', String(cadPhase));
    await goStep(page, '1 Situation');
    check('the picker shows the case as custom once it is edited', (await text(page)).includes('The phases and work have been edited'));
    await goStep(page, '7 Decision');
    check('the decision summary names the work in scope as custom', (await text(page)).includes('Work in scope: Custom.'));
    await goStep(page, '1 Situation');
    await page.select('select', 'product-lifecycle');
    await pause();
    await goStep(page, '7 Decision');
    await page.emulateMediaType('print');
    const pdfProduct = await page.pdf({ preferCSSPageSize: true });
    const productPages = (Buffer.from(pdfProduct).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    check('the product lifecycle (ten phases) also prints on one page', productPages === 1, `${productPages} pages`);
    await page.emulateMediaType('screen');
    await page.screenshot({ path: path.join(outDir, 'exec-07-decision-product.png'), fullPage: true });
    await goStep(page, '1 Situation');
    await page.select('select', 'software-testing');
    await pause();
    check('choosing the testing template again restores the reference', (await text(page)).includes('Software. The software testing life cycle'));

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

    // The "How it works" presenter deck: opens from the header, scrolls like slides, keyboard driven
    await page.evaluate(() => [...document.querySelectorAll('a')].find(a => a.textContent.trim() === 'How it works').click());
    await pause(600);
    const guideText = await text(page);
    check('How it works opens the presenter deck with 11 slides', has(guideText, 'Is this AI investment worth it', '1 / 11') && (await page.$$eval('[data-slide]', e => e.length)) === 11);
    await page.screenshot({ path: path.join(outDir, 'guide-1.png') });
    const slideTop = () => page.evaluate(() => Math.round(document.querySelector('.snap-mandatory').scrollTop / window.innerHeight));
    await page.keyboard.press('ArrowDown');
    await pause(900);
    check('the down arrow advances one slide', (await slideTop()) === 1 && (await text(page)).includes('2 / 11'));
    await page.keyboard.press('End');
    await pause(1500);
    check('End jumps to the last slide', (await text(page)).includes('11 / 11'));
    await page.keyboard.press('Home');
    await pause(1500);
    for (let i = 1; i <= 10; i++) {
      await page.evaluate(n => document.querySelectorAll('[data-slide]')[n].scrollIntoView(), i);
      await pause(300);
      await page.screenshot({ path: path.join(outDir, `guide-${i + 1}.png`) });
    }
    const overflow = await page.evaluate(() => [...document.querySelectorAll('[data-slide]')].filter(s => s.scrollWidth > s.clientWidth + 2).length);
    check('no slide overflows sideways', overflow === 0, `${overflow} slides`);
    check('the illustrative figures are labelled on the slides that show them', (await page.$$eval('[data-slide]', els => els.filter(e => e.innerText.toLowerCase().includes('illustrative placeholder figures')).length)) >= 5);
    await page.evaluate(() => [...document.querySelectorAll('a')].find(a => a.textContent.trim() === 'Open the calculator').click());
    await pause(600);
    check('Open the calculator returns to the app', (await text(page)).includes('Reset to defaults'));

    check('every request succeeded: the logo, icons and scripts all load', failedRequests.length === 0, failedRequests.join(' ; '));
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
