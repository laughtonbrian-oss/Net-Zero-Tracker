"use client";

import {
  ComposedChart,
  Bar,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { GlidepathDataPoint } from "@/lib/types";

type Props = {
  data: GlidepathDataPoint[];
  baselineYear: number;
  targets?: { label: string; isSbtiAligned: boolean; targetYear: number; reductionPct: number }[];
};

function formatTco2e(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toFixed(0);
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-md p-3 text-xs max-w-xs">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      {payload
        .filter((p) => p.value != null && p.value !== 0)
        .map((p) => (
          <div key={p.name} className="flex items-center gap-2 py-0.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: p.color || p.fill }}
            />
            <span className="text-gray-600 truncate max-w-[140px]">{p.name}:</span>
            <span className="font-medium text-gray-900 ml-auto">
              {formatTco2e(p.value)} tCO₂e
            </span>
          </div>
        ))}
    </div>
  );
}

function CustomLegend({
  payload,
  targets,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  targets?: Props["targets"];
}) {
  if (!payload?.length) return null;
  const sbti = targets?.some((t) => t.isSbtiAligned) ?? false;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-xs text-gray-500">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          {entry.type === "circle" ? (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
          ) : (
            <span
              className="w-4 shrink-0 inline-block"
              style={{
                height: "2px",
                backgroundColor: entry.color,
              }}
            />
          )}
          <span>{entry.value}</span>
          {entry.value === "Target" && sbti && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
              SBTi
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function GlidepathChart({ data, baselineYear, targets }: Props) {
  if (!data.length) return null;

  // First year where residual emissions drop to or below the target line
  const netZeroYear = data.find(
    (d) => d.target != null && d.residual <= d.target
  )?.year ?? null;

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
        />
        <YAxis
          tickFormatter={formatTco2e}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content={(props: any) => (
            <CustomLegend payload={props.payload} targets={targets} />
          )}
        />
        <ReferenceLine
          x={baselineYear}
          stroke="#d1d5db"
          strokeDasharray="4 4"
          label={{ value: "Baseline", position: "insideTopRight", fontSize: 10, fill: "#9ca3af" }}
        />
        {netZeroYear && (
          <ReferenceLine
            x={netZeroYear}
            stroke="#10b981"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            label={{ value: `✓ Net zero ${netZeroYear}`, position: "insideTopLeft", fontSize: 10, fill: "#10b981" }}
          />
        )}

        {/* Residual emissions — single bar */}
        <Bar
          dataKey="residual"
          name="Residual emissions"
          fill="#d1fae5"
          stroke="#a7f3d0"
          strokeWidth={0.5}
          maxBarSize={18}
          radius={[2, 2, 0, 0]}
          isAnimationActive
          animationDuration={800}
        />

        {/* BAU trajectory line — sits above bars */}
        <Line
          type="monotone"
          dataKey="bau"
          name="BAU trajectory"
          stroke="#9ca3af"
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
          activeDot={{ r: 3 }}
          isAnimationActive
          animationDuration={800}
        />

        {/* Target line */}
        <Line
          type="monotone"
          dataKey="target"
          name="Target"
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={false}
          activeDot={{ r: 3 }}
          connectNulls
          isAnimationActive
          animationDuration={800}
        />

        {/* Actual emissions scatter */}
        <Scatter dataKey="actual" name="Actual emissions" fill="#374151" legendType="circle" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
