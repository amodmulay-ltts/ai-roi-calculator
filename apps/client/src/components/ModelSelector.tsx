import type { ImplementationModel, Scenario } from '@ai-roi-calc/engine';
import { DELIVERY_MODEL_INFO, deliveryModelInfo } from '../utils/deliveryModels';
import Tooltip from './Tooltip';
import PercentInput from './PercentInput';

interface ModelSelectorProps {
  scenario: Scenario;
  onUpdate: (updates: Partial<Scenario>) => void;
}

export default function ModelSelector({ scenario, onUpdate }: ModelSelectorProps) {
  const selected = scenario.primaryModel;
  const info = deliveryModelInfo(selected);
  const profile = scenario.deliveryProfiles[selected];

  const updateProfile = (changes: Partial<typeof profile>) =>
    onUpdate({
      deliveryProfiles: { ...scenario.deliveryProfiles, [selected]: { ...profile, ...changes } },
    });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      {/* Quiet: model switcher */}
      <div role="radiogroup" aria-label="Delivery model" className="flex flex-wrap gap-2 mb-8">
        {DELIVERY_MODEL_INFO.map(m => (
          <button
            key={m.id}
            role="radio"
            aria-checked={selected === m.id}
            onClick={() => onUpdate({ primaryModel: m.id as ImplementationModel })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              selected === m.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Hero: selected model */}
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Delivery model</p>
      <h3 className="text-4xl font-bold text-blue-700 mb-2">{info.label}</h3>
      <p className="text-sm text-gray-600 max-w-2xl mb-8">{info.description}</p>

      {/* Supporting: the two parameters that define this model */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div>
          <label htmlFor="bcc-share" className="flex items-center text-sm text-gray-600 mb-2">
            Offshore (BCC) share of team
            <Tooltip text="Share of delivery FTE located in a best-cost country after the change. Role rates blend onshore and BCC cost by this share." />
          </label>
          <PercentInput id="bcc-share" size="md" value={profile.bccShare} max={100} onChange={v => updateProfile({ bccShare: v })} />
        </div>
        <div>
          <label htmlFor="ai-adoption" className="flex items-center text-sm text-gray-600 mb-2">
            AI adoption
            <Tooltip text="How much of the AI plan applies. 0% = no AI. 100% = the role FTE changes, AI cost lines, AI investment and productivity factor exactly as entered. Above 100% = deeper adoption than planned; AI costs scale with it." />
          </label>
          <PercentInput id="ai-adoption" size="md" value={profile.aiAdoption} max={200} onChange={v => updateProfile({ aiAdoption: v })} />
        </div>
      </div>

      {/* Quiet: assumptions shared by all models */}
      <div className="border-t border-gray-100 pt-4 flex flex-wrap items-center gap-x-10 gap-y-3 text-sm text-gray-500">
        <label htmlFor="baseline-bcc" className="flex items-center gap-2">
          <span className="flex items-center">
            Offshore share today
            <Tooltip text="Where the customer's team sits now. This defines the baseline, which never changes with the delivery model." />
          </span>
          <PercentInput id="baseline-bcc" size="sm" value={scenario.baselineBccShare} max={100} onChange={v => onUpdate({ baselineBccShare: v })} />
        </label>
        <label htmlFor="bcc-rate" className="flex items-center gap-2">
          <span className="flex items-center">
            BCC cost vs onshore
            <Tooltip text="Cost per BCC FTE as a percentage of the onshore rate entered on each role. Role rates are onshore rates." />
          </span>
          <PercentInput id="bcc-rate" size="sm" value={scenario.bccRateFactor} max={100} onChange={v => onUpdate({ bccRateFactor: v })} />
        </label>
        <span className="text-xs text-gray-400">Watch out: {info.watchOut}</span>
      </div>
    </div>
  );
}
