"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { toast } from "sonner";

export type FinancialFields = {
  startYear: number;
  endYear: number | null;
  startQuarter: number | null;
  endQuarter: number | null;
  executionPct: number;
  implementationPacePctPerYear: number | null;
  technicalAssetLife: number | null;
  capex: number | null;
  opex: number | null;
  financialLifetime: number | null;
  externalFunding: number | null;
  personnelTimeDays: number | null;
  personnelRatePerDay: number | null;
  notes: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scenarioId: string;
  interventionId: string;
  interventionName: string;
  current: FinancialFields;
  onSaved: (updated: FinancialFields) => void;
};

function numVal(v: number | null): string {
  return v === null || v === undefined ? "" : String(v);
}

function parseNum(s: string): number | null {
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

export function ScenarioInterventionEditor({
  open,
  onOpenChange,
  scenarioId,
  interventionId,
  interventionName,
  current,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FinancialFields>(current);
  const [loading, setLoading] = useState(false);
  const key = `${scenarioId}-${interventionId}-${open}`;

  async function handleSave() {
    setLoading(true);
    const res = await fetch(`/api/scenarios/${scenarioId}/interventions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interventionId, ...form }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      toast.error(body.error ?? "Failed to save");
      return;
    }
    onSaved(form);
    onOpenChange(false);
    toast.success("Scenario parameters updated");
  }

  function field(
    label: string,
    fkey: keyof FinancialFields,
    opts?: { unit?: string; hint?: string }
  ) {
    const val = form[fkey];
    const strVal = typeof val === "number" ? String(val) : numVal(val as number | null);
    return (
      <div className="space-y-1">
        <Label className="text-xs">
          {label}
          {opts?.unit && <span className="text-gray-400 ml-1">({opts.unit})</span>}
        </Label>
        {opts?.hint && <p className="text-xs text-gray-400">{opts.hint}</p>}
        <Input
          type="number"
          step="any"
          value={strVal}
          onChange={(e) => setForm((f) => ({ ...f, [fkey]: parseNum(e.target.value) }))}
          placeholder="—"
        />
      </div>
    );
  }

  function quarterSelect(label: string, qkey: "startQuarter" | "endQuarter") {
    const val = form[qkey];
    return (
      <div className="space-y-1">
        <Label className="text-xs">{label}</Label>
        <Select
          value={val !== null && val !== undefined ? String(val) : ""}
          onValueChange={(v) => setForm((f) => ({ ...f, [qkey]: v ? Number(v) : null }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4].map((q) => (
              <SelectItem key={q} value={String(q)}>
                Q{q}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <Sheet key={key} open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{interventionName}</SheetTitle>
          <p className="text-xs text-gray-500">Scenario-specific parameters</p>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Timeline</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Start year</Label>
              <Input
                type="number"
                value={form.startYear}
                onChange={(e) => setForm((f) => ({ ...f, startYear: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End year</Label>
              <Input
                type="number"
                value={numVal(form.endYear)}
                onChange={(e) => setForm((f) => ({ ...f, endYear: parseNum(e.target.value) }))}
                placeholder="—"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {quarterSelect("Start quarter", "startQuarter")}
            {quarterSelect("End quarter", "endQuarter")}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field("Execution", "executionPct", { unit: "%" })}
            {field("Implementation pace", "implementationPacePctPerYear", {
              unit: "%/yr",
              hint: "How fast the intervention ramps up",
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field("Technical asset life", "technicalAssetLife", {
              unit: "yrs",
              hint: "Used to flag replacement need before 2050",
            })}
          </div>

          <hr className="border-gray-100" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Financials</p>

          <div className="grid grid-cols-2 gap-3">
            {field("Capex", "capex", { unit: "$" })}
            {field("Opex", "opex", { unit: "$/yr" })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("Financial lifetime", "financialLifetime", { unit: "yrs" })}
            {field("External funding", "externalFunding", { unit: "$" })}
          </div>

          <hr className="border-gray-100" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Personnel</p>

          <div className="grid grid-cols-2 gap-3">
            {field("Time", "personnelTimeDays", { unit: "days" })}
            {field("Day rate", "personnelRatePerDay", { unit: "$/day" })}
          </div>

          <hr className="border-gray-100" />
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <textarea
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 resize-none"
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
              placeholder="Optional notes"
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
