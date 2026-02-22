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
import type { GlidepathDataPoint, GlidepathMeta } from "@/lib/types";

type Props = {
  data: GlidepathDataPoint[];
  baselineYear: number;
  meta?: GlidepathMeta;
  targets?: { label: string; isSbtiAligned: boolean; targetYear: number; reductionPct: number }[];
};

function formatTco2e(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toFixed(0);
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 text-xs max-w-xs">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      {payload
        .filter((p) => p.value != null && p.value !== 0)
        .map((p) => (
          <div key={p.name} className="flex items-center gap-2 py-0.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color || p.fill }} />
            <span className="text-gray-600 truncate max-w-[120px]">{p.name}:</span>
            <span className="font-medium text-gray-900 ml-auto">
              {formatTco2e(p.value)} tCO₂e
            </span>
          </div>
        ))}
    </div>
  );
}

function CustomLegend({ payload, targets }: {
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
          <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
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

export function GlidepathChart({ data, baselineYear, meta, targets }: Props) {
  if (!data.length) return null;
  const interventions = meta?.interventions ?? [];

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
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
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content={(props: any) => <CustomLegend payload={props.payload} targets={targets} />}
        />
        <ReferenceLine
          x={baselineYear}
          stroke="#d1d5db"
          strokeDasharray="4 4"
          label={{ value: "Baseline", position: "top", fontSize: 10, fill: "#9ca3af" }}
        />

        {/* Stacked bars: residual at bottom, then each intervention */}
        <Bar dataKey="residual" name="Residual" stackId="a" fill="#e5e7eb" maxBarSize={20} />
        {interventions.map((iv) => (
          <Bar
            key={iv.id}
            dataKey={`i_${iv.id}`}
            name={iv.name}
            stackId="a"
            fill={iv.color}
            maxBarSize={20}
          />
        ))}

        {/* Lines */}
        <Line
          type="monotone"
          dataKey="bau"
          name="BAU trajectory"
          stroke="#9ca3af"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          dot={false}
          activeDot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="target"
          name="Target"
          stroke="#ef4444"
          strokeWidth={1.5}
          strokeDasharray="6 3"
          dot={false}
          activeDot={{ r: 3 }}
          connectNulls
        />

        {/* Actual emissions scatter */}
        <Scatter
          dataKey="actual"
          name="Actual emissions"
          fill="#374151"
          legendType="circle"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
