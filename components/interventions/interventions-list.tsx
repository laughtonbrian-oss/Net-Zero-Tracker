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
import type { Intervention, InterventionAnnualReduction, InterventionDocument, Site, BusinessUnit } from "@prisma/client";

type InterventionWithRelations = Omit<Intervention, "scopesAffected"> & {
  scopesAffected: number[]; // stored as JSON string in DB; API returns parsed array
  site: { id: string; name: string } | null;
  businessUnit: { id: string; name: string } | null;
  annualReductions?: InterventionAnnualReduction[];
  documents?: InterventionDocument[];
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PLANNED: { label: "Planned", color: "bg-blue-50 text-blue-700 border-blue-200" },
  IN_PROGRESS: { label: "In progress", color: "bg-amber-50 text-amber-700 border-amber-200" },
  COMPLETED: { label: "Completed", color: "bg-green-50 text-green-700 border-green-200" },
  ABANDONED: { label: "Abandoned", color: "bg-gray-50 text-gray-500 border-gray-200" },
};

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
        <p className="text-sm text-gray-500">
          {items.length} intervention{items.length !== 1 ? "s" : ""} ·{" "}
          <span className="font-medium text-gray-700">
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
        <Card className="border-gray-200 shadow-none">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-gray-500">No interventions yet.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
              Add your first intervention
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Scope(s)</TableHead>
              <TableHead>Reduction (tCO₂e)</TableHead>
              <TableHead>Timeline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const st = STATUS_LABELS[item.status] ?? STATUS_LABELS.PLANNED;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium max-w-xs truncate">
                    {item.name}
                    {item.owner && (
                      <span className="block text-xs text-gray-400">{item.owner}</span>
                    )}
                    {(item.site || item.businessUnit) && (
                      <span className="block text-xs text-gray-400">
                        {[item.site?.name, item.businessUnit?.name].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{item.category}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {item.scopesAffected.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs px-1.5">
                          S{s}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.totalReductionTco2e.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {item.implementationStartYear}–{item.fullBenefitYear}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${st.color}`}
                    >
                      {st.label}
                    </span>
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
              );
            })}
          </TableBody>
        </Table>
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
