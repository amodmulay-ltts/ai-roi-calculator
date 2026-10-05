import { useEffect, useRef, useState } from 'react';
import type { Scenario, Results, Currency } from '@ai-roi-calc/engine';
import { calculate, createExampleScenario, convertScenarioCurrency, scenarioToYaml } from '@ai-roi-calc/engine';
import CurrencyChangeDialog from './components/CurrencyChangeDialog';
import TeamSummary from './components/TeamSummary';
import Header from './components/Header';
import RolesGrid from './components/RolesGrid';
import CostLinesGrid from './components/CostLinesGrid';
import WorkloadGrid from './components/WorkloadGrid';
import AiUsagePanel from './components/AiUsagePanel';
import SensitivityPanel from './components/SensitivityPanel';
import CashFlowSection from './components/CashFlowSection';
import CostsSummary from './components/CostsSummary';
import ModelSelector from './components/ModelSelector';
import ModelComparison from './components/ModelComparison';
import AdvicePanel from './components/AdvicePanel';
import ScenarioSetup, { type SetupMode } from './components/ScenarioSetup';
import ExampleBanner from './components/ExampleBanner';
import HelpPresentation from './components/HelpPresentation';
import { loadSavedScenario, saveScenario } from './utils/autosave';
import ScenarioImport from './components/ScenarioImport';
import Tooltip from './components/Tooltip';

const exportFileName = (scenario: Scenario, ext: string) =>
  `VALUEAI_${scenario.name.replace(/[^A-Za-z0-9.-]+/g, '_').slice(0, 80)}_${new Date().toISOString().split('T')[0]}.${ext}`;

type AssumptionTab = 'team' | 'workload' | 'ai' | 'costs';
const ASSUMPTION_TABS: Array<[AssumptionTab, string]> = [
  ['team', 'Team'],
  ['workload', 'Workload'],
  ['ai', 'AI model usage'],
  ['costs', 'Costs and investment'],
];
const SECTIONS: Array<[string, string]> = [
  ['results', 'Results'],
  ['advice', 'Advice'],
  ['delivery', 'Delivery model'],
  ['cashflow', 'Cash flow'],
  ['sensitivity', 'Sensitivity'],
  ['assumptions', 'Assumptions'],
];

export default function App() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState<SetupMode | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingRoles, setEditingRoles] = useState(false);
  const [editingCostLines, setEditingCostLines] = useState(false);
  const [assumptionsTab, setAssumptionsTab] = useState<AssumptionTab>('team');
  const [setupStep, setSetupStep] = useState(1);
  const [pendingCurrency, setPendingCurrency] = useState<Currency | null>(null);

  const [restoredAt, setRestoredAt] = useState<string | null>(null);

  useEffect(() => {
    // A saved example is not user work: always start from the current built-in example instead,
    // so a changed example is not hidden behind an old copy kept in the browser
    const saved = loadSavedScenario();
    const restore = saved && !saved.scenario.isExample ? saved : null;
    const initial = restore?.scenario ?? createExampleScenario();
    if (restore) setRestoredAt(restore.savedAt);
    setScenario(initial);
    setResults(calculate(initial));
    setLoading(false);
  }, []);

  // Autosave to this browser shortly after each change
  useEffect(() => {
    if (!scenario) return;
    const timer = window.setTimeout(() => saveScenario(scenario), 300);
    return () => window.clearTimeout(timer);
  }, [scenario]);

  const handleScenarioUpdate = (updates: Partial<Scenario>) => {
    if (!scenario) return;
    const updatedScenario = { ...scenario, ...updates };
    setScenario(updatedScenario);
    const newResults = calculate(updatedScenario);
    setResults(newResults);
  };

  const replaceScenario = (next: Scenario) => {
    setRestoredAt(null);
    setScenario(next);
    setResults(calculate(next));
  };

  /** Only the current scenario is kept in the browser, so replacing a customer scenario loses it unless saved to a file. */
  const confirmReplace = () =>
    !scenario ||
    scenario.isExample ||
    window.confirm(`Replace "${scenario.name}"? Only the current scenario is kept in this browser. Use Export › Save scenario first to keep a copy.`);

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
  const chargeableBasis = scenario.costChargeable === 'chargeable';
  const basis = chargeableBasis
    ? { direct: cost.chargeableDirectOpex, full: cost.chargeableFullyLoaded }
    : { direct: cost.directOpex, full: cost.fullyLoaded };

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

      <nav aria-label="Sections" className="sticky top-[73px] z-30 bg-gray-50/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 flex gap-6 overflow-x-auto text-sm">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="py-2.5 text-gray-500 hover:text-gray-900 whitespace-nowrap">
              {label}
            </a>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <ScenarioSetup
          mode={setupMode}
          current={scenario}
          initialStep={setupStep}
          onCancel={() => {
            setSetupMode(null);
            setSetupStep(1);
          }}
          onApply={next => {
            replaceScenario(next);
            setSetupMode(null);
            setSetupStep(1);
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

        {restoredAt !== null && (
          <p role="status" className="mb-6 text-sm text-gray-500">
            Restored the scenario saved in this browser
            {restoredAt ? ` on ${new Date(restoredAt).toLocaleString()}` : ''}.{' '}
            <button onClick={() => setRestoredAt(null)} className="text-blue-700 hover:text-blue-900">
              Dismiss
            </button>
          </p>
        )}

        {scenario.isExample && (
          <ExampleBanner
            results={results}
            formatCurrency={formatCurrency}
            onStartNew={() => setSetupMode('new')}
            onHelp={() => setShowHelp(true)}
          />
        )}

        {/* Key Metrics Grid */}
        <section id="results" className="mb-12 scroll-mt-32">
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
              <dd className="text-gray-700 font-medium">{formatCurrency(basis.full.baseline - basis.full.mature)}</dd>
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

        <div id="advice" className="scroll-mt-32">
          <AdvicePanel scenario={scenario} results={results} />
        </div>

        {/* Delivery model: which model, then its parameters */}
        <section id="delivery" className="mb-12 space-y-6 scroll-mt-32" aria-label="Delivery model">
          <ModelComparison
            scenario={scenario}
            formatCurrency={formatCurrency}
            onSelect={model => handleScenarioUpdate({ primaryModel: model })}
          />
          <ModelSelector scenario={scenario} onUpdate={handleScenarioUpdate} />
        </section>

        <section id="cashflow" className="mb-12 scroll-mt-32">
          <CashFlowSection scenario={scenario} results={results} formatCurrency={formatCurrency} onUpdate={handleScenarioUpdate} />
        </section>

        <section id="sensitivity" className="mb-12 scroll-mt-32">
          <SensitivityPanel scenario={scenario} formatCurrency={formatCurrency} />
        </section>

        {/* Assumptions: every input in one place, one tab at a time */}
        <section id="assumptions" className="mb-12 scroll-mt-32" aria-label="Assumptions">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assumptions</h3>
              <p className="text-sm text-gray-600">The inputs behind every figure above. Changes recalculate immediately.</p>
            </div>
            <div role="tablist" aria-label="Assumptions" className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
              {ASSUMPTION_TABS.map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={assumptionsTab === id}
                  aria-controls="assumptions-panel"
                  onClick={() => setAssumptionsTab(id)}
                  className={`px-3 py-1.5 rounded-md text-sm transition ${
                    assumptionsTab === id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div id="assumptions-panel" role="tabpanel" aria-labelledby={`tab-${assumptionsTab}`}>
            {assumptionsTab === 'team' &&
              (editingRoles ? (
                <RolesGrid
                  scenario={scenario}
                  onUpdate={handleScenarioUpdate}
                  onDone={() => setEditingRoles(false)}
                  formatCurrency={formatCurrency}
                />
              ) : (
                <div className="space-y-3">
                  <TeamSummary scenario={scenario} results={results} onUpdate={handleScenarioUpdate} />
                  <button onClick={() => setEditingRoles(true)} className="text-sm text-blue-700 hover:text-blue-900">
                    Edit roles, FTE and rates
                  </button>
                </div>
              ))}
            {assumptionsTab === 'workload' && (
              <WorkloadGrid scenario={scenario} results={results} formatCurrency={formatCurrency} onUpdate={handleScenarioUpdate} />
            )}
            {assumptionsTab === 'ai' && (
              <AiUsagePanel scenario={scenario} results={results} formatCurrency={formatCurrency} onUpdate={handleScenarioUpdate} />
            )}
            {assumptionsTab === 'costs' &&
              (editingCostLines ? (
                <CostLinesGrid
                  costLines={scenario.costLines}
                  onUpdate={updatedLines => handleScenarioUpdate({ costLines: updatedLines })}
                  isEditing={editingCostLines}
                  onDone={() => setEditingCostLines(false)}
                  formatCurrency={formatCurrency}
                />
              ) : (
                <CostsSummary
                  scenario={scenario}
                  results={results}
                  formatCurrency={formatCurrency}
                  onEditLines={() => setEditingCostLines(true)}
                  onEditInvestment={() => {
                    setSetupStep(5);
                    setSetupMode('edit');
                  }}
                />
              ))}
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
