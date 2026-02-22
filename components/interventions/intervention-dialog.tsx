"use client";

import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import type { Intervention, InterventionAnnualReduction, InterventionDocument, Site, BusinessUnit } from "@prisma/client";

type InterventionWithParsedScopes = Omit<Intervention, "scopesAffected"> & {
  scopesAffected: number[];
  annualReductions?: InterventionAnnualReduction[];
  documents?: InterventionDocument[];
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: InterventionWithParsedScopes | null;
  onSaved: (item: InterventionWithParsedScopes & { site: null; businessUnit: null }) => void;
  sites: Pick<Site, "id" | "name">[];
  businessUnits: Pick<BusinessUnit, "id" | "name">[];
};

type FormState = {
  name: string;
  description: string;
  category: string;
  scopesAffected: number[];
  totalReductionTco2e: number;
  implementationStartYear: number;
  fullBenefitYear: number;
  status: string;
  owner: string;
  siteId: string;
  businessUnitId: string;
};

type AnnualRow = { year: number; tco2eReduction: number };

const EMPTY: FormState = {
  name: "",
  description: "",
  category: "",
  scopesAffected: [1],
  totalReductionTco2e: 0,
  implementationStartYear: new Date().getFullYear(),
  fullBenefitYear: new Date().getFullYear() + 3,
  status: "PLANNED",
  owner: "",
  siteId: "",
  businessUnitId: "",
};

const STATUS_OPTIONS = [
  { value: "PLANNED", label: "Planned" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ABANDONED", label: "Abandoned" },
];

export function InterventionDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
  sites,
  businessUnits,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [annualRows, setAnnualRows] = useState<AnnualRow[]>([]);
  const [docs, setDocs] = useState<InterventionDocument[]>([]);
  const [newDocName, setNewDocName] = useState("");
  const [newDocUrl, setNewDocUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description ?? "",
        category: editing.category,
        scopesAffected: editing.scopesAffected,
        totalReductionTco2e: editing.totalReductionTco2e,
        implementationStartYear: editing.implementationStartYear,
        fullBenefitYear: editing.fullBenefitYear,
        status: editing.status,
        owner: editing.owner ?? "",
        siteId: editing.siteId ?? "",
        businessUnitId: editing.businessUnitId ?? "",
      });
      setAnnualRows(
        (editing.annualReductions ?? []).map((r) => ({
          year: r.year,
          tco2eReduction: r.tco2eReduction,
        }))
      );
      setDocs(editing.documents ?? []);
    } else {
      setForm(EMPTY);
      setAnnualRows([]);
      setDocs([]);
    }
    setNewDocName("");
    setNewDocUrl("");
  }, [editing, open]);

  function toggleScope(s: number) {
    setForm((f) => ({
      ...f,
      scopesAffected: f.scopesAffected.includes(s)
        ? f.scopesAffected.filter((x) => x !== s)
        : [...f.scopesAffected, s].sort(),
    }));
  }

  function addAnnualRow() {
    const lastYear =
      annualRows.length > 0
        ? annualRows[annualRows.length - 1].year + 1
        : form.implementationStartYear;
    setAnnualRows((rows) => [...rows, { year: lastYear, tco2eReduction: 0 }]);
  }

  function removeAnnualRow(idx: number) {
    setAnnualRows((rows) => rows.filter((_, i) => i !== idx));
  }

  function updateAnnualRow(idx: number, key: keyof AnnualRow, val: number) {
    setAnnualRows((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, [key]: val } : r))
    );
  }

  async function addDoc() {
    if (!editing?.id) {
      toast.error("Save the intervention first before adding documents");
      return;
    }
    if (!newDocName || !newDocUrl) {
      toast.error("Both document name and URL are required");
      return;
    }
    const res = await fetch(`/api/interventions/${editing.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newDocName, url: newDocUrl }),
    });
    if (!res.ok) {
      const body = await res.json();
      toast.error(body.error ?? "Failed to add document");
      return;
    }
    const { data } = await res.json();
    setDocs((d) => [...d, data]);
    setNewDocName("");
    setNewDocUrl("");
    toast.success("Document added");
  }

  async function removeDoc(docId: string) {
    if (!editing?.id) return;
    const res = await fetch(`/api/interventions/${editing.id}/documents`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId }),
    });
    if (!res.ok) { toast.error("Failed to remove document"); return; }
    setDocs((d) => d.filter((x) => x.id !== docId));
  }

  async function handleSave() {
    if (!form.name || !form.category || form.scopesAffected.length === 0) {
      toast.error("Name, category, and at least one scope are required");
      return;
    }
    if (form.totalReductionTco2e <= 0) {
      toast.error("Total reduction must be greater than 0");
      return;
    }
    if (form.fullBenefitYear < form.implementationStartYear) {
      toast.error("Full benefit year must be ≥ implementation start year");
      return;
    }

    setLoading(true);
    const url = editing ? `/api/interventions/${editing.id}` : "/api/interventions";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        description: form.description || undefined,
        owner: form.owner || undefined,
        siteId: form.siteId || undefined,
        businessUnitId: form.businessUnitId || undefined,
      }),
    });

    if (!res.ok) {
      setLoading(false);
      const body = await res.json();
      toast.error(body.error ?? "Failed to save");
      return;
    }

    const { data } = await res.json();

    // Save annual reductions if any
    if (annualRows.length > 0) {
      await fetch(`/api/interventions/${data.id}/annual-reductions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: annualRows }),
      });
    }

    setLoading(false);
    onSaved({
      ...data,
      annualReductions: annualRows.map((r, i) => ({ id: String(i), interventionId: data.id, ...r })),
      documents: docs,
      site: null,
      businessUnit: null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit intervention" : "Add intervention"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-1">
          <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 h-auto mb-4">
            {["details", "reductions", "documents"].map((t) => (
              <TabsTrigger
                key={t}
                value={t}
                className="border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:text-gray-900 rounded-none pb-2 text-sm capitalize"
              >
                {t === "reductions" ? "Annual reductions" : t.charAt(0).toUpperCase() + t.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ─── Details tab ──────────────────────────────────────────── */}
          <TabsContent value="details" className="space-y-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Switch to renewable electricity"
              />
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <textarea
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 resize-none"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Category *</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Energy, Transport"
                />
              </div>
              <div className="space-y-1">
                <Label>Owner</Label>
                <Input
                  value={form.owner}
                  onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
                  placeholder="Team or person"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Site</Label>
                <Select
                  value={form.siteId || "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, siteId: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All sites</SelectItem>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Business unit</Label>
                <Select
                  value={form.businessUnitId || "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, businessUnitId: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All units" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All units</SelectItem>
                    {businessUnits.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Scopes affected *</Label>
              <div className="flex gap-2">
                {[1, 2, 3].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleScope(s)}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                      form.scopesAffected.includes(s)
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    Scope {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Total reduction (tCO₂e) *</Label>
              <Input
                type="number"
                min={0.1}
                step="any"
                value={form.totalReductionTco2e || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, totalReductionTco2e: Number(e.target.value) }))
                }
                placeholder="0"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Implementation start year *</Label>
                <Input
                  type="number"
                  min={2000}
                  max={2100}
                  value={form.implementationStartYear}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, implementationStartYear: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Full benefit year *</Label>
                <Input
                  type="number"
                  min={2000}
                  max={2100}
                  value={form.fullBenefitYear}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fullBenefitYear: Number(e.target.value) }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* ─── Annual reductions tab ───────────────────────────────── */}
          <TabsContent value="reductions" className="space-y-3">
            <p className="text-sm text-gray-500">
              Optionally specify the year-by-year reduction profile. If left empty the system
              linearly ramps abatement from the implementation start to the full benefit year.
            </p>
            {annualRows.length > 0 && (
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_1fr_32px] gap-2 text-xs text-gray-500 px-1">
                  <span>Year</span>
                  <span>Reduction (tCO₂e)</span>
                  <span />
                </div>
                {annualRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_32px] gap-2 items-center">
                    <Input
                      type="number"
                      value={row.year}
                      onChange={(e) => updateAnnualRow(idx, "year", Number(e.target.value))}
                    />
                    <Input
                      type="number"
                      step="any"
                      value={row.tco2eReduction}
                      onChange={(e) => updateAnnualRow(idx, "tco2eReduction", Number(e.target.value))}
                    />
                    <button
                      type="button"
                      onClick={() => removeAnnualRow(idx)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button type="button" variant="outline" size="sm" onClick={addAnnualRow}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add year
            </Button>
          </TabsContent>

          {/* ─── Documents tab ───────────────────────────────────────── */}
          <TabsContent value="documents" className="space-y-3">
            {!editing && (
              <p className="text-sm text-gray-400">
                Save the intervention first to attach documents.
              </p>
            )}
            {editing && (
              <>
                {docs.length > 0 && (
                  <ul className="space-y-1">
                    {docs.map((d) => (
                      <li key={d.id} className="flex items-center gap-2 text-sm">
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline truncate"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          {d.name}
                        </a>
                        <button
                          type="button"
                          onClick={() => removeDoc(d.id)}
                          className="ml-auto text-gray-400 hover:text-red-500 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      placeholder="Document name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">URL</Label>
                    <Input
                      value={newDocUrl}
                      onChange={(e) => setNewDocUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addDoc}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
