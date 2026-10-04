import { useState } from 'react';
import type { KpiInput } from '@ai-roi-calc/engine';
import Tooltip from './Tooltip';

interface KpisGridProps {
  kpis: KpiInput[];
  onUpdate: (updatedKpis: KpiInput[]) => void;
  isEditing: boolean;
  onDone: () => void;
}

export default function KpisGrid({ kpis, onUpdate, isEditing, onDone }: KpisGridProps) {
  const [editedKpis, setEditedKpis] = useState<KpiInput[]>(kpis);

  const updateKpi = (id: string, field: 'baseline' | 'transition' | 'mature', value: number) => {
    setEditedKpis(prev =>
      prev.map(kpi =>
        kpi.id === id && field === 'baseline'
          ? { ...kpi, baseline: value }
          : kpi.id === id && kpi.overrides && (field === 'transition' || field === 'mature')
            ? { ...kpi, overrides: { ...kpi.overrides, [field]: value } }
            : kpi
      )
    );
  };

  const handleSave = () => {
    onUpdate(editedKpis);
    onDone();
  };

  const handleCancel = () => {
    setEditedKpis(kpis);
    onDone();
  };

  const hasChanges = JSON.stringify(editedKpis) !== JSON.stringify(kpis);

  const velocityKpis = editedKpis.filter(k => k.isVelocity);
  const effortKpis = editedKpis.filter(k => k.appliesToFactor && !k.isVelocity);
  const staticKpis = editedKpis.filter(k => !k.appliesToFactor && !k.isVelocity);

  if (!isEditing) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">KPI Inputs</h4>
        <div className="space-y-2 text-sm">
          <div className="text-gray-600">
            <span className="font-medium text-gray-700">Baseline KPIs</span>
            <span className="text-gray-500 ml-2">({editedKpis.filter(k => !k.overrides || Object.keys(k.overrides).length === 0).length} defined)</span>
          </div>
          <div className="text-gray-600">
            <span className="font-medium text-gray-700">Transition Overrides</span>
            <span className="text-gray-500 ml-2">({editedKpis.filter(k => k.overrides?.transition).length})</span>
          </div>
          <div className="text-gray-600">
            <span className="font-medium text-gray-700">Mature Overrides</span>
            <span className="text-gray-500 ml-2">({editedKpis.filter(k => k.overrides?.mature).length})</span>
          </div>
        </div>
      </div>
    );
  }

  const renderKpiSection = (title: string, kpiList: KpiInput[]) => (
    <div key={title} className="mb-6">
      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 px-6 pt-4">{title}</h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-6 py-3 text-left font-semibold text-gray-700">KPI Name</th>
            <th className="px-6 py-3 text-left font-semibold text-gray-700">Unit</th>
            <th className="px-6 py-3 text-right font-semibold text-gray-700">Baseline</th>
            {kpiList.some(k => k.overrides?.transition !== undefined) && (
              <th className="px-6 py-3 text-right font-semibold text-gray-700">Transition Override</th>
            )}
            {kpiList.some(k => k.overrides?.mature !== undefined) && (
              <th className="px-6 py-3 text-right font-semibold text-gray-700">Mature Override</th>
            )}
          </tr>
        </thead>
        <tbody>
          {kpiList.map((kpi, idx) => {
            const origKpi = kpis.find(k => k.id === kpi.id);
            const hasChange = JSON.stringify(kpi) !== JSON.stringify(origKpi);

            return (
              <tr
                key={kpi.id}
                className={`border-b border-gray-100 transition ${
                  hasChange ? 'bg-yellow-50' : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-6 py-3 font-medium text-gray-900">{kpi.name}</td>
                <td className="px-6 py-3 text-gray-600 text-xs">{kpi.unit}</td>
                <td className="px-6 py-3 text-right">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={kpi.baseline}
                    onChange={e => updateKpi(kpi.id, 'baseline', parseFloat(e.target.value) || 0)}
                    className={`w-24 px-2 py-1 text-right border rounded text-xs ${
                      kpi.baseline !== origKpi?.baseline
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-300'
                    }`}
                  />
                </td>
                {kpi.overrides?.transition !== undefined && (
                  <td className="px-6 py-3 text-right">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={kpi.overrides.transition || ''}
                      onChange={e => updateKpi(kpi.id, 'transition', parseFloat(e.target.value) || 0)}
                      className={`w-24 px-2 py-1 text-right border rounded text-xs ${
                        (kpi.overrides?.transition || 0) !== (origKpi?.overrides?.transition || 0)
                          ? 'border-yellow-400 bg-yellow-50'
                          : 'border-gray-300'
                      }`}
                      placeholder="—"
                    />
                  </td>
                )}
                {kpi.overrides?.mature !== undefined && (
                  <td className="px-6 py-3 text-right">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={kpi.overrides.mature || ''}
                      onChange={e => updateKpi(kpi.id, 'mature', parseFloat(e.target.value) || 0)}
                      className={`w-24 px-2 py-1 text-right border rounded text-xs ${
                        (kpi.overrides?.mature || 0) !== (origKpi?.overrides?.mature || 0)
                          ? 'border-yellow-400 bg-yellow-50'
                          : 'border-gray-300'
                      }`}
                      placeholder="—"
                    />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Edit KPI Inputs</h3>
        <Tooltip text="Edit baseline KPI values and transition/mature overrides. These drive effort calculations and productivity factors." />
      </div>

      <div className="divide-y divide-gray-200">
        {staticKpis.length > 0 && renderKpiSection('Static KPIs', staticKpis)}
        {effortKpis.length > 0 && renderKpiSection('Effort & Productivity KPIs', effortKpis)}
        {velocityKpis.length > 0 && renderKpiSection('Velocity KPIs', velocityKpis)}
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end">
        <button
          onClick={handleCancel}
          className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-lg transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
