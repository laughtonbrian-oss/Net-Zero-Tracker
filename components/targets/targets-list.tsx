"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SCOPE_COMBINATIONS } from "@/lib/types";
import type { Target } from "@prisma/client";

type TargetForm = {
  label: string;
  scopeCombination: string;
  targetYear: number;
  reductionPct: number;
  isInterim: boolean;
  isSbtiAligned: boolean;
};

const EMPTY_FORM: TargetForm = {
  label: "",
  scopeCombination: "1+2+3",
  targetYear: 2050,
  reductionPct: 100,
  isInterim: false,
  isSbtiAligned: false,
};

export function TargetsList({ initialTargets }: { initialTargets: Target[] }) {
  const [targets, setTargets] = useState<Target[]>(initialTargets);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Target | null>(null);
  const [form, setForm] = useState<TargetForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(t: Target) {
    setEditing(t);
    setForm({
      label: t.label,
      scopeCombination: t.scopeCombination,
      targetYear: t.targetYear,
      reductionPct: t.reductionPct,
      isInterim: t.isInterim,
      isSbtiAligned: t.isSbtiAligned,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.label || !form.scopeCombination) {
      toast.error("Please fill in all required fields");
      return;
    }
    setLoading(true);
    const url = editing ? `/api/targets/${editing.id}` : "/api/targets";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json();
      toast.error(body.error ?? "Failed to save");
      return;
    }

    const { data } = await res.json();
    setTargets((prev) =>
      editing ? prev.map((t) => (t.id === editing.id ? data : t)) : [...prev, data]
    );
    setOpen(false);
    toast.success(editing ? "Target updated" : "Target added");
  }

  async function handleDelete(t: Target) {
    if (!confirm(`Delete target "${t.label}"?`)) return;
    const res = await fetch(`/api/targets/${t.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    setTargets((prev) => prev.filter((x) => x.id !== t.id));
    toast.success("Target deleted");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add target
        </Button>
      </div>

      {targets.length === 0 ? (
        <Card className="border-gray-200 shadow-none">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-gray-500">No targets set yet.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
              Add your first target
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Label</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Reduction</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {targets.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">
                  {t.label}
                  {t.isSbtiAligned && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      SBTi
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  Scope {t.scopeCombination}
                </TableCell>
                <TableCell>{t.targetYear}</TableCell>
                <TableCell>{t.reductionPct}%</TableCell>
                <TableCell>
                  <Badge
                    variant={t.isInterim ? "outline" : "default"}
                    className="text-xs"
                  >
                    {t.isInterim ? "Interim" : "Final"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(t)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-500"
                      onClick={() => handleDelete(t)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit target" : "Add target"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Label</Label>
              <Input
                placeholder='e.g. "Net zero by 2050"'
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Scope combination</Label>
                <Select
                  value={form.scopeCombination}
                  onValueChange={(v) => setForm((f) => ({ ...f, scopeCombination: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPE_COMBINATIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Target year</Label>
                <Input
                  type="number"
                  min={2020}
                  max={2100}
                  value={form.targetYear}
                  onChange={(e) => setForm((f) => ({ ...f, targetYear: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Reduction (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.reductionPct}
                onChange={(e) => setForm((f) => ({ ...f, reductionPct: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isInterim}
                  onChange={(e) => setForm((f) => ({ ...f, isInterim: e.target.checked }))}
                  className="rounded"
                />
                Interim target
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isSbtiAligned}
                  onChange={(e) => setForm((f) => ({ ...f, isSbtiAligned: e.target.checked }))}
                  className="rounded"
                />
                SBTi aligned
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
