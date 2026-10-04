import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface MonthlyOpexData {
  month: number;
  baseline: number;
  transition: number;
  mature: number;
}

interface MonthlyOpexChartProps {
  data: MonthlyOpexData[];
  formatCurrency: (value: number) => string;
}

export default function MonthlyOpexChart({
  data,
  formatCurrency,
}: MonthlyOpexChartProps) {
  const maxMonth = Math.max(...data.map(d => d.month));
  const transitionEnd = data.find(d => d.transition > 0)?.month ?? maxMonth;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900">Monthly OPEX by State</h3>
        <p className="text-xs text-gray-600 mt-1">
          Stacked view: Baseline (gray) → Transition (orange) → Mature (blue)
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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

          <Bar
            dataKey="baseline"
            stackId="opex"
            fill="#9ca3af"
            name="Baseline OPEX"
            isAnimationActive={true}
          />
          <Bar
            dataKey="transition"
            stackId="opex"
            fill="#f97316"
            name="Transition OPEX"
            isAnimationActive={true}
          />
          <Bar
            dataKey="mature"
            stackId="opex"
            fill="#2563eb"
            name="Mature OPEX"
            isAnimationActive={true}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
        <p className="text-xs text-gray-700">
          <strong>During transition (months 0-{transitionEnd}):</strong> Costs are higher due to dual-run and training. In mature state, OPEX decreases as AI productivity kicks in.
        </p>
      </div>
    </div>
  );
}
