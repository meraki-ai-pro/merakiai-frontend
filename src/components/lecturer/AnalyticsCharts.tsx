'use client';

/**
 * Charts for the course overview. One hue for every single-series chart
 * (blue, stepped for dark mode); green/amber/red only where they mean a
 * mastery band, and always next to a text label.
 */

import { useTheme } from 'next-themes';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function useChartColors() {
  const dark = useTheme().resolvedTheme === 'dark';
  return {
    series: dark ? '#3987e5' : '#2a78d6',
    grid: dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
    axis: dark ? '#94a3b8' : '#64748b',
    tooltip: {
      backgroundColor: dark ? '#0f172a' : '#ffffff',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}`,
      borderRadius: 8,
      fontSize: 12,
      color: dark ? '#f8fafc' : '#0f172a',
    },
  };
}

const AXIS_TICK = { fontSize: 11 };

/** Sessions per day, last 30 days. The tooltip also names how many students. */
export function ActivityChart({ data }: { data: { date: string; sessions: number; students: number }[] }) {
  const c = useChartColors();
  const rows = data.map((d) => ({
    ...d,
    label: new Date(`${d.date}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' }),
  }));
  return (
    <div className="h-56" role="img" aria-label="Sessions started per day over the last 30 days">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.series} stopOpacity={0.25} />
              <stop offset="100%" stopColor={c.series} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ ...AXIS_TICK, fill: c.axis }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis allowDecimals={false} tick={{ ...AXIS_TICK, fill: c.axis }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={c.tooltip}
            cursor={{ stroke: c.axis, strokeDasharray: '3 3' }}
            formatter={(value: number, _name, item) => [
              `${value} session${value === 1 ? '' : 's'} · ${item.payload.students} student${item.payload.students === 1 ? '' : 's'}`,
              'Activity',
            ]}
          />
          <Area isAnimationActive={false} type="linear" dataKey="sessions" stroke={c.series} strokeWidth={2} fill="url(#activityFill)" activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** A plain single-hue bar chart over named categories. */
export function CategoryBars({
  data,
  valueLabel,
  ariaLabel,
  horizontal = false,
  unit = '',
  max,
}: {
  data: { name: string; value: number }[];
  valueLabel: string;
  ariaLabel: string;
  horizontal?: boolean;
  unit?: string;
  max?: number;
}) {
  const c = useChartColors();
  const height = horizontal ? Math.max(120, data.length * 34 + 30) : 208;
  return (
    <div style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 18, right: 36, bottom: 0, left: horizontal ? 8 : -16 }}
          barCategoryGap={horizontal ? 6 : '20%'}
        >
          <CartesianGrid stroke={c.grid} horizontal={!horizontal} vertical={horizontal} />
          {/* Not in a fragment: recharts 2 only sees direct children. */}
          <XAxis
            type={horizontal ? 'number' : 'category'}
            dataKey={horizontal ? undefined : 'name'}
            domain={horizontal ? [0, max ?? 'auto'] : undefined}
            unit={horizontal ? unit : undefined}
            allowDecimals={false}
            tick={{ ...AXIS_TICK, fill: c.axis }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type={horizontal ? 'category' : 'number'}
            dataKey={horizontal ? 'name' : undefined}
            width={horizontal ? 130 : 60}
            domain={horizontal ? undefined : [0, max ?? 'auto']}
            unit={horizontal ? undefined : unit}
            allowDecimals={false}
            tick={{ ...AXIS_TICK, fill: c.axis }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip contentStyle={c.tooltip} cursor={{ fill: c.grid }} formatter={(v: number) => [`${v}${unit}`, valueLabel]} />
          <Bar isAnimationActive={false} dataKey="value" fill={c.series} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={44}>
            {/* The exact figure on every bar: these charts replaced number tiles. */}
            <LabelList dataKey="value" position={horizontal ? 'right' : 'top'} formatter={(v: number) => `${v}${unit}`} fill={c.axis} fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const BAND_FILL = { secure: '#10b981', developing: '#f59e0b', struggling: '#ef4444' } as const;
// Mirrors SECURE_THRESHOLD / STRUGGLING_THRESHOLD in app/core/mastery.py.
const bandOf = (mean: number) => (mean >= 0.7 ? 'secure' : mean >= 0.4 ? 'developing' : 'struggling');

/** Mean mastery per topic, weakest first, each bar in its band colour. */
export function TopicMasteryChart({ topics }: { topics: { topic: string; mean: number; students: number }[] }) {
  const c = useChartColors();
  const rows = topics.map((t) => ({ name: t.topic, value: Math.round(t.mean * 100), students: t.students }));
  return (
    <div style={{ height: Math.max(120, rows.length * 34 + 30) }} role="img" aria-label="Average mastery per topic">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 40, bottom: 0, left: 8 }} barCategoryGap={6}>
          <CartesianGrid stroke={c.grid} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} unit="%" tick={{ ...AXIS_TICK, fill: c.axis }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={130} tick={{ ...AXIS_TICK, fill: c.axis }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={c.tooltip}
            cursor={{ fill: c.grid }}
            formatter={(v: number, _n, item) => [`${v}% · ${item.payload.students} student${item.payload.students === 1 ? '' : 's'}`, 'Average mastery']}
          />
          <Bar isAnimationActive={false} dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
            <LabelList dataKey="value" position="right" formatter={(v: number) => `${v}%`} fill={c.axis} fontSize={11} />
            {rows.map((r) => (
              <Cell key={r.name} fill={BAND_FILL[bandOf(r.value / 100)]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
