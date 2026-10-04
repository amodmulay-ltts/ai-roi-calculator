import { useState } from 'react';
import type { Scenario, Currency } from '@ai-roi-calc/engine';
import { createDefaultScenario, convertScenarioCurrency, fxFactor, CURRENCIES } from '@ai-roi-calc/engine';
import { getRolesForUseCase, averageCostPerFte, rescaleRolesToAverage } from '../utils/roleTemplates';
import Tooltip from './Tooltip';
import ModelSelector from './ModelSelector';

interface ScenarioWizardProps {
  isOpen: boolean;
  onComplete: (scenario: Scenario) => void;
  onCancel: () => void;
}

export default function ScenarioWizard({ isOpen, onComplete, onCancel }: ScenarioWizardProps) {
  const [step, setStep] = useState(1);
  const [scenario, setScenario] = useState<Scenario>(createDefaultScenario());
  const [includeAllRoles, setIncludeAllRoles] = useState(false);

  const handleNext = () => {
    if (step < 7) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = () => {
    onComplete(scenario);
  };

  const updateScenario = (updates: Partial<Scenario>) => {
    setScenario(prev => ({ ...prev, ...updates }));
  };

  const autoPopulateRoles = () => {
    const roles = getRolesForUseCase(
      scenario.useCase,
      includeAllRoles,
      scenario.baseCurrency,
      scenario.fxRatesPerEur
    );
    updateScenario({ roles });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-8 mx-4">
        {/* Header with Progress */}
        <div className="bg-blue-600 text-white px-8 py-6">
          <h2 className="text-2xl font-bold mb-2">Set Up Your Scenario</h2>
          <div className="flex items-center gap-2">
            <div className="text-sm">Step {step} of 7</div>
            <div className="flex-1 bg-blue-400 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all"
                style={{ width: `${(step / 7) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 min-h-96">
          {step === 1 && (
            <Step1Basic
              scenario={scenario}
              onUpdate={updateScenario}
              onCurrencyChange={(to: Currency) =>
                setScenario(prev =>
                  convertScenarioCurrency(prev, to, fxFactor(prev.baseCurrency, to, prev.fxRatesPerEur))
                )
              }
            />
          )}
          {step === 2 && <Step2Model scenario={scenario} onUpdate={updateScenario} />}
          {step === 3 && <Step3Timeline scenario={scenario} onUpdate={updateScenario} />}
          {step === 4 && (
            <Step4Roles
              scenario={scenario}
              onUpdate={updateScenario}
              includeAllRoles={includeAllRoles}
              onIncludeAllRolesChange={setIncludeAllRoles}
              onAutoPopulate={autoPopulateRoles}
            />
          )}
          {step === 5 && <Step5Investment scenario={scenario} onUpdate={updateScenario} />}
          {step === 6 && <Step6TeamPreview scenario={scenario} />}
          {step === 7 && <Step7Review scenario={scenario} />}
        </div>

        {/* Navigation */}
        <div className="bg-gray-50 px-8 py-4 flex gap-3 justify-between border-t">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={handlePrev}
                className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition"
              >
                ← Back
              </button>
            )}
            {step < 7 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Create Scenario
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step4Roles({ scenario, onUpdate, includeAllRoles, onIncludeAllRolesChange, onAutoPopulate }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Team Composition</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select which roles to include. Based on your use case, we can auto-populate the right team.
        </p>
      </div>

      <div className="space-y-3">
        <label className="flex items-center p-4 border-2 border-blue-300 bg-blue-50 rounded-lg cursor-pointer">
          <input
            type="radio"
            checked={!includeAllRoles}
            onChange={() => onIncludeAllRolesChange(false)}
            className="w-4 h-4"
          />
          <div className="ml-3">
            <div className="font-semibold text-gray-900">Role-Specific Template</div>
            <div className="text-sm text-gray-600">
              Based on your "{scenario.useCase}" use case, populate relevant roles only
            </div>
          </div>
        </label>

        <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-gray-400">
          <input
            type="radio"
            checked={includeAllRoles}
            onChange={() => onIncludeAllRolesChange(true)}
            className="w-4 h-4"
          />
          <div className="ml-3">
            <div className="font-semibold text-gray-900">All Roles (Comprehensive)</div>
            <div className="text-sm text-gray-600">
              Include all tech roles (PO, Devs, QA, AI Engineers, Data, Security, etc.)
            </div>
          </div>
        </label>
      </div>

      <button
        onClick={onAutoPopulate}
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
      >
        {includeAllRoles ? 'Populate All Roles' : 'Auto-Populate Relevant Roles'}
      </button>

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
          onChange={(e) => onUpdate({ roles: rescaleRolesToAverage(scenario.roles, Number(e.target.value)) })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Template rates come from an India-based reference team. Replace with the customer's onshore cost.
        </p>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>
          {includeAllRoles
            ? `Roles for "${scenario.useCase}" plus cross-functional roles (PO, manager, data architect, security).`
            : `Roles for "${scenario.useCase}" only.`}
        </p>
        <p>You can add, remove and edit roles on the dashboard after the wizard.</p>
      </div>
    </div>
  );
}

function Step1Basic({ scenario, onUpdate, onCurrencyChange }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h3>
        <p className="text-sm text-gray-600 mb-4">
          Start by naming your scenario and identifying the client. This information appears in all reports.
        </p>
      </div>

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
          <label className="block text-sm font-semibold text-gray-900 mb-2">Currency</label>
          <select
            value={scenario.baseCurrency}
            onChange={(e) => onCurrencyChange(e.target.value as Currency)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CURRENCIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Enter all amounts in this currency. Default rates are converted for you.</p>
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
          <strong>Next Step:</strong> After completing this wizard, click "Edit Roles" on the dashboard to fine-tune all staffing numbers.
        </p>
      </div>
    </div>
  );
}

function Step7Review({ scenario }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Review & Confirm</h3>
        <p className="text-sm text-gray-600 mb-4">
          Verify your scenario details before creating. You can edit everything after this.
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
            Your scenario is ready! Click <strong>"Create Scenario"</strong> to start.
          </p>
          <p className="text-xs text-gray-600 mt-2">
            You'll then be able to edit team roles, costs, KPIs, and see real-time financial analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
