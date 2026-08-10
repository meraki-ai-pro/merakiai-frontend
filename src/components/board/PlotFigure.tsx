'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildPlotData, type PlotSpec } from '@/lib/board';

const SERIES_COLOURS = ['#2563eb', '#e11d48', '#059669', '#d97706', '#7c3aed'];

interface PlotFigureProps {
  spec: PlotSpec;
}

/**
 * Renders a tutor-authored plot: either an explicit set of points or a
 * function of x evaluated over a domain.
 *
 * Function expressions are compiled by the safe parser in `lib/board`, never
 * `eval`, because the expression is generated content. An expression outside
 * that grammar yields no data and the figure quietly renders nothing rather
 * than breaking the slide around it.
 */
export function PlotFigure({ spec }: PlotFigureProps) {
  const plot = useMemo(() => buildPlotData(spec), [spec]);

  if (!plot) return null;

  const { data, series } = plot;
  const chartKind = spec.kind === 'xy' ? spec.chart ?? 'line' : 'line';
  const axis = {
    x: spec.xLabel ?? 'x',
    y: spec.yLabel ?? 'y',
  };

  const grid = <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-white/10" />;
  const xAxis = (
    <XAxis
      dataKey="x"
      type="number"
      domain={['dataMin', 'dataMax']}
      tick={{ fontSize: 11 }}
      stroke="currentColor"
      className="text-slate-500 dark:text-slate-400"
      label={{ value: axis.x, position: 'insideBottomRight', offset: -4, fontSize: 11 }}
    />
  );
  const yAxis = (
    <YAxis
      tick={{ fontSize: 11 }}
      stroke="currentColor"
      className="text-slate-500 dark:text-slate-400"
      label={{ value: axis.y, angle: -90, position: 'insideLeft', fontSize: 11 }}
    />
  );
  // Raw floats read as noise on a maths plot ("-0.07152212900582355"); four
  // significant figures is what a lecturer would write on the board.
  const round = (value: unknown) =>
    typeof value === 'number' ? Number(value.toPrecision(4)) : (value as number);

  const tooltip = (
    <Tooltip
      contentStyle={{
        borderRadius: 12,
        border: '1px solid rgba(148,163,184,0.3)',
        fontSize: 12,
      }}
      formatter={(value) => round(value)}
      labelFormatter={(label) => `${axis.x} = ${round(label)}`}
    />
  );

  return (
    <figure className="mt-4 overflow-hidden rounded-xl border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      {spec.title && (
        <figcaption className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {spec.title}
        </figcaption>
      )}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartKind === 'bar' ? (
            <BarChart data={data} margin={{ top: 8, right: 16, bottom: 16, left: 4 }}>
              {grid}{xAxis}{yAxis}{tooltip}
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {series.map((name, i) => (
                <Bar key={name} dataKey={name} fill={SERIES_COLOURS[i % SERIES_COLOURS.length]} />
              ))}
            </BarChart>
          ) : chartKind === 'scatter' ? (
            <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: 4 }}>
              {grid}{xAxis}{yAxis}{tooltip}
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {series.map((name, i) => (
                <Scatter key={name} data={data} dataKey={name} fill={SERIES_COLOURS[i % SERIES_COLOURS.length]} />
              ))}
            </ScatterChart>
          ) : (
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 16, left: 4 }}>
              {grid}
              {/* Axes through the origin make a function plot readable as maths. */}
              <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.35} />
              <ReferenceLine x={0} stroke="currentColor" strokeOpacity={0.35} />
              {xAxis}{yAxis}{tooltip}
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {series.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={SERIES_COLOURS[i % SERIES_COLOURS.length]}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
