import { useEffect, useState } from 'react';
import type { Scenario, Currency, KpiInput } from '@ai-roi-calc/engine';
import { createExampleScenario, convertScenarioCurrency, fxFactor, CURRENCIES } from '@ai-roi-calc/engine';
import {
  USE_CASES,
  applyUseCaseTemplate,
  averageCostPerFte,
  detectUseCase,
  rescaleRolesToAverage,
  workloadHours,
  type UseCase,
} from '../utils/roleTemplates';
import Tooltip from './Tooltip';
import ModelSelector from './ModelSelector';

export type SetupMode = 'new' | 'edit';

interface ScenarioSetupProps {
  /** null = closed */
  mode: SetupMode | null;
  /** The scenario being edited (edit mode). */
  current: Scenario;
  onApply: (scenario: Scenario) => void;
  onCancel: () => void;
}

const STEPS = ['Basics', 'Delivery model', 'Timeline', 'Team and workload', 'Investment', 'Team preview', 'Review'];

/** A new customer scenario starts from the example's realistic structure, without its identity. */
function blankScenario(): Scenario {
  return {
    ...createExampleScenario(),
    id: `scenario-${Date.now()}`,
    name: '',
    clientName: '',
    isExample: false,
  };
}

export default function ScenarioSetup({ mode, current, onApply, onCancel }: ScenarioSetupProps) {
  const [step, setStep] = useState(1);
  const [scenario, setScenario] = useState<Scenario>(current);

  // Re-initialise on every open so the form never shows stale values from a previous session
  useEffect(() => {
    if (!mode) return;
    setScenario(mode === 'new' ? blankScenario() : structuredClone(current));
    setStep(1);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mode) return null;

  const isNew = mode === 'new';
  const basicsComplete = scenario.name.trim() !== '' && scenario.clientName.trim() !== '';

  const updateScenario = (updates: Partial<Scenario>) => setScenario(prev => ({ ...prev, ...updates }));

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8 mx-4">
        <div className="px-8 pt-6 pb-4 border-b border-gray-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            {isNew ? 'New scenario' : 'Edit setup'}
          </p>
          <h2 id="setup-title" className="text-2xl font-bold text-gray-900 mb-4">
            {isNew ? 'Set up a customer scenario' : scenario.name || 'Untitled scenario'}
          </h2>
          {/* Guided in new mode (only completed steps reachable); freely clickable in edit mode */}
          <ol className="flex flex-wrap gap-1">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const active = n === step;
              const reachable = n === 1 || (basicsComplete && (!isNew || n <= step + 1));
              return (
                <li key={label}>
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => setStep(n)}
                    aria-current={active ? 'step' : undefined}
                    className={`px-2.5 py-1 rounded-md text-xs transition ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent'
                    }`}
                  >
                    {n}. {label}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="px-8 py-6 min-h-96">
          {step === 1 && (
            <Step1Basic
              scenario={scenario}
              isNew={isNew}
              onUpdate={updateScenario}
              onCurrencyChange={(to: Currency) =>
                setScenario(prev => convertScenarioCurrency(prev, to, fxFactor(prev.baseCurrency, to, prev.fxRatesPerEur)))
              }
            />
          )}
          {step === 2 && <Step2Model scenario={scenario} onUpdate={updateScenario} />}
          {step === 3 && <Step3Timeline scenario={scenario} onUpdate={updateScenario} />}
          {step === 4 && (
            <Step4Roles scenario={scenario} onUpdate={updateScenario} />
          )}
          {step === 5 && <Step5Investment scenario={scenario} onUpdate={updateScenario} />}
          {step === 6 && <Step6TeamPreview scenario={scenario} />}
          {step === 7 && <Step7Review scenario={scenario} isNew={isNew} />}
        </div>

        <div className="bg-gray-50 px-8 py-4 flex gap-3 justify-between items-center border-t rounded-b-xl">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition">
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {!basicsComplete && <span className="text-xs text-gray-500">Enter a scenario name and client to continue</span>}
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 hover:bg-white rounded-lg transition"
              >
                Back
              </button>
            )}
            {step < STEPS.length && (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!basicsComplete}
                className={`px-4 py-2 text-sm rounded-lg transition disabled:opacity-40 ${
                  isNew ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border border-gray-300 text-gray-700 hover:bg-white'
                }`}
              >
                Next
              </button>
            )}
            {(!isNew || step === STEPS.length) && (
              <button
                onClick={() => onApply(scenario)}
                disabled={!basicsComplete}
                className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition"
              >
                {isNew ? 'Create scenario' : 'Apply changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step4Roles({ scenario, onUpdate }: { scenario: Scenario; onUpdate: (u: Partial<Scenario>) => void }) {
  const [useCase, setUseCase] = useState<UseCase>(() => detectUseCase(scenario.useCase));
  const [includeAll, setIncludeAll] = useState(false);

  const workload = scenario.kpis.filter(k => k.volumePerMonth !== undefined);
  const hrsPerFte = scenario.globalAssumptions.workingHrsPerFtePerMonth;
  const hours = workloadHours(workload);
  const workloadFte = hours / hrsPerFte;
  const teamFte = scenario.roles.reduce((sum, r) => sum + r.fte.baseline, 0);
  const mismatch = teamFte > 0 ? Math.abs(workloadFte - teamFte) / teamFte : 0;

  const updateItem = (id: string, changes: Partial<KpiInput>) =>
    onUpdate({ kpis: scenario.kpis.map(k => (k.id === id ? { ...k, ...changes } : k)) });

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Team and workload</h3>
        <p className="text-sm text-gray-600">
          Today's team and the work it does each month. The AI productivity assumption reduces this work; the team
          follows the work.
        </p>
      </div>

      {/* Quiet: template picker */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Start from a template</legend>
        <div role="radiogroup" aria-label="Use case" className="flex flex-wrap gap-2">
          {USE_CASES.map(u => (
            <button
              key={u.id}
              type="button"
              role="radio"
              aria-checked={useCase === u.id}
              title={u.description}
              onClick={() => setUseCase(u.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                useCase === u.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={includeAll} onChange={e => setIncludeAll(e.target.checked)} />
            Add cross-functional roles (product owner, programme manager, security, data architect)
          </label>
          <button
            type="button"
            onClick={() => onUpdate(applyUseCaseTemplate(scenario, useCase, includeAll))}
            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50"
          >
            Apply template
          </button>
        </div>
        <p className="text-xs text-gray-400">Applying replaces the roles, the workload below and the AI model usage.</p>
      </fieldset>

      {/* Hero: does the work match the team? */}
      <div>
        <p className="text-3xl font-semibold text-gray-900">
          {Math.round(hours).toLocaleString('en')} h of work a month
        </p>
        <p className={`text-sm mt-1 ${mismatch > 0.1 ? 'text-blue-800' : 'text-gray-500'}`}>
          = {workloadFte.toFixed(1)} FTE at {hrsPerFte} h each · the team has {teamFte.toFixed(1)} FTE
          {mismatch > 0.1 && ' — more than 10% apart; check volumes, hours per unit or the team'}
        </p>
      </div>

      {/* Supporting: workload table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 text-left">
            <th className="font-normal pb-2">Work item</th>
            <th className="font-normal pb-2 text-right">Volume / month</th>
            <th className="font-normal pb-2 text-right">Hours each, today</th>
            <th className="font-normal pb-2 text-right">Hours / month</th>
          </tr>
        </thead>
        <tbody>
          {workload.map(k => (
            <tr key={k.id} className="border-t border-gray-100">
              <td className="py-2 pr-2">
                <span className="block text-gray-900">{k.name}</span>
                <span className="block text-xs text-gray-400">
                  {k.appliesToFactor ? 'AI-assisted' : 'Not affected by AI'}
                  {k.reviewOverheadApplies ? ' · review overhead applies' : ''}
                </span>
              </td>
              <td className="py-2 text-right">
                <input
                  type="number"
                  min={0}
                  aria-label={`${k.name}: ${k.volumeUnit ?? 'units'} per month`}
                  value={k.volumePerMonth}
                  onChange={e => updateItem(k.id, { volumePerMonth: Number(e.target.value) || 0 })}
                  className="w-24 px-2 py-1 text-right border border-gray-300 rounded"
                />
                <span className="block text-xs text-gray-400">{k.volumeUnit}</span>
              </td>
              <td className="py-2 text-right">
                <input
                  type="number"
                  min={0}
                  step="any"
                  aria-label={`${k.name}: hours per unit today`}
                  value={k.baseline}
                  onChange={e => updateItem(k.id, { baseline: Number(e.target.value) || 0 })}
                  className="w-24 px-2 py-1 text-right border border-gray-300 rounded"
                />
              </td>
              <td className="py-2 text-right text-gray-600">
                {Math.round((k.volumePerMonth ?? 0) * k.baseline).toLocaleString('en')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <label htmlFor="avg-onshore" className="flex items-center text-sm font-semibold text-gray-900 mb-2">
          Average onshore cost per FTE per month ({scenario.baseCurrency})
          <Tooltip text="Fully loaded internal cost of an onshore team member in the customer's location. All role rates are rescaled to this average, keeping their relative grade differences. BCC rates are derived from it using the BCC cost percentage." />
        </label>
        <input
          id="avg-onshore"
          type="number"
          min={0}
          step={100}
          value={Math.round(averageCostPerFte(scenario.roles))}
          onChange={e => onUpdate({ roles: rescaleRolesToAverage(scenario.roles, Number(e.target.value)) })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Template rates come from an India-based reference team. Replace them with the customer's onshore cost.
        </p>
      </div>

      <p className="text-xs text-gray-500">
        {scenario.roles.length} roles. Edit individual roles, and how each work item changes with AI, on the dashboard.
      </p>
    </div>
  );
}

function Step1Basic({ scenario, isNew, onUpdate, onCurrencyChange }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h3>
        <p className="text-sm text-gray-600 mb-4">
          Start by naming your scenario and identifying the client. This information appears in all reports.
        </p>
      </div>

      {scenario.isExample && (
        <label className="flex items-start gap-2 text-sm text-gray-700 bg-blue-50 border-l-4 border-blue-600 px-4 py-3">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={scenario.isExample}
            onChange={(e) => onUpdate({ isExample: e.target.checked })}
          />
          <span>
            Marked as an example with fictional data. Untick when this becomes a real customer scenario, so reports
            and exports are no longer labelled as an example.
          </span>
        </label>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Scenario Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={scenario.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="e.g., Acme Corp - AI Testing ROI 2026"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">Used in reports, exports, and scenario management</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Client Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={scenario.clientName}
          onChange={(e) => onUpdate({ clientName: e.target.value })}
          placeholder="e.g., Acme Corporation"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">Your customer or internal business unit</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Use Case <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={scenario.useCase}
          onChange={(e) => onUpdate({ useCase: e.target.value })}
          placeholder="e.g., AI-Augmented Software Testing"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">What AI application are you evaluating? (Testing, Support, Automation, etc.)</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="setup-currency" className="block text-sm font-semibold text-gray-900 mb-2">Currency</label>
          {isNew ? (
            <>
              <select
                id="setup-currency"
                value={scenario.baseCurrency}
                onChange={(e) => onCurrencyChange(e.target.value as Currency)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Enter all amounts in this currency. Starting rates are converted for you.</p>
            </>
          ) : (
            <>
              <p id="setup-currency" className="px-4 py-2 text-gray-900">{scenario.baseCurrency}</p>
              <p className="text-xs text-gray-500 mt-1">
                Change it from the currency menu in the header, where you choose to convert or relabel.
              </p>
            </>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Forecast Horizon
            <Tooltip text="How many months into the future do you want to project? 36 months (3 years) is standard for ROI analysis." />
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="12"
              max="60"
              value={scenario.timeValue.horizonMonths}
              onChange={(e) =>
                onUpdate({
                  timeValue: { ...scenario.timeValue, horizonMonths: parseInt(e.target.value) },
                })
              }
              className="flex-1"
            />
            <span className="w-12 text-right font-semibold">{scenario.timeValue.horizonMonths}mo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step2Model({ scenario, onUpdate }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Delivery Model</h3>
        <p className="text-sm text-gray-600">
          Set where the team sits today, then choose the target model. Every model is compared against the same
          baseline, and its parameters stay editable on the dashboard.
        </p>
      </div>
      <ModelSelector scenario={scenario} onUpdate={onUpdate} />
    </div>
  );
}

function Step3Timeline({ scenario, onUpdate }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Transition & Timeline</h3>
        <p className="text-sm text-gray-600 mb-4">
          How long will it take to go from current state to fully deployed AI? This affects costs during the transition period.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Transition Period (Months)
          <Tooltip text="Time to ramp up from baseline to mature state. Includes training, dual-run, integration. Typically 2-6 months." />
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="12"
            value={scenario.globalAssumptions.transitionLengthMonths}
            onChange={(e) =>
              onUpdate({
                globalAssumptions: {
                  ...scenario.globalAssumptions,
                  transitionLengthMonths: parseInt(e.target.value),
                },
              })
            }
            className="flex-1"
          />
          <span className="w-12 text-right font-semibold text-lg">
            {scenario.globalAssumptions.transitionLengthMonths}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Discount Rate (Annual %)
          <Tooltip text="The financial cost of capital. Higher rates penalize future returns. Use 8-15% for tech investments. Higher (15%+) for uncertain investments." />
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={scenario.timeValue.discountRateAnnual * 100}
            onChange={(e) =>
              onUpdate({
                timeValue: { ...scenario.timeValue, discountRateAnnual: parseInt(e.target.value) / 100 },
              })
            }
            className="flex-1"
          />
          <span className="w-12 text-right font-semibold text-lg">
            {(scenario.timeValue.discountRateAnnual * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function Step5Investment({ scenario, onUpdate }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Initial Investment</h3>
        <p className="text-sm text-gray-600 mb-4">
          One-time costs to get the AI solution up and running. These are paid upfront and affect payback timing.
        </p>
      </div>

      <div className="space-y-4">
        {scenario.oneTimeInvestment.map((item: any, idx: number) => (
          <div key={item.id}>
            <label htmlFor={`inv-${item.id}`} className="block text-sm font-semibold text-gray-900 mb-1">{item.name}</label>
            <input
              id={`inv-${item.id}`}
              type="number"
              value={item.amount}
              onChange={(e) => {
                const updated = scenario.oneTimeInvestment.map((it: any, i: number) =>
                  i === idx ? { ...it, amount: Number(e.target.value) || 0 } : it
                );
                onUpdate({ oneTimeInvestment: updated });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500">
                {item.name === 'Setup and integration'
                  ? 'Infrastructure, tools, integrations, licensing'
                  : item.name === 'Training and enablement'
                    ? 'Team training, change management, documentation'
                    : 'Contingency reserve, unexpected costs'}
              </p>
              <label className="flex items-center gap-1.5 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={item.aiSpecific}
                  onChange={(e) => {
                    const updated = scenario.oneTimeInvestment.map((it: any, i: number) =>
                      i === idx ? { ...it, aiSpecific: e.target.checked } : it
                    );
                    onUpdate({ oneTimeInvestment: updated });
                  }}
                />
                AI-specific
                <Tooltip text="AI-specific items scale with AI adoption and drop to zero for models without AI. Other items apply to any change in delivery." />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-gray-900">
          <strong>Total Investment:</strong> {scenario.oneTimeInvestment.reduce((sum: number, item: any) => sum + item.amount, 0).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function Step6TeamPreview({ scenario }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Team Staffing Preview</h3>
        <p className="text-sm text-gray-600 mb-4">
          How many people are needed in each role? Baseline = current state, Mature = fully AI-enabled state.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-gray-900">
          <strong>Tip:</strong> Edit the FTE table after creating the scenario. You can adjust all 9 roles there.
        </p>
      </div>

      <div className="space-y-3">
        {scenario.roles.slice(0, 4).map((role: any) => (
          <div key={role.id} className="p-3 bg-gray-50 rounded-lg">
            <div className="font-semibold text-sm text-gray-900">{role.name}</div>
            <div className="text-xs text-gray-600 mt-1">
              Baseline: {role.fte.baseline} → Mature: {role.fte.mature} FTE
            </div>
          </div>
        ))}
        <div className="text-xs text-gray-500 text-center pt-2">
          {scenario.roles.length - 4} more roles in the full list
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-gray-900">
          <strong>Next Step:</strong> After setup, use "Edit Roles" on the dashboard to fine-tune all staffing numbers.
        </p>
      </div>
    </div>
  );
}

function Step7Review({ scenario, isNew }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Review & Confirm</h3>
        <p className="text-sm text-gray-600 mb-4">
          Check the details below. You can reopen this setup at any time from the Scenario menu.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm"><span className="font-semibold">Scenario:</span> {scenario.name}</div>
          <div className="text-sm"><span className="font-semibold">Client:</span> {scenario.clientName}</div>
          <div className="text-sm"><span className="font-semibold">Use Case:</span> {scenario.useCase}</div>
          <div className="text-sm"><span className="font-semibold">Currency:</span> {scenario.baseCurrency}</div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm"><span className="font-semibold">Horizon:</span> {scenario.timeValue.horizonMonths} months</div>
          <div className="text-sm"><span className="font-semibold">Transition:</span> {scenario.globalAssumptions.transitionLengthMonths} months</div>
          <div className="text-sm"><span className="font-semibold">Discount Rate:</span> {(scenario.timeValue.discountRateAnnual * 100).toFixed(0)}%</div>
          <div className="text-sm"><span className="font-semibold">Model:</span> {scenario.primaryModel}</div>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-sm text-gray-900">
            {isNew ? (
              <>Your scenario is ready. Select <strong>Create scenario</strong> to see the results.</>
            ) : (
              <>Select <strong>Apply changes</strong> to recalculate the dashboard.</>
            )}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            You'll then be able to edit team roles, costs, KPIs, and see real-time financial analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
