import { useState } from 'react';
import type { CostLine } from '@ai-roi-calc/engine';
import Tooltip from './Tooltip';

interface CostLinesGridProps {
  costLines: CostLine[];
  onUpdate: (updatedCostLines: CostLine[]) => void;
  isEditing: boolean;
  onDone: () => void;
  formatCurrency: (value: number) => string;
}

export default function CostLinesGrid({ costLines, onUpdate, isEditing, onDone, formatCurrency }: CostLinesGridProps) {
  const [editedLines, setEditedLines] = useState<CostLine[]>(costLines);

  const updateLine = (id: string, state: 'baseline' | 'transition' | 'mature', value: number) => {
    setEditedLines(prev =>
      prev.map(line =>
        line.id === id
          ? { ...line, monthlyAmount: { ...line.monthlyAmount, [state]: value } }
          : line
      )
    );
  };

  const handleSave = () => {
    onUpdate(editedLines);
    onDone();
  };

  const handleCancel = () => {
    setEditedLines(costLines);
    onDone();
  };

  const hasChanges = JSON.stringify(editedLines) !== JSON.stringify(costLines);

  const categories = Array.from(new Set(costLines.map(c => c.category)));

  if (!isEditing) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Cost Lines</h4>
        <div className="space-y-2 text-sm">
          {categories.map(cat => {
            const lines = costLines.filter(c => c.category === cat);
            return (
              <div key={cat} className="text-gray-600">
                <span className="font-medium text-gray-700">{cat}</span>
                <span className="text-gray-500 ml-2">({lines.length} items)</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Edit Cost Lines</h3>
        <Tooltip text="Edit monthly operational expenses for each cost line (AI, infrastructure, tools, governance, etc.). Changes will recalculate total OPEX." />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-6 py-3 text-left font-semibold text-gray-700">Cost Line</th>
            <th className="px-6 py-3 text-left font-semibold text-gray-700">Category</th>
            <th className="px-6 py-3 text-right font-semibold text-gray-700">Baseline</th>
            <th className="px-6 py-3 text-right font-semibold text-gray-700">Transition</th>
            <th className="px-6 py-3 text-right font-semibold text-gray-700">Mature</th>
            <th className="px-6 py-3 text-center font-semibold text-gray-700">
              <span className="inline-flex items-center">
                AI-specific
                <Tooltip text="AI-specific lines scale with the delivery model's AI adoption (0 when the model has no AI). Other lines apply whenever the delivery model changes anything versus today." />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {editedLines.map((line, idx) => {
            const hasLineChange =
              line.monthlyAmount.baseline !== costLines[idx].monthlyAmount.baseline ||
              line.monthlyAmount.transition !== costLines[idx].monthlyAmount.transition ||
              line.monthlyAmount.mature !== costLines[idx].monthlyAmount.mature ||
              line.aiSpecific !== costLines[idx].aiSpecific;

            return (
              <tr
                key={line.id}
                className={`border-b border-gray-100 transition ${
                  hasLineChange ? 'bg-yellow-50' : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-6 py-3 font-medium text-gray-900">{line.name}</td>
                <td className="px-6 py-3 text-gray-600">
                  <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs">{line.category}</span>
                </td>
                <td className="px-6 py-3 text-right">
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={line.monthlyAmount.baseline}
                    onChange={e => updateLine(line.id, 'baseline', Number(e.target.value) || 0)}
                    className={`w-24 px-2 py-1 text-right border rounded text-xs ${
                      line.monthlyAmount.baseline !== costLines[idx].monthlyAmount.baseline
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-300'
                    }`}
                  />
                </td>
                <td className="px-6 py-3 text-right">
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={line.monthlyAmount.transition}
                    onChange={e => updateLine(line.id, 'transition', Number(e.target.value) || 0)}
                    className={`w-24 px-2 py-1 text-right border rounded text-xs ${
                      line.monthlyAmount.transition !== costLines[idx].monthlyAmount.transition
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-300'
                    }`}
                  />
                </td>
                <td className="px-6 py-3 text-right">
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={line.monthlyAmount.mature}
                    onChange={e => updateLine(line.id, 'mature', Number(e.target.value) || 0)}
                    className={`w-24 px-2 py-1 text-right border rounded text-xs ${
                      line.monthlyAmount.mature !== costLines[idx].monthlyAmount.mature
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-300'
                    }`}
                  />
                </td>
                <td className="px-6 py-3 text-center">
                  <input
                    type="checkbox"
                    aria-label={`${line.name} is AI-specific`}
                    checked={line.aiSpecific}
                    onChange={e =>
                      setEditedLines(prev => prev.map(l => (l.id === line.id ? { ...l, aiSpecific: e.target.checked } : l)))
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

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
