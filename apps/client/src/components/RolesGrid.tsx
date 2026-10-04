import { useState } from 'react';
import type { Role, Scenario } from '@ai-roi-calc/engine';
import Tooltip from './Tooltip';

interface RolesGridProps {
  roles: Role[];
  onUpdate: (updatedRoles: Role[]) => void;
  isEditing: boolean;
  onDone: () => void;
  formatCurrency: (value: number) => string;
}

export default function RolesGrid({ roles, onUpdate, isEditing, onDone, formatCurrency }: RolesGridProps) {
  const [editedRoles, setEditedRoles] = useState<Role[]>(roles);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const updateRole = (id: string, field: string, state: 'baseline' | 'transition' | 'mature', value: number) => {
    setEditedRoles(prev =>
      prev.map(role =>
        role.id === id && field === 'fte'
          ? { ...role, fte: { ...role.fte, [state]: value } }
          : role.id === id && field === 'costPerFte'
            ? { ...role, costPerFte: value }
            : role
      )
    );
  };

  const handleSave = () => {
    onUpdate(editedRoles);
    onDone();
  };

  const handleCancel = () => {
    setEditedRoles(roles);
    onDone();
  };

  const hasChanges = JSON.stringify(editedRoles) !== JSON.stringify(roles);

  if (!isEditing) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Team Roles & FTE</h4>
        <div className="space-y-2 text-sm">
          {roles.slice(0, 3).map(role => (
            <div key={role.id} className="flex justify-between text-gray-600">
              <span>{role.name}</span>
              <span className="font-medium text-gray-900">{role.fte.baseline} → {role.fte.mature} FTE</span>
            </div>
          ))}
          {roles.length > 3 && <p className="text-gray-500 pt-2">+{roles.length - 3} more roles</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Edit Team Roles</h3>
        <Tooltip text="Edit FTE and cost per FTE for each role. Changes will recalculate staffing and cost models." />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-6 py-3 text-left font-semibold text-gray-700">Role</th>
            <th className="px-6 py-3 text-right font-semibold text-gray-700">Baseline FTE</th>
            <th className="px-6 py-3 text-right font-semibold text-gray-700">Transition FTE (plan)</th>
            <th className="px-6 py-3 text-right font-semibold text-gray-700">Mature FTE (plan)</th>
            <th className="px-6 py-3 text-right font-semibold text-gray-700">Onshore cost / FTE / month</th>
          </tr>
        </thead>
        <tbody>
          {editedRoles.map((role, idx) => {
            const hasRoleChange =
              role.fte.baseline !== roles[idx].fte.baseline ||
              role.fte.transition !== roles[idx].fte.transition ||
              role.fte.mature !== roles[idx].fte.mature ||
              role.costPerFte !== roles[idx].costPerFte;

            return (
              <tr
                key={role.id}
                className={`border-b border-gray-100 transition ${
                  hasRoleChange ? 'bg-yellow-50' : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-6 py-3 font-medium text-gray-900">{role.name}</td>
                <td className="px-6 py-3 text-right">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={role.fte.baseline}
                    onChange={e => updateRole(role.id, 'fte', 'baseline', parseFloat(e.target.value))}
                    className={`w-16 px-2 py-1 text-right border rounded ${
                      role.fte.baseline !== roles[idx].fte.baseline
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-300'
                    }`}
                  />
                </td>
                <td className="px-6 py-3 text-right">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={role.fte.transition}
                    onChange={e => updateRole(role.id, 'fte', 'transition', parseFloat(e.target.value))}
                    className={`w-16 px-2 py-1 text-right border rounded ${
                      role.fte.transition !== roles[idx].fte.transition
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-300'
                    }`}
                  />
                </td>
                <td className="px-6 py-3 text-right">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={role.fte.mature}
                    onChange={e => updateRole(role.id, 'fte', 'mature', parseFloat(e.target.value))}
                    className={`w-16 px-2 py-1 text-right border rounded ${
                      role.fte.mature !== roles[idx].fte.mature
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
                    value={role.costPerFte}
                    onChange={e => updateRole(role.id, 'costPerFte', 'baseline', Number(e.target.value) || 0)}
                    className={`w-24 px-2 py-1 text-right border rounded ${
                      role.costPerFte !== roles[idx].costPerFte
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-300'
                    }`}
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
