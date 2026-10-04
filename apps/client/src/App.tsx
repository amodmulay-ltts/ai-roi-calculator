import { useEffect, useRef, useState } from 'react';
import type { Scenario, Results, Currency } from '@ai-roi-calc/engine';
import { calculate, createExampleScenario, convertScenarioCurrency, scenarioToYaml } from '@ai-roi-calc/engine';
import CurrencyChangeDialog from './components/CurrencyChangeDialog';
import TeamSummary from './components/TeamSummary';
import Header from './components/Header';
import RolesGrid from './components/RolesGrid';
import CostLinesGrid from './components/CostLinesGrid';
import KpisGrid from './components/KpisGrid';
import CumulativeCashFlowChart from './components/CumulativeCashFlowChart';
import MonthlyOpexChart from './components/MonthlyOpexChart';
import FtePyramidChart from './components/FtePyramidChart';
import TornadoChart from './components/TornadoChart';
import SensitivityGrid from './components/SensitivityGrid';
import ModelSelector from './components/ModelSelector';
import ModelComparison from './components/ModelComparison';
import ScenarioSetup, { type SetupMode } from './components/ScenarioSetup';
import ExampleBanner from './components/ExampleBanner';
import HelpPresentation from './components/HelpPresentation';
import ScenarioImport from './components/ScenarioImport';
import Tooltip from './components/Tooltip';

const exportFileName = (scenario: Scenario, ext: string) =>
  `VALUEAI_${scenario.name.replace(/[^A-Za-z0-9.-]+/g, '_').slice(0, 80)}_${new Date().toISOString().split('T')[0]}.${ext}`;

export default function App() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState<SetupMode | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingRoles, setEditingRoles] = useState(false);
  const [editingCostLines, setEditingCostLines] = useState(false);
  const [editingKpis, setEditingKpis] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    const example = createExampleScenario();
    setScenario(example);
    setResults(calculate(example));
    setLoading(false);
  }, []);

  const handleScenarioUpdate = (updates: Partial<Scenario>) => {
    if (!scenario) return;
    const updatedScenario = { ...scenario, ...updates };
    setScenario(updatedScenario);
    const newResults = calculate(updatedScenario);
    setResults(newResults);
  };

  const replaceScenario = (next: Scenario) => {
    setScenario(next);
    setResults(calculate(next));
  };

  /** Replacing a customer scenario discards unsaved edits; the example can always be reloaded. */
  const confirmReplace = () =>
    !scenario ||
    scenario.isExample ||
    window.confirm(`Replace "${scenario.name}"? Unsaved changes will be lost. Use Export › Save scenario first to keep them.`);

  const handleLoadExample = () => {
    if (confirmReplace()) replaceScenario(createExampleScenario());
  };

  const handleOpenFile = () => {
    if (confirmReplace()) fileInputRef.current?.click();
  };

  const handleExport = () => {
    if (!scenario || !results) return;
    const dataStr = JSON.stringify({ scenario, results }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFileName(scenario, 'json');
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (!scenario) return;
    try {
      const response = await fetch('http://localhost:3001/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario),
      });
      const html = await response.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportFileName(scenario, 'html');
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Make sure the server is running.');
    }
  };

  const handleExportExcel = async () => {
    if (!scenario) return;
    try {
      const response = await fetch('http://localhost:3001/api/export/xlsx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario),
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportFileName(scenario, 'xlsx');
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('Failed to export Excel. Make sure the server is running.');
    }
  };

  const handleCurrencyChange = (newCurrency: string) => {
    if (scenario && newCurrency !== scenario.baseCurrency) {
      setPendingCurrency(newCurrency as Currency);
    }
  };

  const applyCurrencyChange = (factor: number) => {
    if (!scenario || !pendingCurrency) return;
    const converted = convertScenarioCurrency(scenario, pendingCurrency, factor);
    if (factor !== 1) {
      converted.fxRatesPerEur = {
        ...scenario.fxRatesPerEur,
        [pendingCurrency]: factor * scenario.fxRatesPerEur[scenario.baseCurrency],
      };
    }
    setScenario(converted);
    setResults(calculate(converted));
    setPendingCurrency(null);
  };

  const handleImportScenario = (importedScenario: Scenario) => replaceScenario(importedScenario);

  const handleExportYaml = () => {
    if (!scenario) return;
    const blob = new Blob([scenarioToYaml(scenario)], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFileName(scenario, 'yaml');
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateCumulativeCashFlowData = () => {
    if (!results) return [];

    return results.monthlyForecast.map(mf => ({
      month: mf.month,
      cumulativeSavings: mf.cumulativeCashFlow + mf.investmentOutflow,
      cumulativeCost: mf.investmentOutflow,
      netCashFlow: mf.cumulativeCashFlow,
    }));
  };

  const generateMonthlyOpexData = () => {
    if (!results || !scenario) return [];
    const forecast = results.monthlyForecast;
    const transitionEnd = scenario.globalAssumptions.transitionLengthMonths;

    const months = [
      0,
      Math.floor(transitionEnd / 2),
      transitionEnd,
      Math.min(transitionEnd + 12, forecast.length - 1),
    ];

    const baselineState = results.cost.fullyLoaded.baseline;
    const transitionState = results.cost.fullyLoaded.transition;
    const matureState = results.cost.fullyLoaded.mature;

    return months.map(month => ({
      month,
      baseline: month < transitionEnd ? baselineState : 0,
      transition: month < transitionEnd ? transitionState : 0,
      mature: month >= transitionEnd ? matureState : 0,
    }));
  };

  const generateFteData = () => {
    if (!results) return [];
    return [
      {
        state: 'Baseline',
        staffingFte: results.effort.staffingFte.baseline || 0,
        effortFte: results.effort.effortFte.baseline || 0,
      },
      {
        state: 'Transition',
        staffingFte: results.effort.staffingFte.transition || 0,
        effortFte: results.effort.effortFte.transition || 0,
      },
      {
        state: 'Mature',
        staffingFte: results.effort.staffingFte.mature || 0,
        effortFte: results.effort.effortFte.mature || 0,
      },
    ];
  };

  const generateTornadoData = () => {
    if (!results || !scenario) return [];

    const baseNpv = results.financialMetrics.npv;
    const horizonMonths = scenario.timeValue.horizonMonths;
    const discountRate = scenario.timeValue.discountRateAnnual;

    const variables = [
      {
        name: 'Horizon',
        variation: (v: Scenario) => ({ ...v, timeValue: { ...v.timeValue, horizonMonths: horizonMonths * 0.8 } }),
        variation2: (v: Scenario) => ({ ...v, timeValue: { ...v.timeValue, horizonMonths: horizonMonths * 1.2 } }),
      },
      {
        name: 'Discount Rate',
        variation: (v: Scenario) => ({ ...v, timeValue: { ...v.timeValue, discountRateAnnual: Math.max(0, discountRate - 0.02) } }),
        variation2: (v: Scenario) => ({ ...v, timeValue: { ...v.timeValue, discountRateAnnual: discountRate + 0.02 } }),
      },
      {
        name: 'Transition Cost',
        variation: (v: Scenario) => ({
          ...v,
          costLines: v.costLines.map(cl => ({
            ...cl,
            monthlyAmount: {
              ...cl.monthlyAmount,
              transition: cl.monthlyAmount.transition * 0.8,
            },
          })),
        }),
        variation2: (v: Scenario) => ({
          ...v,
          costLines: v.costLines.map(cl => ({
            ...cl,
            monthlyAmount: {
              ...cl.monthlyAmount,
              transition: cl.monthlyAmount.transition * 1.2,
            },
          })),
        }),
      },
      {
        name: 'Mature Savings',
        variation: (v: Scenario) => ({
          ...v,
          costLines: v.costLines.map(cl => ({
            ...cl,
            monthlyAmount: {
              ...cl.monthlyAmount,
              mature: cl.monthlyAmount.mature * 1.2,
            },
          })),
        }),
        variation2: (v: Scenario) => ({
          ...v,
          costLines: v.costLines.map(cl => ({
            ...cl,
            monthlyAmount: {
              ...cl.monthlyAmount,
              mature: cl.monthlyAmount.mature * 0.8,
            },
          })),
        }),
      },
    ];

    return variables.map(v => {
      const lowResults = calculate(v.variation(scenario));
      const highResults = calculate(v.variation2(scenario));

      return {
        variable: v.name,
        low: lowResults.financialMetrics.npv,
        base: baseNpv,
        high: highResults.financialMetrics.npv,
        range: Math.abs(highResults.financialMetrics.npv - lowResults.financialMetrics.npv),
      };
    });
  };

  const generateSensitivityGrid = () => {
    if (!results || !scenario) return {};

    const horizonVariations = [0.8, 0.9, 1.0, 1.1, 1.2];
    const discountVariations = [-0.04, -0.02, 0, 0.02, 0.04];

    const grid: Record<string, Record<string, number>> = {};

    horizonVariations.forEach(hVar => {
      const horizonKey = `${(hVar * 100).toFixed(0)}%`;
      grid[horizonKey] = {};

      discountVariations.forEach(dVar => {
        const discountKey = `${((scenario.timeValue.discountRateAnnual + dVar) * 100).toFixed(0)}%`;
        const modScenario = {
          ...scenario,
          timeValue: {
            ...scenario.timeValue,
            horizonMonths: scenario.timeValue.horizonMonths * hVar,
            discountRateAnnual: scenario.timeValue.discountRateAnnual + dVar,
          },
        };
        const res = calculate(modScenario);
        grid[horizonKey][discountKey] = res.financialMetrics.npv;
      });
    });

    return grid;
  };

  const formatCurrency = (value: number, currency = scenario?.baseCurrency || 'EUR') => {
    const symbols: Record<string, string> = {
      'EUR': '€',
      'USD': '$',
      'GBP': '£',
      'JPY': '¥',
      'INR': '₹',
      'AED': 'د.إ',
      'SGD': 'S$',
      'AUD': 'A$',
      'CAD': 'C$',
      'CHF': 'CHF',
    };
    const symbol = (value < 0 ? '−' : '') + (symbols[currency] || currency);
    const abs = Math.abs(value);

    // Use K/M/B for most currencies, L/Cr for INR
    if (currency === 'INR') {
      if (abs >= 10_000_000) {
        return `${symbol}${(abs / 10_000_000).toFixed(2)} Cr`;
      }
      if (abs >= 100_000) {
        return `${symbol}${(abs / 100_000).toFixed(2)} L`;
      }
      return `${symbol}${abs.toFixed(0)}`;
    } else {
      if (abs >= 1_000_000) {
        return `${symbol}${(abs / 1_000_000).toFixed(2)}M`;
      }
      if (abs >= 1_000) {
        return `${symbol}${(abs / 1_000).toFixed(1)}K`;
      }
      return `${symbol}${abs.toFixed(0)}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm mb-4">
              <span className="text-white font-bold text-lg">V</span>
            </div>
          </div>
          <p className="text-gray-600 text-sm mt-4">Loading VALUEAI...</p>
        </div>
      </div>
    );
  }

  if (!results || !scenario) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const { financialMetrics, cost, effort } = results;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        currency={scenario.baseCurrency}
        onCurrencyChange={handleCurrencyChange}
        onNewScenario={() => setSetupMode('new')}
        onEditSetup={() => setSetupMode('edit')}
        onOpenFile={handleOpenFile}
        onLoadExample={handleLoadExample}
        onSaveYaml={handleExportYaml}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onExportJson={handleExport}
        onHelp={() => setShowHelp(true)}
      />
      <HelpPresentation open={showHelp} onClose={() => setShowHelp(false)} onStartNew={() => setSetupMode('new')} />
      <ScenarioImport ref={fileInputRef} onImport={handleImportScenario} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <ScenarioSetup
          mode={setupMode}
          current={scenario}
          onCancel={() => setSetupMode(null)}
          onApply={next => {
            replaceScenario(next);
            setSetupMode(null);
          }}
        />
        <CurrencyChangeDialog
          scenario={scenario}
          target={pendingCurrency}
          onConvert={applyCurrencyChange}
          onRelabel={() => applyCurrencyChange(1)}
          onCancel={() => setPendingCurrency(null)}
        />

        {/* Scenario identity */}
        <div className="mb-8">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2">
            <h2 className="text-3xl font-bold text-gray-900">{scenario.name}</h2>
            <button onClick={() => setSetupMode('edit')} className="text-sm text-blue-700 hover:text-blue-900">
              Edit setup
            </button>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
            <span>Client: <span className="text-gray-700">{scenario.clientName}</span></span>
            <span>Use case: <span className="text-gray-700">{scenario.useCase}</span></span>
            <span>Horizon: <span className="text-gray-700">{scenario.timeValue.horizonMonths} months</span></span>
          </div>
        </div>

        {scenario.isExample && (
          <ExampleBanner
            results={results}
            formatCurrency={formatCurrency}
            onStartNew={() => setSetupMode('new')}
            onHelp={() => setShowHelp(true)}
          />
        )}

        {/* Key Metrics Grid */}
        <section className="mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Hero */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-blue-200 p-8 flex flex-col justify-center">
              <div className="flex items-center mb-3">
                <p className="text-sm font-medium text-blue-700">Net value created</p>
                <Tooltip text="Net Present Value: all savings minus the investment over the forecast horizon, discounted to today's money at the discount rate. Positive means the initiative creates value." />
              </div>
              <p className={`text-6xl font-bold tracking-tight ${financialMetrics.npv >= 0 ? 'text-blue-700' : 'text-gray-900'}`}>
                {formatCurrency(financialMetrics.npv)}
              </p>
              <p className="text-sm text-gray-500 mt-3">
                NPV over {scenario.timeValue.horizonMonths} months at {(scenario.timeValue.discountRateAnnual * 100).toFixed(0)}% discount rate
              </p>
            </div>

            {/* Supporting */}
            <div className="grid grid-rows-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center mb-1">
                  <p className="text-sm font-medium text-gray-600">Payback</p>
                  <Tooltip text="First month in which cumulative savings minus investment turns positive, read from the monthly cash-flow series." />
                </div>
                <p className="text-3xl font-semibold text-gray-900">
                  {financialMetrics.paybackNotInHorizon
                    ? 'Not within horizon'
                    : financialMetrics.paybackMonth === null
                      ? 'No change'
                      : `Month ${financialMetrics.paybackMonth}`}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center mb-1">
                  <p className="text-sm font-medium text-gray-600">ROI</p>
                  <Tooltip text="(Total savings − total investment) ÷ total investment, over the forecast horizon. Undiscounted." />
                </div>
                <p className="text-3xl font-semibold text-gray-900">{financialMetrics.roiPercent.toFixed(0)}%</p>
              </div>
            </div>
          </div>

          {/* Quiet details */}
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500">Monthly saving (mature)</dt>
              <dd className="text-gray-700 font-medium">{formatCurrency(cost.fullyLoaded.baseline - cost.fullyLoaded.mature)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Total investment</dt>
              <dd className="text-gray-700 font-medium">{formatCurrency(financialMetrics.totalInvestment)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">IRR (annual)</dt>
              <dd className="text-gray-700 font-medium">{financialMetrics.irr === null ? '—' : `${(financialMetrics.irr * 100).toFixed(0)}%`}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Effort saving (mature)</dt>
              <dd className="text-gray-700 font-medium">{(effort.effortSavingPercent.mature * 100).toFixed(1)}%</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Team FTE</dt>
              <dd className="text-gray-700 font-medium">
                {effort.staffingFte.baseline.toFixed(0)} → {effort.staffingFte.transition.toFixed(0)} → {effort.staffingFte.mature.toFixed(0)}
              </dd>
            </div>
          </dl>
        </section>

        {/* Delivery model: which model, then its parameters */}
        <section className="mb-12 space-y-6" aria-label="Delivery model">
          <ModelComparison
            scenario={scenario}
            formatCurrency={formatCurrency}
            onSelect={model => handleScenarioUpdate({ primaryModel: model })}
          />
          <ModelSelector scenario={scenario} onUpdate={handleScenarioUpdate} />
        </section>

        {/* Cost Model */}
        <section className="mb-12">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-6">Cost Model</h3>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">State</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">People Cost</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Direct OPEX</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Fully Loaded</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">vs Baseline</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">Baseline</td>
                  <td className="px-6 py-3 text-sm text-right text-gray-700">{formatCurrency(cost.peopleCost.baseline)}</td>
                  <td className="px-6 py-3 text-sm text-right text-gray-700">{formatCurrency(cost.directOpex.baseline)}</td>
                  <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">{formatCurrency(cost.fullyLoaded.baseline)}</td>
                  <td className="px-6 py-3 text-sm text-right text-gray-400">—</td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">Transition</td>
                  <td className="px-6 py-3 text-sm text-right text-gray-700">{formatCurrency(cost.peopleCost.transition)}</td>
                  <td className="px-6 py-3 text-sm text-right text-gray-700">{formatCurrency(cost.directOpex.transition)}</td>
                  <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">{formatCurrency(cost.fullyLoaded.transition)}</td>
                  <td className="px-6 py-3 text-sm text-right text-red-600 font-medium">+{formatCurrency(cost.fullyLoaded.transition - cost.fullyLoaded.baseline)}</td>
                </tr>
                <tr className="bg-blue-50 hover:bg-blue-100 transition">
                  <td className="px-6 py-3 text-sm font-semibold text-gray-900">Mature</td>
                  <td className="px-6 py-3 text-sm text-right text-gray-700">{formatCurrency(cost.peopleCost.mature)}</td>
                  <td className="px-6 py-3 text-sm text-right text-gray-700">{formatCurrency(cost.directOpex.mature)}</td>
                  <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">{formatCurrency(cost.fullyLoaded.mature)}</td>
                  <td className="px-6 py-3 text-sm text-right text-green-600 font-semibold">−{formatCurrency(cost.fullyLoaded.baseline - cost.fullyLoaded.mature)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Input Grids Section */}
        <section className="mb-12">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Editable Inputs</h3>
              <button
                onClick={() => setEditingRoles(!editingRoles)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                {editingRoles ? 'Editing Roles' : 'Edit Roles'}
              </button>
            </div>
            {editingRoles && scenario ? (
              <RolesGrid
                roles={scenario.roles}
                onUpdate={(updatedRoles) => handleScenarioUpdate({ roles: updatedRoles })}
                isEditing={editingRoles}
                onDone={() => setEditingRoles(false)}
                formatCurrency={formatCurrency}
              />
            ) : (
              <TeamSummary scenario={scenario} results={results} onUpdate={handleScenarioUpdate} />
            )}
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Cost Lines</h3>
              <button
                onClick={() => setEditingCostLines(!editingCostLines)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                {editingCostLines ? 'Editing Costs' : 'Edit Cost Lines'}
              </button>
            </div>
            {editingCostLines && scenario ? (
              <CostLinesGrid
                costLines={scenario.costLines}
                onUpdate={(updatedLines) => handleScenarioUpdate({ costLines: updatedLines })}
                isEditing={editingCostLines}
                onDone={() => setEditingCostLines(false)}
                formatCurrency={formatCurrency}
              />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Cost Lines</h4>
                <div className="space-y-2 text-sm">
                  {Array.from(new Set(scenario?.costLines.map(c => c.category) || [])).map(cat => {
                    const lines = scenario?.costLines.filter(c => c.category === cat) || [];
                    return (
                      <div key={cat} className="text-gray-600">
                        <span className="font-medium text-gray-700">{cat}</span>
                        <span className="text-gray-500 ml-2">({lines.length} items)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">KPI Inputs</h3>
              <button
                onClick={() => setEditingKpis(!editingKpis)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                {editingKpis ? 'Editing KPIs' : 'Edit KPIs'}
              </button>
            </div>
            {editingKpis && scenario ? (
              <KpisGrid
                kpis={scenario.kpis}
                onUpdate={(updatedKpis) => handleScenarioUpdate({ kpis: updatedKpis })}
                isEditing={editingKpis}
                onDone={() => setEditingKpis(false)}
              />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">KPI Inputs</h4>
                <div className="space-y-2 text-sm">
                  <div className="text-gray-600">
                    <span className="font-medium text-gray-700">Baseline KPIs</span>
                    <span className="text-gray-500 ml-2">({scenario?.kpis.filter(k => !k.overrides || Object.keys(k.overrides).length === 0).length} defined)</span>
                  </div>
                  <div className="text-gray-600">
                    <span className="font-medium text-gray-700">Transition Overrides</span>
                    <span className="text-gray-500 ml-2">({scenario?.kpis.filter(k => k.overrides?.transition).length})</span>
                  </div>
                  <div className="text-gray-600">
                    <span className="font-medium text-gray-700">Mature Overrides</span>
                    <span className="text-gray-500 ml-2">({scenario?.kpis.filter(k => k.overrides?.mature).length})</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Visualizations */}
        <section className="mb-12">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-6">Visualizations</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <CumulativeCashFlowChart
              data={generateCumulativeCashFlowData()}
              formatCurrency={formatCurrency}
            />
            <MonthlyOpexChart
              data={generateMonthlyOpexData()}
              formatCurrency={formatCurrency}
            />
          </div>
          <FtePyramidChart data={generateFteData()} />
        </section>

        {/* Sensitivity Analysis */}
        <section className="mb-12">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-6">Analysis</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <TornadoChart
              data={generateTornadoData()}
              formatCurrency={formatCurrency}
              metric="npv"
            />
            <SensitivityGrid
              data={generateSensitivityGrid()}
              rowLabel="Horizon (%)"
              colLabel="Discount Rate (%)"
              formatCurrency={formatCurrency}
            />
          </div>
        </section>

        {/* FTE Analysis */}
        <section className="mb-12">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-6">FTE & Effort</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Staffing FTE</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-gray-600">Baseline</span><span className="font-semibold text-gray-900">{effort.staffingFte.baseline.toFixed(1)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Transition</span><span className="font-semibold text-gray-900">{effort.staffingFte.transition.toFixed(1)}</span></div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-100"><span className="text-gray-600">Mature</span><span className="font-semibold text-blue-600">{effort.staffingFte.mature.toFixed(1)}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Effort FTE</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-gray-600">Baseline</span><span className="font-semibold text-gray-900">{effort.effortFte.baseline.toFixed(1)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Transition</span><span className="font-semibold text-gray-900">{effort.effortFte.transition.toFixed(1)}</span></div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-100"><span className="text-gray-600">Mature</span><span className="font-semibold text-blue-600">{effort.effortFte.mature.toFixed(1)}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Effort Saving</h4>
              <div className="space-y-3">
                <div className="text-3xl font-bold text-green-600 mb-2">{(effort.effortSavingPercent.mature * 100).toFixed(1)}%</div>
                <p className="text-xs text-gray-600">Reduction in mature state vs baseline</p>
              </div>
            </div>
          </div>
        </section>

        {/* Financial Summary */}
        <section className="mb-12">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-6">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Investment & Returns</h4>
              <div className="space-y-3">
                <div className="flex justify-between pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Total Investment</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(financialMetrics.totalInvestment)}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Total Savings</span>
                  <span className="text-sm font-semibold text-green-600">+{formatCurrency(financialMetrics.totalSavingsOverHorizon)}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-sm font-semibold text-gray-900">Net Benefit</span>
                  <span className="text-sm font-bold text-green-700">+{formatCurrency(financialMetrics.totalSavingsOverHorizon - financialMetrics.totalInvestment)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Break-even & Payback</h4>
              <div className="space-y-3">
                <div className="flex justify-between pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Break-even Month</span>
                  <span className="text-sm font-semibold text-gray-900">{financialMetrics.breakEvenMonth || '—'}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Payback Month</span>
                  <span className="text-sm font-semibold text-gray-900">{financialMetrics.paybackMonth || '—'}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-sm font-semibold text-gray-900">IRR</span>
                  <span className="text-sm font-semibold text-blue-600">{financialMetrics.irr ? (financialMetrics.irr * 100).toFixed(1) + '%' : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
          <p>VALUEAI — AI ROI Analysis Platform</p>
          <p className="mt-1">Ready for export and scenario management</p>
        </footer>
      </main>
    </div>
  );
}
