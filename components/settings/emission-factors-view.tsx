"use client";

import { useState } from "react";
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
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { EMISSION_FACTORS, FUEL_TYPES, REGIONS } from "@/lib/emission-factors";

type CompanyFactor = {
  id: string;
  region: string;
  fuelType: string;
  value: number;
  source: string;
  year: number;
};

type Props = {
  initialOverrides: CompanyFactor[];
};

export function EmissionFactorsView({ initialOverrides }: Props) {
  const [overrides, setOverrides] = useState<CompanyFactor[]>(initialOverrides);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    region: REGIONS[0],
    fuelType: FUEL_TYPES[0],
    value: "",
    source: "",
    year: String(new Date().getFullYear()),
  });

  async function addOverride() {
    if (!form.value || !form.source) {
      toast.error("Value and source are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/emission-factors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: form.region,
          fuelType: form.fuelType,
          value: parseFloat(form.value),
          source: form.source,
          year: parseInt(form.year),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const { data } = await res.json();
      setOverrides((prev) => {
        const exists = prev.findIndex((o) => o.id === data.id);
        if (exists >= 0) {
          const next = [...prev];
          next[exists] = data;
          return next;
        }
        return [...prev, data];
      });
      setAddOpen(false);
      toast.success("Override saved");
    } catch {
      toast.error("Failed to save override");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOverride(id: string) {
    const res = await fetch(`/api/emission-factors/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    setOverrides((prev) => prev.filter((o) => o.id !== id));
    toast.success("Override removed");
  }

  return (
    <div className="space-y-6">
      {/* Library table (read-only) */}
      <Card className="border-gray-200 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">Default Library</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Region</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600">Fuel Type</th>
                  <th className="text-right px-3 py-2.5 font-medium text-gray-600">kgCO₂e/kWh</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600">Source</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600">Year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {EMISSION_FACTORS.map((f, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2 text-gray-700">{f.region}</td>
                    <td className="px-3 py-2 text-gray-600">{f.fuelType}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-900">{f.value.toFixed(5)}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{f.source}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{f.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Company overrides */}
      <Card className="border-gray-200 shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-gray-700">Company Overrides</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">Override default factors for your specific circumstances.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Override
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {overrides.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No overrides yet. The default library factors will be used.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Region</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-600">Fuel Type</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-600">kgCO₂e/kWh</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-600">Source</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-600">Year</th>
                    <th className="px-4 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {overrides.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2 text-gray-700">{o.region}</td>
                      <td className="px-3 py-2 text-gray-600">{o.fuelType}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-900">{o.value.toFixed(5)}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{o.source}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{o.year}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => deleteOverride(o.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add override dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Emission Factor Override</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Region</Label>
              <Select value={form.region} onValueChange={(v) => setForm((f) => ({ ...f, region: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Fuel Type</Label>
              <Select value={form.fuelType} onValueChange={(v) => setForm((f) => ({ ...f, fuelType: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map((ft) => <SelectItem key={ft} value={ft}>{ft}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Value (kgCO₂e/kWh) *</Label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder="e.g. 0.2330"
                  step="0.00001"
                />
              </div>
              <div className="space-y-1">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Source *</Label>
              <Input
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                placeholder="e.g. Internal measurement 2025"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addOverride} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
