"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type Props = {
  entries: { scope: number; category: string; emissionsTco2e: number }[];
};

const SCOPE_COLORS: Record<number, string[]> = {
  1: ["#1e3a5f", "#2d5a8e", "#3d7ab5", "#5a9bd5", "#7ab8e8"],
  2: ["#1a4d2e", "#2d7a4d", "#3da666", "#5dc585", "#7dd8a0"],
  3: ["#4d2d1a", "#8e4d2a", "#b56b3d", "#d58b5a", "#e8aa7d"],
};

function colorForScope(scope: number, idx: number): string {
  const palette = SCOPE_COLORS[scope] ?? SCOPE_COLORS[1];
  return palette[idx % palette.length];
}

export function BaselineBreakdownChart({ entries }: Props) {
  // Group by category, pivot by scope
  const categories = [...new Set(entries.map((e) => e.category))].sort();
  const scopes = [...new Set(entries.map((e) => e.scope))].sort();

  const data = categories.map((cat) => {
    const row: Record<string, string | number> = { category: cat };
    for (const scope of scopes) {
      const entry = entries.find((e) => e.category === cat && e.scope === scope);
      row[`Scope ${scope}`] = entry?.emissionsTco2e ?? 0;
    }
    return row;
  });

  const total = entries.reduce((s, e) => s + e.emissionsTco2e, 0);

  return (
    <div>
      <p className="text-xs text-gray-500 mb-4">
        Total:{" "}
        <span className="font-medium text-gray-700">
          {total.toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO₂e
        </span>
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            angle={-30}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
            label={{
              value: "tCO₂e",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              style: { fontSize: 11, fill: "#9ca3af" },
            }}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) => [
              (value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 }),
              name ?? "",
            ]}
            contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e5e7eb" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {scopes.map((scope, idx) => (
            <Bar
              key={scope}
              dataKey={`Scope ${scope}`}
              stackId="a"
              fill={colorForScope(scope, idx)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
