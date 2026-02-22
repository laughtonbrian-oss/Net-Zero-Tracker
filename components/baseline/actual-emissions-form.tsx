"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type ActualEmission = {
  id: string;
  year: number;
  scope1: number;
  scope2: number;
  scope3: number;
  notes?: string | null;
};

type RowState = {
  scope1: string;
  scope2: string;
  scope3: string;
  notes: string;
  saving: boolean;
};

type Props = {
  baselineYear: number;
  initialData: ActualEmission[];
};

export function ActualEmissionsForm({ baselineYear, initialData }: Props) {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = baselineYear; y <= currentYear; y++) {
    years.push(y);
  }

  const [rows, setRows] = useState<Record<number, RowState>>(() => {
    const initial: Record<number, RowState> = {};
    for (const y of years) {
      const existing = initialData.find((d) => d.year === y);
      initial[y] = {
        scope1: existing ? String(existing.scope1) : "",
        scope2: existing ? String(existing.scope2) : "",
        scope3: existing ? String(existing.scope3) : "",
        notes: existing?.notes ?? "",
        saving: false,
      };
    }
    return initial;
  });

  function updateRow(year: number, field: keyof RowState, value: string | boolean) {
    setRows((prev) => ({
      ...prev,
      [year]: { ...prev[year], [field]: value },
    }));
  }

  async function saveRow(year: number) {
    updateRow(year, "saving", true);
    const row = rows[year];
    try {
      const res = await fetch("/api/actual-emissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          scope1: parseFloat(row.scope1) || 0,
          scope2: parseFloat(row.scope2) || 0,
          scope3: parseFloat(row.scope3) || 0,
          notes: row.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Saved emissions for ${year}`);
    } catch {
      toast.error(`Failed to save ${year}`);
    } finally {
      updateRow(year, "saving", false);
    }
  }

  return (
    <Card className="border-gray-200 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-700">
          Emissions by Year (tCO₂e)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-16">Year</th>
                <th className="text-right px-3 py-2.5 font-medium text-gray-600">Scope 1</th>
                <th className="text-right px-3 py-2.5 font-medium text-gray-600">Scope 2</th>
                <th className="text-right px-3 py-2.5 font-medium text-gray-600">Scope 3</th>
                <th className="text-right px-3 py-2.5 font-medium text-gray-600">Total</th>
                <th className="px-3 py-2.5 font-medium text-gray-600">Notes</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {years.map((year) => {
                const row = rows[year];
                const s1 = parseFloat(row.scope1) || 0;
                const s2 = parseFloat(row.scope2) || 0;
                const s3 = parseFloat(row.scope3) || 0;
                const total = s1 + s2 + s3;
                return (
                  <tr key={year} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {year}
                      {year === baselineYear && (
                        <span className="ml-1 text-[10px] text-emerald-600 font-normal">base</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        className="h-7 text-right text-xs w-24 ml-auto"
                        value={row.scope1}
                        onChange={(e) => updateRow(year, "scope1", e.target.value)}
                        placeholder="0"
                        step="0.01"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        className="h-7 text-right text-xs w-24 ml-auto"
                        value={row.scope2}
                        onChange={(e) => updateRow(year, "scope2", e.target.value)}
                        placeholder="0"
                        step="0.01"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        className="h-7 text-right text-xs w-24 ml-auto"
                        value={row.scope3}
                        onChange={(e) => updateRow(year, "scope3", e.target.value)}
                        placeholder="0"
                        step="0.01"
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700 font-medium tabular-nums">
                      {total > 0 ? total.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="text"
                        className="h-7 text-xs"
                        value={row.notes}
                        onChange={(e) => updateRow(year, "notes", e.target.value)}
                        placeholder="Optional note"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                        onClick={() => saveRow(year)}
                        disabled={row.saving}
                      >
                        {row.saving ? "…" : "Save"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
