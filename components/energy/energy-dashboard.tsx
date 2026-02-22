"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Zap, DollarSign, Leaf } from "lucide-react";
import { toast } from "sonner";
import { kWhToTco2e } from "@/lib/emission-factors";

type Site = { id: string; name: string; country: string | null };
type EnergyReading = {
  id: string;
  siteId: string;
  year: number;
  month: number;
  energyType: string;
  kWh: number;
  cost: number | null;
  site: Site;
};

type Props = {
  initialReadings: EnergyReading[];
  sites: Site[];
};

const ENERGY_TYPES = ["ELECTRICITY", "GAS", "DIESEL", "OTHER"];
const ENERGY_COLORS: Record<string, string> = {
  ELECTRICITY: "#059669",
  GAS: "#f59e0b",
  DIESEL: "#6366f1",
  OTHER: "#9ca3af",
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function countryToRegion(country: string | null): string {
  if (!country) return "UK";
  const c = country.toLowerCase();
  if (c.includes("united kingdom") || c.includes("uk") || c.includes("england") || c.includes("scotland") || c.includes("wales")) return "UK";
  if (c.includes("united states") || c.includes("usa") || c.includes("america")) return "US";
  if (c.includes("canada")) return "Canada";
  if (c.includes("poland")) return "Poland";
  return "UK";
}

function energyTypeToFuel(energyType: string): string {
  switch (energyType) {
    case "ELECTRICITY": return "Grid Electricity";
    case "GAS": return "Natural Gas";
    case "DIESEL": return "Diesel";
    default: return "Natural Gas";
  }
}

export function EnergyDashboard({ initialReadings, sites }: Props) {
  const [readings, setReadings] = useState<EnergyReading[]>(initialReadings);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    siteId: sites[0]?.id ?? "",
    year: String(new Date().getFullYear()),
    month: String(new Date().getMonth() + 1),
    energyType: "ELECTRICITY",
    kWh: "",
    cost: "",
  });

  // KPI calculations
  const totalKwh = readings.reduce((s, r) => s + r.kWh, 0);
  const totalCost = readings.reduce((s, r) => s + (r.cost ?? 0), 0);
  const totalCo2e = readings.reduce((s, r) => {
    const region = countryToRegion(r.site.country);
    const fuel = energyTypeToFuel(r.energyType);
    return s + kWhToTco2e(r.kWh, region, fuel);
  }, 0);

  // By site data
  const bySite: Record<string, number> = {};
  for (const r of readings) {
    bySite[r.site.name] = (bySite[r.site.name] ?? 0) + r.kWh;
  }
  const bySiteData = Object.entries(bySite)
    .map(([name, kWh]) => ({ name, kWh }))
    .sort((a, b) => b.kWh - a.kWh)
    .slice(0, 10);

  // By energy type (pie)
  const byType: Record<string, number> = {};
  for (const r of readings) {
    byType[r.energyType] = (byType[r.energyType] ?? 0) + r.kWh;
  }
  const pieData = Object.entries(byType).map(([name, value]) => ({ name, value }));

  // Monthly trend (last 12 months current year)
  const currentYear = new Date().getFullYear();
  const monthlyData = MONTHS.map((month, i) => {
    const monthReadings = readings.filter((r) => r.year === currentYear && r.month === i + 1);
    return {
      month,
      kWh: monthReadings.reduce((s, r) => s + r.kWh, 0),
    };
  });

  async function addReading() {
    if (!form.siteId || !form.kWh) {
      toast.error("Site and kWh are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/energy-readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: form.siteId,
          year: parseInt(form.year),
          month: parseInt(form.month),
          energyType: form.energyType,
          kWh: parseFloat(form.kWh),
          cost: form.cost ? parseFloat(form.cost) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const { data } = await res.json();
      setReadings((prev) => {
        const exists = prev.findIndex((r) => r.id === data.id);
        if (exists >= 0) {
          const next = [...prev];
          next[exists] = data;
          return next;
        }
        return [data, ...prev];
      });
      setAddOpen(false);
      toast.success("Reading added");
    } catch {
      toast.error("Failed to add reading");
    } finally {
      setSaving(false);
    }
  }

  async function deleteReading(id: string) {
    const res = await fetch(`/api/energy-readings/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    setReadings((prev) => prev.filter((r) => r.id !== id));
    toast.success("Reading deleted");
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-gray-200 shadow-none">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Zap className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Energy</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(totalKwh / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })} MWh
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-none">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Cost</p>
                <p className="text-lg font-semibold text-gray-900">
                  £{totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-none">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <Leaf className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Derived CO₂e</p>
                <p className="text-lg font-semibold text-gray-900">
                  {totalCo2e.toLocaleString(undefined, { maximumFractionDigits: 0 })} t
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="border-gray-200 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">kWh by Site</CardTitle>
          </CardHeader>
          <CardContent>
            {bySiteData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={bySiteData} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip formatter={(v: any) => [`${(v as number).toLocaleString()} kWh`, "Energy"]} />
                  <Bar dataKey="kWh" fill="#059669" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Energy Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={(props: any) => `${props.name ?? ""} ${(((props.percent as number | undefined) ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={ENERGY_COLORS[entry.name] ?? "#9ca3af"} />
                    ))}
                  </Pie>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip formatter={(v: any) => [`${(v as number).toLocaleString()} kWh`]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly trend */}
      <Card className="border-gray-200 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">Monthly Trend ({currentYear})</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip formatter={(v: any) => [`${(v as number).toLocaleString()} kWh`, "Energy"]} />
              <Legend />
              <Line type="monotone" dataKey="kWh" stroke="#059669" strokeWidth={2} dot={false} name="kWh" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Readings table */}
      <Card className="border-gray-200 shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-700">All Readings</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Reading
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {readings.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              No energy readings yet. Add your first reading above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Site</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-600">Year</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-600">Month</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-600">Type</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-600">kWh</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-600">Cost (£)</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-600">CO₂e (t)</th>
                    <th className="px-4 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {readings.map((r) => {
                    const region = countryToRegion(r.site.country);
                    const fuel = energyTypeToFuel(r.energyType);
                    const co2e = kWhToTco2e(r.kWh, region, fuel);
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2 text-gray-700">{r.site.name}</td>
                        <td className="px-3 py-2 text-gray-600">{r.year}</td>
                        <td className="px-3 py-2 text-gray-600">{MONTHS[r.month - 1]}</td>
                        <td className="px-3 py-2">
                          <span
                            className="px-2 py-0.5 rounded text-[11px] font-medium"
                            style={{
                              backgroundColor: `${ENERGY_COLORS[r.energyType] ?? "#9ca3af"}20`,
                              color: ENERGY_COLORS[r.energyType] ?? "#6b7280",
                            }}
                          >
                            {r.energyType}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                          {r.kWh.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                          {r.cost != null ? r.cost.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                          {co2e.toFixed(2)}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => deleteReading(r.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Energy Reading</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Site *</Label>
              <Select value={form.siteId} onValueChange={(v) => setForm((f) => ({ ...f, siteId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Year *</Label>
                <Input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                  min={1900}
                  max={2100}
                />
              </div>
              <div className="space-y-1">
                <Label>Month *</Label>
                <Select value={form.month} onValueChange={(v) => setForm((f) => ({ ...f, month: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Energy Type *</Label>
              <Select value={form.energyType} onValueChange={(v) => setForm((f) => ({ ...f, energyType: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENERGY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>kWh *</Label>
                <Input
                  type="number"
                  value={form.kWh}
                  onChange={(e) => setForm((f) => ({ ...f, kWh: e.target.value }))}
                  placeholder="0"
                  min={0}
                  step="0.01"
                />
              </div>
              <div className="space-y-1">
                <Label>Cost (£)</Label>
                <Input
                  type="number"
                  value={form.cost}
                  onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                  placeholder="Optional"
                  min={0}
                  step="0.01"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addReading} disabled={saving}>
              {saving ? "Saving…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
