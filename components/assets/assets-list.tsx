"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Upload, Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { Site, Intervention } from "@prisma/client";

type Asset = {
  id: string;
  companyId: string;
  siteId: string;
  name: string;
  assetType: string;
  category: string;
  conditionRating: "RED" | "AMBER" | "GREEN";
  conditionNotes: string | null;
  installationYear: number;
  expectedUsefulLife: number;
  currentEnergyKwh: number | null;
  scope: number;
  linkedInterventionId: string | null;
  alertThresholdYears: number;
  replacementPriority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  createdAt: Date;
  updatedAt: Date;
  site: { id: string; name: string };
  linkedIntervention: { id: string; name: string } | null;
};

type FormState = {
  siteId: string;
  name: string;
  assetType: string;
  category: string;
  conditionRating: "RED" | "AMBER" | "GREEN";
  conditionNotes: string;
  installationYear: number;
  expectedUsefulLife: number;
  currentEnergyKwh: string;
  scope: number;
  linkedInterventionId: string;
  alertThresholdYears: number;
  replacementPriority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

const EMPTY_FORM: FormState = {
  siteId: "",
  name: "",
  assetType: "",
  category: "",
  conditionRating: "AMBER",
  conditionNotes: "",
  installationYear: new Date().getFullYear() - 5,
  expectedUsefulLife: 20,
  currentEnergyKwh: "",
  scope: 2,
  linkedInterventionId: "",
  alertThresholdYears: 3,
  replacementPriority: "MEDIUM",
};

const CONDITION_STYLES: Record<string, string> = {
  RED: "bg-red-50 text-red-700 border-red-200",
  AMBER: "bg-amber-50 text-amber-700 border-amber-200",
  GREEN: "bg-green-50 text-green-700 border-green-200",
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-gray-50 text-gray-500 border-gray-200",
  MEDIUM: "bg-blue-50 text-blue-700 border-blue-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  CRITICAL: "bg-red-50 text-red-700 border-red-200",
};

const currentYear = new Date().getFullYear();

export function AssetsList({
  initialAssets,
  sites,
  interventions,
}: {
  initialAssets: Asset[];
  sites: Pick<Site, "id" | "name">[];
  interventions: Pick<Intervention, "id" | "name">[];
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const eolWarnings = assets.filter((a) => {
    const eol = a.installationYear + a.expectedUsefulLife;
    return eol - currentYear <= a.alertThresholdYears;
  }).length;

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, siteId: sites[0]?.id ?? "" });
    setOpen(true);
  }

  function openEdit(a: Asset) {
    setEditing(a);
    setForm({
      siteId: a.siteId,
      name: a.name,
      assetType: a.assetType,
      category: a.category,
      conditionRating: a.conditionRating,
      conditionNotes: a.conditionNotes ?? "",
      installationYear: a.installationYear,
      expectedUsefulLife: a.expectedUsefulLife,
      currentEnergyKwh: a.currentEnergyKwh?.toString() ?? "",
      scope: a.scope,
      linkedInterventionId: a.linkedInterventionId ?? "",
      alertThresholdYears: a.alertThresholdYears,
      replacementPriority: a.replacementPriority,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.siteId || !form.name || !form.assetType || !form.category) {
      toast.error("Site, name, type, and category are required");
      return;
    }
    setLoading(true);
    const url = editing ? `/api/assets/${editing.id}` : "/api/assets";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        currentEnergyKwh: form.currentEnergyKwh ? Number(form.currentEnergyKwh) : undefined,
        linkedInterventionId: form.linkedInterventionId || undefined,
        conditionNotes: form.conditionNotes || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      toast.error(body.error ?? "Failed to save");
      return;
    }
    const { data } = await res.json();
    setAssets((prev) => editing ? prev.map((a) => (a.id === editing.id ? data : a)) : [data, ...prev]);
    setOpen(false);
    toast.success(editing ? "Asset updated" : "Asset added");
  }

  async function handleDelete(a: Asset) {
    if (!confirm(`Delete "${a.name}"?`)) return;
    const res = await fetch(`/api/assets/${a.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    setAssets((prev) => prev.filter((x) => x.id !== a.id));
    toast.success("Asset deleted");
  }

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([{
      Site: "Head Office",
      Name: "HVAC Unit 1",
      AssetType: "HVAC",
      Category: "HVAC",
      ConditionRating: "AMBER",
      ConditionNotes: "",
      InstallationYear: 2010,
      ExpectedUsefulLife: 20,
      CurrentEnergyKwh: 50000,
      Scope: 2,
      AlertThresholdYears: 3,
      ReplacementPriority: "MEDIUM",
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Assets");
    XLSX.writeFile(wb, "asset-import-template.xlsx");
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

      const siteMap = Object.fromEntries(sites.map((s) => [s.name.toLowerCase(), s.id]));

      let successCount = 0;
      const errors: string[] = [];

      for (const [i, row] of rows.entries()) {
        const siteName = String(row.Site ?? "").toLowerCase();
        const siteId = siteMap[siteName];
        if (!siteId) {
          errors.push(`Row ${i + 2}: Site "${row.Site}" not found`);
          continue;
        }

        const payload = {
          siteId,
          name: String(row.Name ?? ""),
          assetType: String(row.AssetType ?? ""),
          category: String(row.Category ?? ""),
          conditionRating: String(row.ConditionRating ?? "AMBER"),
          conditionNotes: row.ConditionNotes ? String(row.ConditionNotes) : undefined,
          installationYear: Number(row.InstallationYear),
          expectedUsefulLife: Number(row.ExpectedUsefulLife),
          currentEnergyKwh: row.CurrentEnergyKwh ? Number(row.CurrentEnergyKwh) : undefined,
          scope: Number(row.Scope ?? 2),
          alertThresholdYears: Number(row.AlertThresholdYears ?? 3),
          replacementPriority: String(row.ReplacementPriority ?? "MEDIUM"),
        };

        const res = await fetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const { data: asset } = await res.json();
          setAssets((prev) => [...prev, asset]);
          successCount++;
        } else {
          errors.push(`Row ${i + 2}: ${(await res.json()).error ?? "Unknown error"}`);
        }
      }

      if (successCount > 0) toast.success(`Imported ${successCount} asset${successCount !== 1 ? "s" : ""}`);
      if (errors.length > 0) toast.error(errors.slice(0, 3).join("; ") + (errors.length > 3 ? `… (+${errors.length - 3} more)` : ""));
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {assets.length} asset{assets.length !== 1 ? "s" : ""}
          {eolWarnings > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              {eolWarnings} approaching end of life
            </span>
          )}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={downloadTemplate}>
            <Download className="h-3.5 w-3.5 mr-1" /> Template
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1" /> Import
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <Button size="sm" onClick={openCreate} disabled={sites.length === 0}>
            <Plus className="h-4 w-4 mr-1" /> Add asset
          </Button>
        </div>
      </div>

      {sites.length === 0 && (
        <Card className="border-amber-200 shadow-none bg-amber-50">
          <CardContent className="py-4 text-center text-sm text-amber-700">
            Create at least one site in Settings → Team before adding assets.
          </CardContent>
        </Card>
      )}

      {assets.length === 0 && sites.length > 0 ? (
        <Card className="border-gray-200 shadow-none">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-gray-500">No assets yet. Import from Excel or add manually.</p>
          </CardContent>
        </Card>
      ) : assets.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Asset</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>EOL</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((a) => {
              const eol = a.installationYear + a.expectedUsefulLife;
              const yearsLeft = eol - currentYear;
              const isAlert = yearsLeft <= a.alertThresholdYears;
              return (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{a.name}</div>
                    <div className="text-xs text-gray-400">{a.assetType} · {a.category} · Scope {a.scope}</div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{a.site.name}</TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${isAlert ? "text-red-600" : "text-gray-700"}`}>
                      {eol}
                    </span>
                    <span className="block text-xs text-gray-400">
                      {yearsLeft <= 0 ? "Past EOL" : `${yearsLeft}yr${yearsLeft !== 1 ? "s" : ""} left`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${CONDITION_STYLES[a.conditionRating]}`}>
                      {a.conditionRating}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${PRIORITY_STYLES[a.replacementPriority]}`}>
                      {a.replacementPriority}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => handleDelete(a)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit asset" : "Add asset"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Site *</Label>
                <Select value={form.siteId} onValueChange={(v) => setForm((f) => ({ ...f, siteId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Asset type *</Label>
                <Input value={form.assetType} onChange={(e) => setForm((f) => ({ ...f, assetType: e.target.value }))} placeholder="e.g. HVAC, Boiler" />
              </div>
              <div className="space-y-1">
                <Label>Category *</Label>
                <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Energy, Fleet" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Install year *</Label>
                <Input type="number" value={form.installationYear} onChange={(e) => setForm((f) => ({ ...f, installationYear: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Useful life (yrs) *</Label>
                <Input type="number" value={form.expectedUsefulLife} onChange={(e) => setForm((f) => ({ ...f, expectedUsefulLife: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Scope *</Label>
                <Select value={String(form.scope)} onValueChange={(v) => setForm((f) => ({ ...f, scope: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Scope 1</SelectItem>
                    <SelectItem value="2">Scope 2</SelectItem>
                    <SelectItem value="3">Scope 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Condition</Label>
                <Select value={form.conditionRating} onValueChange={(v) => setForm((f) => ({ ...f, conditionRating: v as "RED" | "AMBER" | "GREEN" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GREEN">Green</SelectItem>
                    <SelectItem value="AMBER">Amber</SelectItem>
                    <SelectItem value="RED">Red</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={form.replacementPriority} onValueChange={(v) => setForm((f) => ({ ...f, replacementPriority: v as FormState["replacementPriority"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Alert threshold (yrs)</Label>
                <Input type="number" min={0} value={form.alertThresholdYears} onChange={(e) => setForm((f) => ({ ...f, alertThresholdYears: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Energy (kWh/yr)</Label>
                <Input type="number" step="any" value={form.currentEnergyKwh} onChange={(e) => setForm((f) => ({ ...f, currentEnergyKwh: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Linked intervention</Label>
              <Select value={form.linkedInterventionId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, linkedInterventionId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {interventions.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Condition notes</Label>
              <textarea
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 resize-none"
                rows={2}
                value={form.conditionNotes}
                onChange={(e) => setForm((f) => ({ ...f, conditionNotes: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>{loading ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
