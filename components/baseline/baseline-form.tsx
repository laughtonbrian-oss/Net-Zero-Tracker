"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Entry = {
  scope: 1 | 2 | 3;
  category: string;
  emissionsTco2e: number;
};

type RawEntry = {
  id?: string;
  scope: number;
  category: string;
  emissionsTco2e: number;
};

type GrowthRateRow = { fromYear: number; toYear: number; ratePct: number };

type BaselineData = {
  id: string;
  year: number;
  growthRatePct: number;
  entries: RawEntry[];
  growthRates?: { id?: string; fromYear: number; toYear: number; ratePct: number }[];
} | null;

const DEFAULT_ENTRIES: Entry[] = [
  { scope: 1, category: "Stationary combustion", emissionsTco2e: 0 },
  { scope: 2, category: "Purchased electricity", emissionsTco2e: 0 },
  { scope: 3, category: "Business travel", emissionsTco2e: 0 },
];

const SCOPE_LABELS: Record<number, string> = {
  1: "Scope 1 — Direct emissions",
  2: "Scope 2 — Indirect energy",
  3: "Scope 3 — Value chain",
};

export function BaselineForm({ baseline }: { baseline: BaselineData }) {
  const router = useRouter();
  const [year, setYear] = useState(baseline?.year ?? new Date().getFullYear() - 1);
  const [growthRatePct, setGrowthRatePct] = useState(baseline?.growthRatePct ?? 0);
  const [entries, setEntries] = useState<Entry[]>(
    baseline?.entries.length
      ? baseline.entries.map((e) => ({
          scope: e.scope as 1 | 2 | 3,
          category: e.category,
          emissionsTco2e: e.emissionsTco2e,
        }))
      : DEFAULT_ENTRIES
  );
  const [growthRates, setGrowthRates] = useState<GrowthRateRow[]>(
    baseline?.growthRates?.length
      ? baseline.growthRates.map((gr) => ({
          fromYear: gr.fromYear,
          toYear: gr.toYear,
          ratePct: gr.ratePct,
        }))
      : []
  );
  const [loading, setLoading] = useState(false);

  const totalByScope = (scope: 1 | 2 | 3) =>
    entries.filter((e) => e.scope === scope).reduce((s, e) => s + e.emissionsTco2e, 0);

  const total = entries.reduce((s, e) => s + e.emissionsTco2e, 0);

  function addEntry(scope: 1 | 2 | 3) {
    setEntries((prev) => [...prev, { scope, category: "", emissionsTco2e: 0 }]);
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  const updateEntry = useCallback((idx: number, field: keyof Entry, value: string | number) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e))
    );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (entries.some((e) => !e.category.trim())) {
      toast.error("All entries must have a category name");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/baseline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, growthRatePct, entries, growthRates }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      toast.error(body.error ?? "Failed to save baseline");
      return;
    }
    toast.success("Baseline saved");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Base year + growth rate */}
      <Card className="border-gray-200 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-700">Base year &amp; growth rate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="year">Base year</Label>
            <Input
              id="year"
              type="number"
              min={1990}
              max={new Date().getFullYear()}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              required
            />
          </div>

          {/* Growth rate section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>BAU growth rate</Label>
              <span className="text-xs text-gray-400">Used to project business-as-usual trajectory</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-40 space-y-1">
                <Label className="text-xs text-gray-500">Default annual rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min={-100}
                  max={100}
                  value={growthRatePct}
                  onChange={(e) => setGrowthRatePct(Number(e.target.value))}
                  placeholder="0"
                  className="h-8 text-sm"
                />
              </div>
              <p className="text-xs text-gray-400 pt-5">Applied outside period ranges below</p>
            </div>

            {growthRates.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="grid grid-cols-[1fr_1fr_1fr_28px] gap-2 text-xs text-gray-500 px-1">
                  <span>From year</span>
                  <span>To year</span>
                  <span>Rate (%)</span>
                  <span />
                </div>
                {growthRates.map((gr, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_28px] gap-2 items-center">
                    <Input
                      type="number"
                      min={1900}
                      max={2100}
                      value={gr.fromYear}
                      onChange={(e) =>
                        setGrowthRates((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, fromYear: Number(e.target.value) } : r))
                        )
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      min={1900}
                      max={2100}
                      value={gr.toYear}
                      onChange={(e) =>
                        setGrowthRates((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, toYear: Number(e.target.value) } : r))
                        )
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      min={-100}
                      max={100}
                      value={gr.ratePct}
                      onChange={(e) =>
                        setGrowthRates((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, ratePct: Number(e.target.value) } : r))
                        )
                      }
                      className="h-8 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setGrowthRates((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setGrowthRates((prev) => [
                  ...prev,
                  {
                    fromYear: (baseline?.year ?? new Date().getFullYear()) + 1,
                    toYear: 2050,
                    ratePct: 1.0,
                  },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add period
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scope entries */}
      {([1, 2, 3] as const).map((scope) => (
        <Card key={scope} className="border-gray-200 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-700">
                {SCOPE_LABELS[scope]}
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {totalByScope(scope).toLocaleString(undefined, { maximumFractionDigits: 1 })} tCO₂e
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addEntry(scope)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add category
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {entries
              .map((e, idx) => ({ e, idx }))
              .filter(({ e }) => e.scope === scope)
              .map(({ e, idx }) => (
                <div key={idx} className="grid grid-cols-[1fr_160px_36px] gap-2 items-center">
                  <Input
                    placeholder="Category name"
                    value={e.category}
                    onChange={(ev) => updateEntry(idx, "category", ev.target.value)}
                    required
                  />
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="0"
                      value={e.emissionsTco2e || ""}
                      onChange={(ev) => updateEntry(idx, "emissionsTco2e", Number(ev.target.value))}
                      className="pr-14"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      tCO₂e
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-gray-400 hover:text-red-500"
                    onClick={() => removeEntry(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            {entries.filter((e) => e.scope === scope).length === 0 && (
              <p className="text-sm text-gray-400 py-2">
                No categories yet.{" "}
                <button type="button" className="underline" onClick={() => addEntry(scope)}>
                  Add one
                </button>
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      <Separator />

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Total baseline:{" "}
          <span className="font-semibold text-gray-900">
            {total.toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO₂e
          </span>
        </p>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save baseline"}
        </Button>
      </div>
    </form>
  );
}
