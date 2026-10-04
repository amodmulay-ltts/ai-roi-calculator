import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface TornadoData {
  variable: string;
  low: number;
  base: number;
  high: number;
  range: number;
}

interface TornadoChartProps {
  data: TornadoData[];
  formatCurrency: (value: number) => string;
  metric: 'npv' | 'roi' | 'payback';
}

export default function TornadoChart({
  data,
  formatCurrency,
  metric,
}: TornadoChartProps) {
  const sortedData = [...data].sort((a, b) => b.range - a.range);

  const getColor = (index: number) => {
    const colors = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'];
    return colors[index % colors.length];
  };

  const chartData = sortedData.map((item, idx) => ({
    variable: item.variable,
    negativeVariance: item.low - item.base,
    baseValue: item.base,
    positiveVariance: item.high - item.base,
    color: getColor(idx),
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900">
          Sensitivity Analysis ({metric.toUpperCase()})
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          Impact of ±20% variation in key variables (ranked by sensitivity)
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
          <YAxis
            dataKey="variable"
            type="category"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            width={140}
          />
          <Tooltip
            formatter={(value) => formatCurrency(value as number)}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />

          <Bar dataKey="negativeVariance" stackId="sensitivity" fill="#ef4444" />
          <Bar dataKey="positiveVariance" stackId="sensitivity" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-gray-700">
          <strong>Red bars</strong> show impact of -20% change. <strong>Green bars</strong> show impact of +20% change.
          Longer bars = more sensitive to that variable.
        </p>
      </div>
    </div>
  );
}
