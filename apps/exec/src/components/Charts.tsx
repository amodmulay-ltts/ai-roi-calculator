import type { ReactElement } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney, type CaseResult, type PhaseResult, type PostureId, type PostureSummary } from '@ai-roi-calc/bizcase';
import { POSTURE_LABEL } from './PostureCard';

export const BLUE = '#1d4ed8';
export const SKY = '#0ea5e9';
export const GRAY = '#9ca3af';
export const RED = '#b91c1c';
const AXIS = { fontSize: 10, fill: '#6b7280' };
const GRID = '#e5e7eb';
const ZERO = '#374151';
const money = (v: unknown): string => formatMoney(Number(v));
const percent1 = (v: number): string => `${v.toFixed(1)}%`;

export const CHART_WIDTH = 340;

/** How AI-assisted effort turns into net efficiency: effort removed, minus what comes back as review and rework. */
export function EfficiencyBridgeChart({ result, width = CHART_WIDTH, height = 170 }: { result: CaseResult; width?: number; height?: number }): ReactElement {
  const gross = result.grossEfficiency * 100;
  const review = result.reviewReworkEfficiency * 100;
  const net = result.netEfficiency * 100;
  const data = [
    { name: 'Effort AI removes', base: 0, value: gross, label: percent1(gross), color: SKY },
    { name: 'Review and rework', base: net, value: review, label: `-${percent1(review)}`, color: RED },
    { name: 'Net efficiency', base: 0, value: net, label: percent1(net), color: BLUE },
  ];
  return (
    <BarChart width={width} height={height} data={data} margin={{ top: 18, right: 8, bottom: 0, left: 8 }}>
      <XAxis dataKey="name" tick={AXIS} interval={0} />
      <YAxis hide domain={[0, (max: number) => Math.ceil(max * 1.15)]} />
      <Bar dataKey="base" stackId="bridge" fill="transparent" isAnimationActive={false} />
      <Bar dataKey="value" stackId="bridge" isAnimationActive={false}>
        {data.map(d => (
          <Cell key={d.name} fill={d.color} />
        ))}
        <LabelList dataKey="label" position="top" style={{ fontSize: 10, fill: '#111827' }} />
      </Bar>
    </BarChart>
  );
}

/**
 * Net efficiency for each lifecycle phase: where AI helps most. With `showUse`, each phase also shows its own
 * AI use. Those figures are set per phase and are independent, so the bars are not parts of one whole.
 */
export function PhaseEfficiencyChart({
  phases,
  showUse = false,
  width = CHART_WIDTH,
  height,
}: {
  phases: PhaseResult[];
  showUse?: boolean;
  width?: number;
  height?: number;
}): ReactElement {
  const data = phases.map(p => ({ name: p.name, use: p.aiUse * 100, efficiency: p.netEfficiency * 100 }));
  const rowHeight = showUse ? 34 : 15;
  const chartHeight = height ?? (showUse ? data.length * rowHeight + 40 : Math.min(150, data.length * rowHeight + 12));
  return (
    <BarChart width={width} height={chartHeight} data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 0, left: 0 }} barGap={1}>
      <XAxis type="number" hide domain={[0, showUse ? 110 : (max: number) => Math.ceil(max * 1.25)]} />
      <YAxis type="category" dataKey="name" tick={AXIS} width={96} interval={0} />
      {showUse && <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />}
      {showUse && (
        <Bar dataKey="use" name="AI use" fill={SKY} isAnimationActive={false}>
          <LabelList dataKey="use" position="right" formatter={(v: number) => `${Math.round(v)}%`} style={{ fontSize: 10, fill: '#111827' }} />
        </Bar>
      )}
      <Bar dataKey="efficiency" name="Net efficiency" fill={BLUE} isAnimationActive={false}>
        <LabelList dataKey="efficiency" position="right" formatter={(v: number) => percent1(v)} style={{ fontSize: 10, fill: '#111827' }} />
      </Bar>
    </BarChart>
  );
}

/** Cumulative position over the horizon for the three cases. */
export function CumulativeCasesChart({
  conservative,
  expected,
  stretch,
  width = CHART_WIDTH,
  height = 170,
}: {
  conservative: CaseResult;
  expected: CaseResult;
  stretch: CaseResult;
  width?: number;
  height?: number;
}): ReactElement {
  const data = expected.cumulative.map((_, m) => ({
    month: m,
    conservative: conservative.cumulative[m],
    expected: expected.cumulative[m],
    stretch: stretch.cumulative[m],
  }));
  return (
    <LineChart width={width} height={height} data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
      <CartesianGrid stroke={GRID} vertical={false} />
      <XAxis dataKey="month" tick={AXIS} ticks={[0, 6, 12, 18, 24, 30, 36]} />
      <YAxis tick={AXIS} tickFormatter={money} width={52} />
      <ReferenceLine y={0} stroke={ZERO} />
      <Line type="monotone" dataKey="conservative" stroke={GRAY} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
      <Line type="monotone" dataKey="expected" stroke={BLUE} strokeWidth={2} dot={false} isAnimationActive={false} />
      <Line type="monotone" dataKey="stretch" stroke={SKY} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
    </LineChart>
  );
}

const ORDER: PostureId[] = ['local', 'hybrid', 'enterprise', 'frontier'];

/** 3-year net value of every option under the three cases. */
export function OptionsRangeChart({ summaries, width = CHART_WIDTH, height = 170 }: { summaries: Record<PostureId, PostureSummary>; width?: number; height?: number }): ReactElement {
  const data = ORDER.map(id => ({
    name: POSTURE_LABEL[id],
    Conservative: summaries[id].conservative.netValue36,
    Expected: summaries[id].expected.netValue36,
    Stretch: summaries[id].stretch.netValue36,
  }));
  return (
    <BarChart width={width} height={height} data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
      <CartesianGrid stroke={GRID} vertical={false} />
      <XAxis dataKey="name" tick={AXIS} tickLine={false} />
      <YAxis tick={AXIS} tickFormatter={money} width={52} />
      <ReferenceLine y={0} stroke={ZERO} />
      <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
      <Bar dataKey="Conservative" fill={GRAY} isAnimationActive={false} />
      <Bar dataKey="Expected" fill={BLUE} isAnimationActive={false} />
      <Bar dataKey="Stretch" fill={SKY} isAnimationActive={false} />
    </BarChart>
  );
}

/** What makes up the monthly net at maturity. Costs are drawn below zero. */
export function MonthlyEconomicsChart({ result, width = CHART_WIDTH, height = 170 }: { result: CaseResult; width?: number; height?: number }): ReactElement {
  const data = [
    { name: 'Saving', value: result.countedSavingPerMonth },
    { name: 'Cost cut', value: result.retiredCostPerMonth },
    { name: 'AI usage', value: -result.usageCostPerMonth },
    { name: 'Platform', value: -result.platformAndGovernancePerMonth },
    { name: 'Net', value: result.steadyNetPerMonth },
  ];
  return (
    <BarChart width={width} height={height} data={data} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
      <XAxis dataKey="name" tick={AXIS} interval={0} tickLine={false} />
      <YAxis hide domain={[(min: number) => Math.min(min * 2.4, -1), (max: number) => max * 1.2]} />
      <ReferenceLine y={0} stroke={ZERO} />
      <Bar dataKey="value" isAnimationActive={false}>
        {data.map(d => (
          <Cell key={d.name} fill={d.name === 'Net' ? '#0c3d66' : d.value < 0 ? RED : BLUE} />
        ))}
        <LabelList dataKey="value" position="top" formatter={money} style={{ fontSize: 10, fill: '#111827' }} />
      </Bar>
    </BarChart>
  );
}

const INVESTMENT_COLORS = ['#0c3d66', BLUE, SKY, '#93c5fd'];

/** The one-time investment split into its lines. */
export function InvestmentChart({ lines, width = CHART_WIDTH, height = 110 }: { lines: CaseResult['investmentLines']; width?: number; height?: number }): ReactElement {
  const row: Record<string, number | string> = { name: 'Investment' };
  for (const line of lines) row[line.label] = line.amount;
  return (
    <BarChart width={width} height={height} data={[row]} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
      <XAxis type="number" tick={AXIS} tickFormatter={money} />
      <YAxis type="category" dataKey="name" hide />
      <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
      {lines.map((line, i) => (
        <Bar key={line.label} dataKey={line.label} stackId="investment" fill={INVESTMENT_COLORS[i % INVESTMENT_COLORS.length]} isAnimationActive={false} />
      ))}
    </BarChart>
  );
}
