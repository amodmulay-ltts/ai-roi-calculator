/**
 * Export figures must state the cost lens they use and match the selected rows.
 */

import { describe, it, expect } from 'vitest';
import { calculate, createDefaultScenario, type Scenario } from '@ai-roi-calc/engine';
import { generateExcelData, generatePdfHtml } from '../export.js';

const withBasis = (costChargeable: Scenario['costChargeable']): Scenario => ({ ...createDefaultScenario(), costChargeable });

const costsSheet = (scenario: Scenario) => {
  const results = calculate(scenario);
  const sheet = generateExcelData(scenario, results).sheets.find(s => s.name === 'Costs')!;
  const row = (label: string) => sheet.rows.find(r => r[0] === label)!;
  return { results, row };
};

describe('Excel export follows the selected cost basis', () => {
  it('labels the TCO basis and reports TCO fully loaded cost', () => {
    const { results, row } = costsSheet(withBasis('tco'));
    expect(row('Cost basis')[1]).toMatch(/total cost of ownership/i);
    expect(row('Fully Loaded').slice(1)).toEqual([
      results.cost.fullyLoaded.baseline,
      results.cost.fullyLoaded.transition,
      results.cost.fullyLoaded.mature,
    ]);
  });

  it('labels the chargeable basis and reports chargeable rows that reconcile', () => {
    const { results, row } = costsSheet(withBasis('chargeable'));
    expect(row('Cost basis')[1]).toMatch(/client-chargeable/i);
    expect(row('Fully Loaded').slice(1)).toEqual([
      results.cost.chargeableFullyLoaded.baseline,
      results.cost.chargeableFullyLoaded.transition,
      results.cost.chargeableFullyLoaded.mature,
    ]);
    const [direct, overhead, risk, full] = [row('Direct OPEX'), row('Overhead'), row('Risk'), row('Fully Loaded')];
    for (let i = 1; i <= 3; i++) {
      expect((direct[i] as number) + (overhead[i] as number) + (risk[i] as number)).toBeCloseTo(full[i] as number, 4);
    }
  });
});

describe('PDF report follows the selected cost basis', () => {
  const kpiAfter = (html: string, label: string) => {
    const start = html.indexOf(label);
    return html.slice(start, start + 200).match(/kpi-value">([^<]+)</)?.[1];
  };

  it('states the basis and shows the chargeable mature saving', () => {
    const chargeable = withBasis('chargeable');
    const tco = withBasis('tco');
    const chargeableHtml = generatePdfHtml(chargeable, calculate(chargeable));
    const tcoHtml = generatePdfHtml(tco, calculate(tco));

    expect(chargeableHtml).toContain('Cost basis: Client-chargeable cost');
    expect(tcoHtml).toContain('Cost basis: Total cost of ownership (TCO)');
    // The reference has non-chargeable cost, so the mature saving shown must differ between the two lenses
    expect(kpiAfter(chargeableHtml, 'Mature Saving/mo')).not.toBe(kpiAfter(tcoHtml, 'Mature Saving/mo'));
  });
});
