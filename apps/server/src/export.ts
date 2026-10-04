/**
 * Export functionality for PDF and Excel
 */

import type { Scenario, Results } from '@ai-roi-calc/engine';

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]!);
}

export function safeFileName(scenario: Scenario, ext: string): string {
  const base = scenario.name.replace(/[^A-Za-z0-9.-]+/g, '_').slice(0, 80) || 'scenario';
  return `VALUEAI_${base}_${new Date().toISOString().split('T')[0]}.${ext}`;
}

/**
 * Generate PDF report HTML template
 * Server-side rendering with Puppeteer will convert this to PDF
 */
export function generatePdfHtml(scenario: Scenario, results: Results): string {
  const { financialMetrics, cost, effort } = results;
  const currency = scenario.baseCurrency;
  const formatCurrency = (value: number, _currency?: string) =>
    new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      notation: Math.abs(value) >= 100_000 ? 'compact' : 'standard',
      maximumFractionDigits: Math.abs(value) >= 100_000 ? 2 : 0,
    }).format(value);
  const horizon = scenario.timeValue.horizonMonths;
  const discountPct = (scenario.timeValue.discountRateAnnual * 100).toFixed(0);
  const paybackText = financialMetrics.paybackNotInHorizon
    ? `Not within ${horizon} months`
    : financialMetrics.paybackMonth === null
      ? 'No change'
      : `Month ${financialMetrics.paybackMonth}`;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
  <title>${escapeHtml(scenario.name)} - VALUEAI ROI Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .page { page-break-after: always; padding: 40px; min-height: 100vh; }
    h1 { font-size: 36px; margin-bottom: 20px; color: #1f2937; }
    h2 { font-size: 24px; margin-top: 30px; margin-bottom: 15px; color: #374151; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h3 { font-size: 16px; margin-top: 15px; margin-bottom: 10px; color: #4b5563; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
    .kpi-card { background: #f3f4f6; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; }
    .kpi-value { font-size: 28px; font-weight: bold; color: #1f2937; }
    .kpi-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #e5e7eb; padding: 10px; text-align: left; font-weight: bold; }
    td { padding: 10px; border-bottom: 1px solid #d1d5db; }
    tr:nth-child(even) { background: #f9fafb; }
    .highlight { background: #fef3c7; }
    .text-right { text-align: right; }
    .cover { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; min-height: 100vh; }
    .cover h1 { font-size: 48px; margin-bottom: 20px; }
    .cover p { font-size: 18px; color: #6b7280; margin: 10px 0; }
    .metadata { margin-top: 40px; color: #6b7280; }
    .example-flag { position: fixed; top: 0; left: 0; right: 0; padding: 8px; text-align: center; font-size: 12px; font-weight: bold; letter-spacing: 0.08em; color: #1d4ed8; background: #eff6ff; border-bottom: 1px solid #bfdbfe; }
  </style>
</head>
<body>

<!-- Cover Page -->
${scenario.isExample ? '<div class="example-flag">EXAMPLE CALCULATION &middot; FICTIONAL DATA &middot; NOT FOR CUSTOMER DECISIONS</div>' : ''}
<div class="page cover">
  <h1>${escapeHtml(scenario.name)}</h1>
  <p><strong>Client:</strong> ${escapeHtml(scenario.clientName)}</p>
  <p><strong>Use Case:</strong> ${escapeHtml(scenario.useCase)}</p>
  <div class="metadata">
    <p>Generated: ${new Date().toLocaleDateString()}</p>
    <p>Currency: ${scenario.baseCurrency}</p>
  </div>
</div>

<!-- Executive Summary -->
<div class="page">
  <h1>Executive Summary</h1>

  <h2>Key Metrics</h2>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Payback Month</div>
      <div class="kpi-value">${paybackText}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">ROI (${horizon} months)</div>
      <div class="kpi-value">${financialMetrics.roiPercent.toFixed(1)}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">NPV @ ${discountPct}%</div>
      <div class="kpi-value">${formatCurrency(financialMetrics.npv, scenario.baseCurrency)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Mature Saving/mo</div>
      <div class="kpi-value">${formatCurrency(cost.fullyLoaded.baseline - cost.fullyLoaded.mature, scenario.baseCurrency)}</div>
    </div>
  </div>

  <h2>Financial Overview</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th class="text-right">Value</th>
    </tr>
    <tr>
      <td>Total Investment</td>
      <td class="text-right">${formatCurrency(financialMetrics.totalInvestment, scenario.baseCurrency)}</td>
    </tr>
    <tr>
      <td>Total Savings (${horizon} months)</td>
      <td class="text-right">${formatCurrency(financialMetrics.totalSavingsOverHorizon, scenario.baseCurrency)}</td>
    </tr>
    <tr>
      <td>Break-even Month (no investment)</td>
      <td class="text-right">${financialMetrics.breakEvenMonth || 'Not in horizon'}</td>
    </tr>
    <tr>
      <td>Payback Status</td>
      <td class="text-right">${paybackText}</td>
    </tr>
  </table>

  <h2>Cost Model</h2>
  <table>
    <tr>
      <th>State</th>
      <th class="text-right">People Cost</th>
      <th class="text-right">Direct OPEX</th>
      <th class="text-right">Fully Loaded</th>
    </tr>
    <tr>
      <td>Baseline</td>
      <td class="text-right">${formatCurrency(cost.peopleCost.baseline, scenario.baseCurrency)}</td>
      <td class="text-right">${formatCurrency(cost.directOpex.baseline, scenario.baseCurrency)}</td>
      <td class="text-right">${formatCurrency(cost.fullyLoaded.baseline, scenario.baseCurrency)}</td>
    </tr>
    <tr>
      <td>Transition</td>
      <td class="text-right">${formatCurrency(cost.peopleCost.transition, scenario.baseCurrency)}</td>
      <td class="text-right">${formatCurrency(cost.directOpex.transition, scenario.baseCurrency)}</td>
      <td class="text-right">${formatCurrency(cost.fullyLoaded.transition, scenario.baseCurrency)}</td>
    </tr>
    <tr>
      <td>Mature</td>
      <td class="text-right">${formatCurrency(cost.peopleCost.mature, scenario.baseCurrency)}</td>
      <td class="text-right">${formatCurrency(cost.directOpex.mature, scenario.baseCurrency)}</td>
      <td class="text-right">${formatCurrency(cost.fullyLoaded.mature, scenario.baseCurrency)}</td>
    </tr>
  </table>

  <h2>FTE Analysis</h2>
  <table>
    <tr>
      <th>State</th>
      <th class="text-right">Staffing FTE</th>
      <th class="text-right">Effort FTE</th>
      <th class="text-right">Gap</th>
    </tr>
    <tr>
      <td>Baseline</td>
      <td class="text-right">${effort.staffingFte.baseline.toFixed(2)}</td>
      <td class="text-right">${effort.effortFte.baseline.toFixed(2)}</td>
      <td class="text-right">${effort.fteGap.baseline.toFixed(2)}</td>
    </tr>
    <tr>
      <td>Transition</td>
      <td class="text-right">${effort.staffingFte.transition.toFixed(2)}</td>
      <td class="text-right">${effort.effortFte.transition.toFixed(2)}</td>
      <td class="text-right">${effort.fteGap.transition.toFixed(2)}</td>
    </tr>
    <tr>
      <td>Mature</td>
      <td class="text-right">${effort.staffingFte.mature.toFixed(2)}</td>
      <td class="text-right">${effort.effortFte.mature.toFixed(2)}</td>
      <td class="text-right">${effort.fteGap.mature.toFixed(2)}</td>
    </tr>
  </table>

</div>

</body>
</html>
  `;
}

/**
 * Generate Excel workbook data structure
 */
export function generateExcelData(scenario: Scenario, results: Results) {
  const { cost, effort, financialMetrics, monthlyForecast, benefitLedger } = results;

  return {
    sheets: [
      {
        name: 'Summary',
        rows: [
          [scenario.isExample ? 'EXAMPLE CALCULATION - fictional data, not for customer decisions' : 'AI ROI Calculator - Summary Report'],
          [''],
          ['Scenario Name', scenario.name],
          ['Client Name', scenario.clientName],
          ['Use Case', scenario.useCase],
          ['Currency', scenario.baseCurrency],
          ['Generated', new Date().toISOString()],
          [''],
          ['Financial Metrics'],
          ['Payback Month', financialMetrics.paybackMonth],
          [`ROI % (${scenario.timeValue.horizonMonths} months)`, financialMetrics.roiPercent.toFixed(2)],
          [`NPV @ ${(scenario.timeValue.discountRateAnnual * 100).toFixed(0)}%`, financialMetrics.npv.toFixed(2)],
          ['Total Investment', financialMetrics.totalInvestment.toFixed(2)],
          ['Total Savings', financialMetrics.totalSavingsOverHorizon.toFixed(2)],
          ['IRR', financialMetrics.irr ? (financialMetrics.irr * 100).toFixed(2) + '%' : 'N/A'],
        ],
      },
      {
        name: 'Costs',
        rows: [
          ['Cost Analysis by State'],
          [''],
          ['Metric', 'Baseline', 'Transition', 'Mature'],
          ['People Cost', cost.peopleCost.baseline, cost.peopleCost.transition, cost.peopleCost.mature],
          ['Direct OPEX', cost.directOpex.baseline, cost.directOpex.transition, cost.directOpex.mature],
          ['Overhead', cost.overhead.baseline, cost.overhead.transition, cost.overhead.mature],
          ['Risk', cost.risk.baseline, cost.risk.transition, cost.risk.mature],
          ['Fully Loaded', cost.fullyLoaded.baseline, cost.fullyLoaded.transition, cost.fullyLoaded.mature],
        ],
      },
      {
        name: 'Effort',
        rows: [
          ['Effort & FTE Analysis'],
          [''],
          ['Metric', 'Baseline', 'Transition', 'Mature'],
          ['Total Effort (hrs)', effort.totalEffort.baseline, effort.totalEffort.transition, effort.totalEffort.mature],
          ['Effort FTE', effort.effortFte.baseline, effort.effortFte.transition, effort.effortFte.mature],
          ['Staffing FTE', effort.staffingFte.baseline, effort.staffingFte.transition, effort.staffingFte.mature],
          ['FTE Gap', effort.fteGap.baseline, effort.fteGap.transition, effort.fteGap.mature],
          ['Effort Saving %', effort.effortSavingPercent.baseline, effort.effortSavingPercent.transition, effort.effortSavingPercent.mature],
        ],
      },
      {
        name: 'Monthly Forecast',
        rows: [
          ['Month', 'Run Cost', 'Baseline Cost', 'Saving', 'Investment', 'Net Cash Flow', 'Cumulative'],
          ...monthlyForecast.map(m => [
            m.month,
            m.runCostFull.toFixed(2),
            m.baselineCostFull.toFixed(2),
            m.savingFull.toFixed(2),
            m.investmentOutflow.toFixed(2),
            m.netCashFlow.toFixed(2),
            m.cumulativeCashFlow.toFixed(2),
          ]),
        ],
      },
    ],
  };
}
