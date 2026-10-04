import { useState } from 'react';
import type { Scenario } from '@ai-roi-calc/engine';
import Tooltip from './Tooltip';

interface ContextFormProps {
  scenario: Scenario;
  onUpdate: (updates: Partial<Scenario>) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function ContextForm({ scenario, onUpdate, isOpen, onClose }: ContextFormProps) {
  const [formData, setFormData] = useState({
    clientName: scenario.clientName,
    useCase: scenario.useCase,
    horizonMonths: scenario.timeValue.horizonMonths,
    discountRate: scenario.timeValue.discountRateAnnual * 100,
    transitionMonths: scenario.globalAssumptions.transitionLengthMonths,
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onUpdate({
      clientName: formData.clientName,
      useCase: formData.useCase,
      timeValue: {
        ...scenario.timeValue,
        horizonMonths: Number(formData.horizonMonths),
        discountRateAnnual: Number(formData.discountRate) / 100,
      },
      globalAssumptions: {
        ...scenario.globalAssumptions,
        transitionLengthMonths: Number(formData.transitionMonths),
      },
    });
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Scenario Context</h2>

        <div className="space-y-4">
          <div>
            <div className="flex items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Client Name</label>
              <Tooltip text="The name of the organization implementing AI. Used for reporting and identifying scenarios." />
            </div>
            <input
              type="text"
              value={formData.clientName}
              onChange={e => handleChange('clientName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter client name"
            />
          </div>

          <div>
            <div className="flex items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Use Case</label>
              <Tooltip text="Description of the AI application domain (e.g., software testing, customer support). Determines which KPIs and cost drivers apply." />
            </div>
            <input
              type="text"
              value={formData.useCase}
              onChange={e => handleChange('useCase', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., AI-Augmented Testing"
            />
          </div>

          <div>
            <div className="flex items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Horizon (months): {formData.horizonMonths}
              </label>
              <Tooltip text="The number of months to forecast (12–60). Longer horizons show more benefit as transition costs are amortized. Used for payback, ROI, and NPV calculations." />
            </div>
            <input
              type="range"
              min="12"
              max="60"
              value={formData.horizonMonths}
              onChange={e => handleChange('horizonMonths', e.target.value)}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">12–60 months</div>
          </div>

          <div>
            <div className="flex items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Discount Rate (% per year): {formData.discountRate.toFixed(1)}%
              </label>
              <Tooltip text="The cost of capital (discount rate) used to calculate Net Present Value (NPV). Higher rates penalize future cash flows more heavily. Typically 8–15% for technology investments." />
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={formData.discountRate}
              onChange={e => handleChange('discountRate', e.target.value)}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">0–20% per year</div>
          </div>

          <div>
            <div className="flex items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Transition Period (months): {formData.transitionMonths}
              </label>
              <Tooltip text="How long the ramp-up takes from current state (baseline) to AI-enabled state (mature). During transition, costs are higher due to dual-run and training. Typically 2–6 months." />
            </div>
            <input
              type="number"
              min="1"
              max="12"
              value={formData.transitionMonths}
              onChange={e => handleChange('transitionMonths', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
