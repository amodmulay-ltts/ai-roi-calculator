import Tooltip from './Tooltip';

interface SensitivityGridProps {
  data: Record<string, Record<string, number>>;
  rowLabel: string;
  colLabel: string;
  formatCurrency: (value: number) => string;
}

export default function SensitivityGrid({
  data,
  rowLabel,
  colLabel,
  formatCurrency,
}: SensitivityGridProps) {
  const rows = Object.keys(data).sort();
  const cols = rows.length > 0 ? Object.keys(data[rows[0]]).sort() : [];

  if (rows.length === 0 || cols.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-sm text-gray-600">No sensitivity data available</p>
      </div>
    );
  }

  const baseRowIdx = Math.floor(rows.length / 2);
  const baseColIdx = Math.floor(cols.length / 2);
  const baseValue = data[rows[baseRowIdx]][cols[baseColIdx]];

  const getColor = (value: number) => {
    const diff = value - baseValue;
    const percentDiff = (Math.abs(diff) / Math.abs(baseValue)) * 100;

    if (percentDiff === 0) return 'bg-blue-100 border-blue-300';
    if (diff > 0) {
      if (percentDiff > 10) return 'bg-green-100 border-green-300';
      return 'bg-green-50 border-green-200';
    } else {
      if (percentDiff > 10) return 'bg-red-100 border-red-300';
      return 'bg-red-50 border-red-200';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Two-Way Sensitivity Table</h3>
          <p className="text-xs text-gray-600 mt-1">
            {rowLabel} vs {colLabel} - Shows NPV impact
          </p>
        </div>
        <Tooltip text="Shows how NPV changes with different combinations of two key variables. Blue = base case, green = improvement, red = decline." />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left font-semibold text-gray-900 bg-gray-50 border border-gray-200">
                {rowLabel}
              </th>
              {cols.map(col => (
                <th
                  key={col}
                  className="p-2 text-center font-semibold text-gray-900 bg-gray-50 border border-gray-200"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={row}>
                <td className="p-2 font-medium text-gray-900 bg-gray-50 border border-gray-200">
                  {row}
                </td>
                {cols.map((col, colIdx) => {
                  const value = data[row][col];
                  const isBase = rowIdx === baseRowIdx && colIdx === baseColIdx;

                  return (
                    <td
                      key={`${row}-${col}`}
                      className={`p-2 text-center border border-gray-200 ${getColor(value)} ${
                        isBase ? 'font-semibold' : ''
                      }`}
                    >
                      {formatCurrency(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
          <span className="text-gray-700">Base case</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span className="text-gray-700">Improvement</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
          <span className="text-gray-700">Decline</span>
        </div>
      </div>
    </div>
  );
}
