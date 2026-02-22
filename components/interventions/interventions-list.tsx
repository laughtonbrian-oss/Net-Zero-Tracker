"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { InterventionDialog } from "./intervention-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Intervention, InterventionAnnualReduction, InterventionDocument, Site, BusinessUnit } from "@prisma/client";

type InterventionWithRelations = Omit<Intervention, "scopesAffected"> & {
  scopesAffected: number[];
  site: { id: string; name: string } | null;
  businessUnit: { id: string; name: string } | null;
  annualReductions?: InterventionAnnualReduction[];
  documents?: InterventionDocument[];
};

const currentYear = new Date().getFullYear();

function ProgressBar({ startYear, fullYear, status }: { startYear: number; fullYear: number; status: string }) {
  let pct = 0;
  if (status === "COMPLETED") {
    pct = 100;
  } else if (status === "ABANDONED") {
    pct = 0;
  } else if (currentYear >= fullYear) {
    pct = 100;
  } else if (currentYear <= startYear) {
    pct = 0;
  } else {
    pct = Math.round(((currentYear - startYear) / (fullYear - startYear)) * 100);
  }

  const barColor =
    status === "COMPLETED"
      ? "bg-emerald-500"
      : status === "ABANDONED"
      ? "bg-gray-300 dark:bg-slate-600"
      : pct >= 100
      ? "bg-emerald-500"
      : "bg-emerald-400";

  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 dark:text-slate-500 tabular-nums w-7 text-right">{pct}%</span>
    </div>
  );
}

export function InterventionsList({
  initialInterventions,
  sites,
  businessUnits,
}: {
  initialInterventions: InterventionWithRelations[];
  sites: Pick<Site, "id" | "name">[];
  businessUnits: Pick<BusinessUnit, "id" | "name">[];
}) {
  const [items, setItems] = useState(initialInterventions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InterventionWithRelations | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(item: InterventionWithRelations) {
    setEditing(item);
    setDialogOpen(true);
  }

  function handleSaved(item: InterventionWithRelations) {
    setItems((prev) =>
      editing ? prev.map((x) => (x.id === item.id ? item : x)) : [item, ...prev]
    );
    setDialogOpen(false);
    toast.success(editing ? "Intervention updated" : "Intervention added");
  }

  async function handleDelete(item: InterventionWithRelations) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    const res = await fetch(`/api/interventions/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== item.id));
    toast.success("Intervention deleted");
  }

  const totalAbatement = items.reduce((s, i) => s + i.totalReductionTco2e, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {items.length} intervention{items.length !== 1 ? "s" : ""} ·{" "}
          <span className="font-medium text-gray-700 dark:text-slate-200">
            {totalAbatement.toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO₂e
          </span>{" "}
          total potential abatement
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add intervention
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="border-gray-200 dark:border-slate-700 shadow-none bg-white dark:bg-slate-800">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-gray-500 dark:text-slate-400">No interventions yet.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
              Add your first intervention
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-gray-50 dark:bg-slate-800/80">
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Scope(s)</TableHead>
                <TableHead className="text-xs">Reduction (tCO₂e)</TableHead>
                <TableHead className="text-xs">Timeline</TableHead>
                <TableHead className="text-xs">Progress</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <TableCell className="font-medium max-w-xs">
                    <span className="truncate block">{item.name}</span>
                    {item.owner && (
                      <span className="block text-xs text-gray-400 dark:text-slate-500">{item.owner}</span>
                    )}
                    {(item.site || item.businessUnit) && (
                      <span className="block text-xs text-gray-400 dark:text-slate-500">
                        {[item.site?.name, item.businessUnit?.name].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-slate-400">{item.category}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {item.scopesAffected.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs px-1.5">
                          S{s}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {item.totalReductionTco2e.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-slate-400">
                    {item.implementationStartYear}–{item.fullBenefitYear}
                  </TableCell>
                  <TableCell>
                    <ProgressBar
                      startYear={item.implementationStartYear}
                      fullYear={item.fullBenefitYear}
                      status={item.status}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status as "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED"} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-500"
                        onClick={() => handleDelete(item)}
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

      <InterventionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={handleSaved}
        sites={sites}
        businessUnits={businessUnits}
      />
    </div>
  );
}
