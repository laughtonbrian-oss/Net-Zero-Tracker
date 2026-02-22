"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Settings, Download } from "lucide-react";
import { toast } from "sonner";
import { GlidepathChart } from "@/components/charts/glidepath-chart";
import { WedgeChart } from "@/components/charts/wedge-chart";
import { MACCChart } from "@/components/charts/macc-chart";
import { ScenarioInterventionEditor } from "./scenario-intervention-editor";
import { buildGlidepathData } from "@/lib/calculations/emissions";
import { buildWedgeData } from "@/lib/calculations/wedge";
import { buildMACCData } from "@/lib/calculations/macc";
import type { Scenario, Intervention, Baseline, Target, BaselineEntry } from "@prisma/client";

type AnnualReduction = { year: number; tco2eReduction: number };
type ScenarioIntervention = {
  id: string;
  scenarioId: string;
  interventionId: string;
  startYear: number;
  endYear: number | null;
  startQuarter: number | null;
  endQuarter: number | null;
  implementationPacePctPerYear: number | null;
  executionPct: number;
  technicalAssetLife: number | null;
  financialLifetime: number | null;
  capex: number | null;
  opex: number | null;
  externalFunding: number | null;
  personnelTimeDays: number | null;
  personnelRatePerDay: number | null;
  notes: string | null;
  intervention: Intervention & { annualReductions: AnnualReduction[] };
};
type ScenarioWithInterventions = Scenario & { interventions: ScenarioIntervention[] };
type InterventionWithReductions = Intervention & { annualReductions: AnnualReduction[] };
type BaselineWithEntries = Baseline & { entries: BaselineEntry[] };

type Props = {
  initialScenarios: ScenarioWithInterventions[];
  interventions: InterventionWithReductions[];
  baseline: BaselineWithEntries | null;
  targets: Target[];
};

export function ScenariosView({ initialScenarios, interventions, baseline, targets }: Props) {
  const [scenarios, setScenarios] = useState<ScenarioWithInterventions[]>(initialScenarios);
  const [activeId, setActiveId] = useState<string | null>(initialScenarios[0]?.id ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingIv, setEditingIv] = useState<ScenarioIntervention | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const activeScenario = scenarios.find((s) => s.id === activeId) ?? null;
  const selectedInterventionIds = new Set(
    activeScenario?.interventions.map((si) => si.interventionId) ?? []
  );

  const currentYear = new Date().getFullYear();
  const baselineYear = baseline?.year ?? currentYear - 1;
  const latestTargetYear = targets.reduce((max, t) => Math.max(max, t.targetYear), currentYear + 25);
  const yearRange = { start: baselineYear, end: Math.max(latestTargetYear, currentYear + 30) };

  const baselineTotal = baseline
    ? baseline.entries.reduce((s, e) => s + e.emissionsTco2e, 0)
    : 0;

  const glidepathData =
    baseline && activeScenario
      ? buildGlidepathData({
          baseline: { ...baseline, entries: baseline.entries as { scope: number; emissionsTco2e: number }[] },
          scenarioInterventions: activeScenario.interventions.map((si) => ({
            interventionId: si.interventionId,
            startYear: si.startYear,
            endYear: si.endYear,
            executionPct: si.executionPct,
            implementationPacePctPerYear: si.implementationPacePctPerYear,
            intervention: {
              totalReductionTco2e: si.intervention.totalReductionTco2e,
              implementationStartYear: si.intervention.implementationStartYear,
              fullBenefitYear: si.intervention.fullBenefitYear,
              annualReductions: si.intervention.annualReductions,
            },
          })),
          targets: targets.map((t) => ({
            targetYear: t.targetYear,
            reductionPct: t.reductionPct,
            isInterim: t.isInterim,
            scopeCombination: t.scopeCombination,
          })),
          yearRange,
          actualEmissions: [],
        })
      : [];

  const wedgeData =
    activeScenario && activeScenario.interventions.length > 0
      ? buildWedgeData(
          activeScenario.interventions.map((si) => ({
            interventionId: si.interventionId,
            name: si.intervention.name,
            startYear: si.startYear,
            endYear: si.endYear,
            executionPct: si.executionPct,
            implementationPacePctPerYear: si.implementationPacePctPerYear,
            intervention: {
              totalReductionTco2e: si.intervention.totalReductionTco2e,
              implementationStartYear: si.intervention.implementationStartYear,
              fullBenefitYear: si.intervention.fullBenefitYear,
              annualReductions: si.intervention.annualReductions,
            },
          })),
          yearRange
        )
      : [];

  const interventionNames = Object.fromEntries(
    (activeScenario?.interventions ?? []).map((si) => [si.interventionId, si.intervention.name])
  );

  const maccData = activeScenario
    ? buildMACCData(
        activeScenario.interventions.map((si) => ({
          interventionId: si.interventionId,
          name: si.intervention.name,
          category: si.intervention.category,
          totalReductionTco2e: si.intervention.totalReductionTco2e,
          implementationStartYear: si.intervention.implementationStartYear,
          fullBenefitYear: si.intervention.fullBenefitYear,
          capex: si.capex,
          opex: si.opex,
          financialLifetime: si.financialLifetime,
          externalFunding: si.externalFunding,
        }))
      )
    : [];

  async function createScenario() {
    if (!newName.trim()) { toast.error("Scenario name is required"); return; }
    setSaving(true);
    const res = await fetch("/api/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc || undefined }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Failed to create scenario"); return; }
    const { data } = await res.json();
    const newScenario: ScenarioWithInterventions = { ...data, interventions: [] };
    setScenarios((prev) => [...prev, newScenario]);
    setActiveId(newScenario.id);
    setCreateOpen(false);
    setNewName("");
    setNewDesc("");
    toast.success("Scenario created");
  }

  async function toggleIntervention(intervention: InterventionWithReductions) {
    if (!activeScenario) return;
    const isSelected = selectedInterventionIds.has(intervention.id);

    if (isSelected) {
      const res = await fetch(
        `/api/scenarios/${activeScenario.id}/interventions?interventionId=${intervention.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) { toast.error("Failed to remove intervention"); return; }
      setScenarios((prev) =>
        prev.map((s) =>
          s.id === activeScenario.id
            ? { ...s, interventions: s.interventions.filter((si) => si.interventionId !== intervention.id) }
            : s
        )
      );
    } else {
      const res = await fetch(`/api/scenarios/${activeScenario.id}/interventions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interventionId: intervention.id,
          startYear: intervention.implementationStartYear,
          endYear: intervention.fullBenefitYear,
          executionPct: 100,
        }),
      });
      if (!res.ok) { toast.error("Failed to add intervention"); return; }
      const { data } = await res.json();
      setScenarios((prev) =>
        prev.map((s) =>
          s.id === activeScenario.id
            ? {
                ...s,
                interventions: [
                  ...s.interventions,
                  { ...data, intervention: { ...intervention, annualReductions: intervention.annualReductions } },
                ],
              }
            : s
        )
      );
    }
  }

  function handleFinancialSaved(
    interventionId: string,
    updated: {
      startYear: number; endYear: number | null; executionPct: number;
      implementationPacePctPerYear: number | null; capex: number | null; opex: number | null;
      financialLifetime: number | null; externalFunding: number | null;
      personnelTimeDays: number | null; personnelRatePerDay: number | null; notes: string | null;
    }
  ) {
    if (!activeScenario) return;
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === activeScenario.id
          ? {
              ...s,
              interventions: s.interventions.map((si) =>
                si.interventionId === interventionId ? { ...si, ...updated } : si
              ),
            }
          : s
      )
    );
  }

  async function deleteScenario(s: ScenarioWithInterventions) {
    if (!confirm(`Delete scenario "${s.name}"?`)) return;
    const res = await fetch(`/api/scenarios/${s.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    const remaining = scenarios.filter((x) => x.id !== s.id);
    setScenarios(remaining);
    setActiveId(remaining[0]?.id ?? null);
    toast.success("Scenario deleted");
  }

  async function exportCSV() {
    if (!activeScenario) return;
    const res = await fetch(`/api/export?scenarioId=${activeScenario.id}`);
    if (!res.ok) { toast.error("Export failed"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeScenario.name.replace(/\s+/g, "_")}_export.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPNG() {
    const { default: html2canvas } = await import("html2canvas");
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: "#ffffff", scale: 2 });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${activeScenario?.name ?? "chart"}.png`;
    a.click();
  }

  if (!baseline) {
    return (
      <Card className="border-gray-200 shadow-none">
        <CardContent className="py-10 text-center">
          <p className="text-sm text-gray-500">
            Please enter your{" "}
            <a href="/baseline" className="underline text-gray-900">baseline emissions</a>{" "}
            before building scenarios.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Scenario selector */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-xs">
          <Select value={activeId ?? ""} onValueChange={setActiveId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a scenario" />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New scenario
        </Button>
        {activeScenario && (
          <>
            <Button size="sm" variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-400 hover:text-red-500"
              onClick={() => deleteScenario(activeScenario)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {scenarios.length === 0 ? (
        <Card className="border-gray-200 shadow-none">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-gray-500">No scenarios yet.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
              Create your first scenario
            </Button>
          </CardContent>
        </Card>
      ) : activeScenario ? (
        <div className="grid grid-cols-[240px_1fr] gap-6">
          {/* Left: Intervention picker */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Interventions</p>
            {interventions.length === 0 ? (
              <p className="text-xs text-gray-400">
                Add interventions in the{" "}
                <a href="/interventions" className="underline">library</a>{" "}
                first.
              </p>
            ) : (
              <div className="space-y-1">
                {interventions.map((iv) => {
                  const selected = selectedInterventionIds.has(iv.id);
                  const si = activeScenario.interventions.find((x) => x.interventionId === iv.id);
                  return (
                    <div key={iv.id} className="flex items-stretch gap-1">
                      <button
                        onClick={() => toggleIntervention(iv)}
                        className={`flex-1 text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                          selected
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        <div className="font-medium truncate">{iv.name}</div>
                        <div className={`text-xs mt-0.5 ${selected ? "text-gray-300" : "text-gray-400"}`}>
                          {iv.totalReductionTco2e.toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO₂e · {iv.category}
                        </div>
                      </button>
                      {selected && si && (
                        <button
                          onClick={() => { setEditingIv(si); setEditorOpen(true); }}
                          className="px-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                          title="Edit scenario parameters"
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Charts */}
          <div className="space-y-4" ref={chartRef}>
            <Tabs defaultValue="glidepath">
              <div className="flex items-center justify-between mb-2">
                <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 h-auto">
                  {["glidepath", "wedge", "macc"].map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:text-gray-900 rounded-none pb-2 text-sm"
                    >
                      {tab === "glidepath" ? "Glide path" : tab === "wedge" ? "Wedge" : "MACC"}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <button
                  onClick={exportPNG}
                  className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 shrink-0 ml-2 pb-2"
                >
                  <Download className="h-3.5 w-3.5" /> PNG
                </button>
              </div>

              <TabsContent value="glidepath" className="pt-2">
                <Card className="border-gray-200 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700">
                      Emissions trajectory — {activeScenario.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {glidepathData.length > 0 ? (
                      <GlidepathChart
                        data={glidepathData}
                        baselineYear={baselineYear}
                        targets={targets.map((t) => ({
                          label: t.label,
                          isSbtiAligned: t.isSbtiAligned,
                          targetYear: t.targetYear,
                          reductionPct: t.reductionPct,
                        }))}
                      />
                    ) : (
                      <div className="h-[340px] flex items-center justify-center">
                        <p className="text-sm text-gray-400">Select interventions to see the glide path</p>
                      </div>
                    )}
                    {targets.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                        {targets.map((t) => {
                          const targetLevel = baselineTotal * (1 - t.reductionPct / 100);
                          const scenarioAtTarget = glidepathData.find((d) => d.year === t.targetYear);
                          const gap = scenarioAtTarget ? scenarioAtTarget.residual - targetLevel : null;
                          return (
                            <div key={t.id} className="text-center">
                              <p className="text-xs text-gray-400">{t.label}</p>
                              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                {gap !== null
                                  ? gap > 0
                                    ? `${gap.toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO₂e gap`
                                    : "On track"
                                  : "—"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="wedge" className="pt-2">
                <Card className="border-gray-200 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700">
                      Abatement wedge — {activeScenario.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <WedgeChart
                      data={wedgeData}
                      interventionNames={interventionNames}
                      baselineTotal={baselineTotal}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="macc" className="pt-2">
                <Card className="border-gray-200 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700">
                      Marginal abatement cost curve — {activeScenario.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MACCChart data={maccData} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : null}

      {/* Create scenario dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New scenario</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input
                placeholder="e.g. Ambitious, Base Case"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createScenario(); }}
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                placeholder="Optional"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createScenario} disabled={saving}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingIv && activeScenario && (
        <ScenarioInterventionEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          scenarioId={activeScenario.id}
          interventionId={editingIv.interventionId}
          interventionName={editingIv.intervention.name}
          current={{
            startYear: editingIv.startYear,
            endYear: editingIv.endYear,
            executionPct: editingIv.executionPct,
            implementationPacePctPerYear: editingIv.implementationPacePctPerYear,
            capex: editingIv.capex,
            opex: editingIv.opex,
            financialLifetime: editingIv.financialLifetime,
            externalFunding: editingIv.externalFunding,
            personnelTimeDays: editingIv.personnelTimeDays,
            personnelRatePerDay: editingIv.personnelRatePerDay,
            notes: editingIv.notes,
          }}
          onSaved={(updated) => handleFinancialSaved(editingIv.interventionId, updated)}
        />
      )}
    </div>
  );
}
