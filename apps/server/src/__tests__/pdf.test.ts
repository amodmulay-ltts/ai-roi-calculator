/**
 * PDF export must produce a real PDF file, not HTML with a PDF name.
 */

import { describe, it, expect } from 'vitest';
import { calculate, createDefaultScenario } from '@ai-roi-calc/engine';
import { findChromeExecutable, renderPdf } from '../pdf.js';
import { generatePdfHtml } from '../export.js';

describe('Chrome discovery', () => {
  it('uses CHROME_PATH when it points to an existing file', () => {
    const previous = process.env.CHROME_PATH;
    process.env.CHROME_PATH = process.execPath;
    try {
      expect(findChromeExecutable()).toBe(process.execPath);
    } finally {
      if (previous === undefined) delete process.env.CHROME_PATH;
      else process.env.CHROME_PATH = previous;
    }
  });
});

describe.skipIf(!findChromeExecutable())('PDF rendering', () => {
  it('returns a PDF document for the report', async () => {
    const scenario = createDefaultScenario();
    const pdf = await renderPdf(generatePdfHtml(scenario, calculate(scenario)));
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(5_000);
  }, 60_000);
});
