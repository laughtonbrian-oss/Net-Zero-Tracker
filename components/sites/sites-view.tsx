"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Download, Upload, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import type { Site } from "@prisma/client";

const SITE_TYPES = [
  { value: "office", label: "Office" },
  { value: "warehouse", label: "Warehouse" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "retail", label: "Retail" },
  { value: "data_centre", label: "Data Centre" },
  { value: "other", label: "Other" },
];

type SiteRow = Pick<Site, "id" | "name" | "address" | "city" | "region" | "country" |
  "latitude" | "longitude" | "siteType" | "grossFloorAreaM2" | "yearBuilt" | "siteManager" | "notes">;

type FormState = {
  name: string;
  address: string;
  city: string;
  region: string;
  country: string;
  latitude: string;
  longitude: string;
  siteType: string;
  grossFloorAreaM2: string;
  yearBuilt: string;
  siteManager: string;
  notes: string;
};

const emptyForm: FormState = {
  name: "", address: "", city: "", region: "", country: "",
  latitude: "", longitude: "", siteType: "",
  grossFloorAreaM2: "", yearBuilt: "", siteManager: "", notes: "",
};

function siteToForm(s: SiteRow): FormState {
  return {
    name: s.name,
    address: s.address ?? "",
    city: s.city ?? "",
    region: s.region ?? "",
    country: s.country ?? "",
    latitude: s.latitude != null ? String(s.latitude) : "",
    longitude: s.longitude != null ? String(s.longitude) : "",
    siteType: s.siteType ?? "",
    grossFloorAreaM2: s.grossFloorAreaM2 != null ? String(s.grossFloorAreaM2) : "",
    yearBuilt: s.yearBuilt != null ? String(s.yearBuilt) : "",
    siteManager: s.siteManager ?? "",
    notes: s.notes ?? "",
  };
}

function formToPayload(f: FormState) {
  return {
    name: f.name.trim(),
    address: f.address.trim() || undefined,
    city: f.city.trim() || undefined,
    region: f.region.trim() || undefined,
    country: f.country.trim() || undefined,
    latitude: f.latitude !== "" ? parseFloat(f.latitude) : undefined,
    longitude: f.longitude !== "" ? parseFloat(f.longitude) : undefined,
    siteType: f.siteType || undefined,
    grossFloorAreaM2: f.grossFloorAreaM2 !== "" ? parseFloat(f.grossFloorAreaM2) : undefined,
    yearBuilt: f.yearBuilt !== "" ? parseInt(f.yearBuilt) : undefined,
    siteManager: f.siteManager.trim() || undefined,
    notes: f.notes.trim() || undefined,
  };
}

type ImportError = { row: number; errors: string[] };

export function SitesView({ initialSites }: { initialSites: SiteRow[] }) {
  const [sites, setSites] = useState<SiteRow[]>(initialSites);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SiteRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(site: SiteRow) {
    setEditing(site);
    setForm(siteToForm(site));
    setDialogOpen(true);
  }

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Site name is required"); return; }
    setSaving(true);
    try {
      const payload = formToPayload(form);
      if (editing) {
        const res = await fetch(`/api/sites/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { toast.error("Failed to update site"); return; }
        const { data } = await res.json();
        setSites((s) => s.map((x) => (x.id === editing.id ? data : x)));
        toast.success("Site updated");
      } else {
        const res = await fetch("/api/sites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { toast.error("Failed to create site"); return; }
        const { data } = await res.json();
        setSites((s) => [...s, data].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success("Site created");
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/sites/${deleteId}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete site"); return; }
      setSites((s) => s.filter((x) => x.id !== deleteId));
      toast.success("Site deleted");
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }

  function handleDownloadTemplate() {
    window.location.href = "/api/sites/export-template";
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportErrors([]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/sites/import", { method: "POST", body: fd });
      if (res.status === 422) {
        const { errors } = await res.json();
        setImportErrors(errors);
        toast.error("Import failed — fix errors and try again");
        return;
      }
      if (!res.ok) { toast.error("Import failed"); return; }
      const { data, count } = await res.json();
      setSites((s) => [...s, ...data].sort((a: SiteRow, b: SiteRow) => a.name.localeCompare(b.name)));
      toast.success(`Imported ${count} site${count !== 1 ? "s" : ""}`);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const siteTypeLabel = (t: string | null) =>
    SITE_TYPES.find((x) => x.value === t)?.label ?? t ?? "—";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add site
        </Button>
        <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
          <Download className="h-4 w-4 mr-1" /> Download template
        </Button>
        <Button
          size="sm" variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={importing}
        >
          <Upload className="h-4 w-4 mr-1" /> {importing ? "Importing…" : "Import Excel"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {/* Import errors */}
      {importErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50 shadow-none">
          <CardContent className="py-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700 mb-2">
                  Import failed — {importErrors.length} row{importErrors.length !== 1 ? "s" : ""} with errors:
                </p>
                <ul className="text-xs text-red-600 space-y-1">
                  {importErrors.map((e) => (
                    <li key={e.row}>
                      <span className="font-medium">Row {e.row}:</span> {e.errors.join("; ")}
                    </li>
                  ))}
                </ul>
              </div>
              <button onClick={() => setImportErrors([])} className="text-red-400 hover:text-red-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sites table */}
      {sites.length === 0 ? (
        <Card className="border-gray-200 shadow-none">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-gray-500">No sites yet. Add your first site or import from Excel.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-gray-50 dark:bg-slate-800/60">
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Area (m²)</TableHead>
                <TableHead>Year built</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site) => (
                <TableRow key={site.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                  <TableCell className="font-medium text-sm">{site.name}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {[site.city, site.region, site.country].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{siteTypeLabel(site.siteType)}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {site.grossFloorAreaM2 != null
                      ? site.grossFloorAreaM2.toLocaleString(undefined, { maximumFractionDigits: 0 })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{site.yearBuilt ?? "—"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{site.siteManager ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(site)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteId(site.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit site" : "Add site"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sheffield HQ" />
            </div>

            <div>
              <Label>Site type</Label>
              <Select value={form.siteType} onValueChange={(v) => set("siteType", v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {SITE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Site manager / owner</Label>
              <Input value={form.siteManager} onChange={(e) => set("siteManager", e.target.value)} placeholder="Name" />
            </div>

            <div className="col-span-2">
              <Label>Street address</Label>
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="123 Main St" />
            </div>

            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Sheffield" />
            </div>

            <div>
              <Label>Region / State / Province</Label>
              <Input value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="South Yorkshire" />
            </div>

            <div>
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="United Kingdom" />
            </div>

            <div>
              <Label>Year built</Label>
              <Input
                type="number" min={1800} max={2100}
                value={form.yearBuilt}
                onChange={(e) => set("yearBuilt", e.target.value)}
                placeholder="e.g. 1998"
              />
            </div>

            <div>
              <Label>Gross floor area (m²)</Label>
              <Input
                type="number" min={0}
                value={form.grossFloorAreaM2}
                onChange={(e) => set("grossFloorAreaM2", e.target.value)}
                placeholder="e.g. 4500"
              />
            </div>

            <div />

            <div>
              <Label>Latitude</Label>
              <Input
                type="number" step="any" min={-90} max={90}
                value={form.latitude}
                onChange={(e) => set("latitude", e.target.value)}
                placeholder="e.g. 53.3811"
              />
            </div>

            <div>
              <Label>Longitude</Label>
              <Input
                type="number" step="any" min={-180} max={180}
                value={form.longitude}
                onChange={(e) => set("longitude", e.target.value)}
                placeholder="e.g. -1.4701"
              />
            </div>

            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Any additional notes about this site…"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create site"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete site?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            This will remove the site. Interventions and assets linked to this site will be unlinked but not deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete site"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
