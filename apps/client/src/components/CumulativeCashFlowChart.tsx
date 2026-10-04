import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CumulativeCashFlowData {
  month: number;
  cumulativeSavings: number;
  cumulativeCost: number;
  netCashFlow: number;
}

interface CumulativeCashFlowChartProps {
  data: CumulativeCashFlowData[];
  formatCurrency: (value: number) => string;
}

export default function CumulativeCashFlowChart({
  data,
  formatCurrency,
}: CumulativeCashFlowChartProps) {
  const paybackMonth = data.find(d => d.netCashFlow >= 0)?.month;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900">Cumulative Cash Flow</h3>
        <p className="text-xs text-gray-600 mt-1">
          {paybackMonth ? `Payback occurs at month ${paybackMonth}` : 'Payback beyond horizon'}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            label={{ value: 'Month', position: 'insideBottomRight', offset: -5 }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            label={{ value: 'EUR', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value) => formatCurrency(value as number)}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />

          <Line
            type="monotone"
            dataKey="cumulativeCost"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            name="Cumulative Investment"
            isAnimationActive={true}
          />
          <Line
            type="monotone"
            dataKey="cumulativeSavings"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="Cumulative Savings"
            isAnimationActive={true}
          />
          <Line
            type="monotone"
            dataKey="netCashFlow"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={false}
            name="Net Cash Flow (Payback)"
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-gray-700">
          <strong>Blue line crosses zero at payback point.</strong> Green shows cumulative savings, red shows cumulative investment.
        </p>
      </div>
    </div>
  );
}
