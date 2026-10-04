import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface FteData {
  state: string;
  staffingFte: number;
  effortFte: number;
}

interface FtePyramidChartProps {
  data: FteData[];
}

export default function FtePyramidChart({ data }: FtePyramidChartProps) {
  const matureData = data.find(d => d.state === 'Mature');
  const savingPercent = matureData ? (1 - matureData.effortFte / matureData.staffingFte) * 100 : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900">FTE Comparison</h3>
        <p className="text-xs text-gray-600 mt-1">
          Staffing Plan vs Effort-Derived FTE by state
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="state"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            label={{ value: 'FTE', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value) => (value as number).toFixed(1)}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />

          <Bar
            dataKey="staffingFte"
            fill="#6366f1"
            name="Staffing FTE (Planned)"
            isAnimationActive={true}
          />
          <Bar
            dataKey="effortFte"
            fill="#06b6d4"
            name="Effort FTE (Calculated)"
            isAnimationActive={true}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
          <p className="text-xs font-semibold text-gray-900 mb-2">Staffing FTE</p>
          <p className="text-xs text-gray-700">
            Planned headcount from role definitions. Used to calculate people costs.
          </p>
        </div>
        <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
          <p className="text-xs font-semibold text-gray-900 mb-2">Effort FTE</p>
          <p className="text-xs text-gray-700">
            Hours required from KPIs. In mature state, <strong>{savingPercent.toFixed(1)}%</strong> efficiency gain.
          </p>
        </div>
      </div>
    </div>
  );
}
