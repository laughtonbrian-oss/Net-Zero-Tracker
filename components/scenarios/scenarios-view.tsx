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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Download, X, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { GlidepathChart } from "@/components/charts/glidepath-chart";
import { WedgeChart } from "@/components/charts/wedge-chart";
import { MACCChart } from "@/components/charts/macc-chart";
import {
  ScenarioInterventionEditor,
  type FinancialFields,
} from "./scenario-intervention-editor";
import { buildGlidepathData } from "@/lib/calculations/emissions";
import { buildWedgeData } from "@/lib/calculations/wedge";
import { buildMACCData } from "@/lib/calculations/macc";
import type { Scenario, Intervention, Baseline, Target, BaselineEntry } from "@prisma/client";

type AnnualReduction = { year: number; tco2eReduction: number };
type SiteSnippet = { id: string; name: string; country: string | null } | null;
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
  intervention: Intervention & { annualReductions: AnnualReduction[]; site: SiteSnippet };
};
type ScenarioWithInterventions = Scenario & { interventions: ScenarioIntervention[] };
type InterventionWithReductions = Intervention & { annualReductions: AnnualReduction[]; site: SiteSnippet };
type BaselineWithEntries = Baseline & { entries: BaselineEntry[] };

type Props = {
  initialScenarios: ScenarioWithInterventions[];
  interventions: InterventionWithReductions[];
  baseline: BaselineWithEntries | null;
  targets: Target[];
};

function fmtCurrency(n: number | null | undefined) {
  if (n == null) return "—";
  return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/** Strip @supports rules that reference lab/oklch/oklab from cloned stylesheets */
function stripLabRules(rules: CSSRuleList) {
  for (let i = rules.length - 1; i >= 0; i--) {
    const rule = rules[i];
    if (rule instanceof CSSSupportsRule && /lab|oklch|oklab/.test(rule.conditionText)) {
      rule.parentStyleSheet?.deleteRule(i);
      continue;
    }
    if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules?.length) {
      stripLabRules((rule as CSSGroupingRule).cssRules);
    }
  }
}

export function ScenariosView({ initialScenarios, interventions, baseline, targets }: Props) {
  const [scenarios, setScenarios] = useState<ScenarioWithInterventions[]>(initialScenarios);
  const [activeId, setActiveId] = useState<string | null>(initialScenarios[0]?.id ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingIv, setEditingIv] = useState<ScenarioIntervention | null>(null);
  const [activeChartTab, setActiveChartTab] = useState("glidepath");
  const chartRef = useRef<HTMLDivElement>(null);

  // Filters
  const [filterScopes, setFilterScopes] = useState<number[]>([]);
  const [filterFromYear, setFilterFromYear] = useState<string>("");
  const [filterToYear, setFilterToYear] = useState<string>("");
  const [filterCountry, setFilterCountry] = useState<string>("");
  const [filterSite, setFilterSite] = useState<string>("");
  const hasFilters = filterScopes.length > 0 || filterFromYear || filterToYear || filterCountry || filterSite;

  const activeScenario = scenarios.find((s) => s.id === activeId) ?? null;
  const selectedInterventionIds = new Set(
    activeScenario?.interventions.map((si) => si.interventionId) ?? []
  );

  // Derived filter options from the active scenario's interventions
  const availableCountries = [
    ...new Set(
      (activeScenario?.interventions ?? [])
        .map((si) => si.intervention.site?.country)
        .filter((c): c is string => !!c)
    ),
  ].sort();
  const availableSites = (activeScenario?.interventions ?? [])
    .filter((si) => si.intervention.site && (!filterCountry || si.intervention.site.country === filterCountry))
    .map((si) => si.intervention.site!)
    .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i)
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredSIs = (activeScenario?.interventions ?? []).filter((si) => {
    if (filterScopes.length > 0) {
      let scopes: number[] = [];
      try {
        const parsed = JSON.parse(si.intervention.scopesAffected);
        if (Array.isArray(parsed)) scopes = parsed;
      } catch {
        return false;
      }
      if (!filterScopes.some((s) => scopes.includes(s))) return false;
    }
    const from = filterFromYear ? parseInt(filterFromYear) : null;
    const to = filterToYear ? parseInt(filterToYear) : null;
    if (from && si.endYear && si.endYear < from) return false;
    if (to && si.startYear > to) return false;
    if (filterCountry && si.intervention.site?.country !== filterCountry) return false;
    if (filterSite && si.intervention.site?.id !== filterSite) return false;
    return true;
  });

  const baselineYear = baseline?.year ?? new Date().getFullYear() - 1;
  const latestTargetYear = targets.reduce(
    (max, t) => Math.max(max, t.targetYear),
    new Date().getFullYear() + 25
  );
  const yearRange = {
    start: baselineYear,
    end: Math.max(latestTargetYear, new Date().getFullYear() + 30),
  };

  const baselineTotal = baseline
    ? baseline.entries.reduce((s, e) => s + e.emissionsTco2e, 0)
    : 0;

  const glidepathData =
    baseline && activeScenario
      ? buildGlidepathData({
          baseline: {
            ...baseline,
            entries: baseline.entries as { scope: number; emissionsTco2e: number }[],
          },
          scenarioInterventions: filteredSIs.map((si) => ({
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
    activeScenario && filteredSIs.length > 0
      ? buildWedgeData(
          filteredSIs.map((si) => ({
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
    filteredSIs.map((si) => [si.interventionId, si.intervention.name])
  );

  const maccData = activeScenario
    ? buildMACCData(
        filteredSIs.map((si) => ({
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

  function computeMac(si: ScenarioIntervention): number | null {
    if (si.capex === null && si.opex === null) return null;
    const iv = si.intervention;
    const lifetime =
      si.financialLifetime ?? Math.max(1, iv.fullBenefitYear - iv.implementationStartYear + 1);
    const totalCost =
      (si.capex ?? 0) + (si.opex ?? 0) * lifetime - (si.externalFunding ?? 0);
    return iv.totalReductionTco2e > 0 ? totalCost / iv.totalReductionTco2e : null;
  }

  function openEditor(si: ScenarioIntervention) {
    setEditingIv(si);
    setEditorOpen(true);
  }

  async function createScenario() {
    if (!newName.trim()) {
      toast.error("Scenario name is required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Failed to create scenario");
      return;
    }
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
      if (!res.ok) {
        toast.error("Failed to remove intervention");
        return;
      }
      setScenarios((prev) =>
        prev.map((s) =>
          s.id === activeScenario.id
            ? {
                ...s,
                interventions: s.interventions.filter(
                  (si) => si.interventionId !== intervention.id
                ),
              }
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
      if (!res.ok) {
        toast.error("Failed to add intervention");
        return;
      }
      const { data } = await res.json();
      setScenarios((prev) =>
        prev.map((s) =>
          s.id === activeScenario.id
            ? {
                ...s,
                interventions: [
                  ...s.interventions,
                  {
                    ...data,
                    intervention: {
                      ...intervention,
                      annualReductions: intervention.annualReductions,
                    },
                  },
                ],
              }
            : s
        )
      );
    }
  }

  function handleFinancialSaved(interventionId: string, updated: FinancialFields) {
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
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    const remaining = scenarios.filter((x) => x.id !== s.id);
    setScenarios(remaining);
    setActiveId(remaining[0]?.id ?? null);
    toast.success("Scenario deleted");
  }

  async function exportCSV() {
    if (!activeScenario) return;
    const res = await fetch(`/api/export?scenarioId=${activeScenario.id}`);
    if (!res.ok) {
      toast.error("Export failed");
      return;
    }
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
    const canvas = await html2canvas(chartRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
      onclone: (doc) => {
        // Strip @supports rules with lab/oklch/oklab that html2canvas can't parse
        for (const sheet of Array.from(doc.styleSheets)) {
          try {
            stripLabRules(sheet.cssRules);
          } catch { /* cross-origin sheets throw SecurityError */ }
        }
        const style = doc.createElement("style");
        style.textContent = `
          :root {
            --background: #ffffff !important;
            --foreground: #18181b !important;
            --card: #ffffff !important;
            --card-foreground: #18181b !important;
            --popover: #ffffff !important;
            --popover-foreground: #18181b !important;
            --primary: #10b981 !important;
            --primary-foreground: #fafafa !important;
            --secondary: #f4f4f5 !important;
            --secondary-foreground: #27272a !important;
            --muted: #f4f4f5 !important;
            --muted-foreground: #71717a !important;
            --accent: #ecfdf5 !important;
            --accent-foreground: #065f46 !important;
            --destructive: #dc2626 !important;
            --border: #e4e4e7 !important;
            --input: #e4e4e7 !important;
            --ring: #10b981 !important;
            --chart-1: #10b981 !important;
            --chart-2: #34d399 !important;
            --chart-3: #059669 !important;
            --chart-4: #fbbf24 !important;
            --chart-5: #71717a !important;
          }
        `;
        doc.head.appendChild(style);
      },
    });
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
            <a href="/baseline" className="underline text-gray-900">
              baseline emissions
            </a>{" "}
            before building scenarios.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totals = activeScenario?.interventions.reduce(
    (acc, si) => ({
      capex: acc.capex + (si.capex ?? 0),
      opex: acc.opex + (si.opex ?? 0),
      externalFunding: acc.externalFunding + (si.externalFunding ?? 0),
    }),
    { capex: 0, opex: 0, externalFunding: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Scenario selector */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-xs">
          <Select value={activeId ?? ""} onValueChange={(v) => { setActiveId(v); setFilterCountry(""); setFilterSite(""); setFilterScopes([]); setFilterFromYear(""); setFilterToYear(""); }}>
            <SelectTrigger>
              <SelectValue placeholder="Select a scenario" />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
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

      {/* Filter bar */}
      {activeScenario && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
          <SlidersHorizontal className="h-3.5 w-3.5 text-gray-400 shrink-0" />

          {/* Scope filter */}
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => setFilterScopes((prev) =>
                  prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                )}
                className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                  filterScopes.includes(s)
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-emerald-400"
                }`}
              >
                S{s}
              </button>
            ))}
          </div>

          {/* Time slice */}
          <div className="flex items-center gap-1">
            <Input
              type="number" placeholder="From yr" min={2020} max={2060}
              value={filterFromYear}
              onChange={(e) => setFilterFromYear(e.target.value)}
              className="h-7 w-20 text-xs"
            />
            <span className="text-xs text-gray-400">–</span>
            <Input
              type="number" placeholder="To yr" min={2020} max={2060}
              value={filterToYear}
              onChange={(e) => setFilterToYear(e.target.value)}
              className="h-7 w-20 text-xs"
            />
          </div>

          {/* Country filter */}
          {availableCountries.length > 0 && (
            <Select value={filterCountry} onValueChange={(v) => { setFilterCountry(v === "_all" ? "" : v); setFilterSite(""); }}>
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue placeholder="All countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All countries</SelectItem>
                {availableCountries.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Site filter */}
          {availableSites.length > 0 && (
            <Select value={filterSite} onValueChange={(v) => setFilterSite(v === "_all" ? "" : v)}>
              <SelectTrigger className="h-7 w-40 text-xs">
                <SelectValue placeholder="All sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All sites</SelectItem>
                {availableSites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasFilters && (
            <button
              onClick={() => { setFilterScopes([]); setFilterFromYear(""); setFilterToYear(""); setFilterCountry(""); setFilterSite(""); }}
              className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}

          {hasFilters && (
            <span className="ml-auto text-xs text-gray-400">
              {filteredSIs.length} / {activeScenario.interventions.length} interventions shown
            </span>
          )}
        </div>
      )}

      {scenarios.length === 0 ? (
        <Card className="border-gray-200 shadow-none">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-gray-500">No scenarios yet.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setCreateOpen(true)}
            >
              Create your first scenario
            </Button>
          </CardContent>
        </Card>
      ) : activeScenario ? (
        <Tabs defaultValue="overview">
          <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 h-auto mb-1">
            {(["overview", "financials"] as const).map((t) => (
              <TabsTrigger
                key={t}
                value={t}
                className="border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:text-gray-900 rounded-none pb-2 text-sm capitalize"
              >
                {t === "overview" ? "Overview" : "Financials"}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── OVERVIEW TAB ── */}
          <TabsContent value="overview" className="space-y-6 pt-4">
            {/* Charts */}
            <div>
              <Tabs value={activeChartTab} onValueChange={setActiveChartTab}>
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
                  <div ref={activeChartTab === "glidepath" ? chartRef : undefined}>
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
                          <p className="text-sm text-gray-400">
                            Add interventions to see the glide path
                          </p>
                        </div>
                      )}
                      {targets.length > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                          {targets.map((t) => {
                            const targetLevel = baselineTotal * (1 - t.reductionPct / 100);
                            const scenarioAtTarget = glidepathData.find(
                              (d) => d.year === t.targetYear
                            );
                            const gap = scenarioAtTarget
                              ? scenarioAtTarget.residual - targetLevel
                              : null;
                            return (
                              <div key={t.id} className="text-center">
                                <p className="text-xs text-gray-400">{t.label}</p>
                                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                  {gap !== null
                                    ? gap > 0
                                      ? `${gap.toLocaleString(undefined, {
                                          maximumFractionDigits: 0,
                                        })} tCO₂e gap`
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
                  </div>
                </TabsContent>

                <TabsContent value="wedge" className="pt-2">
                  <div ref={activeChartTab === "wedge" ? chartRef : undefined}>
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
                  </div>
                </TabsContent>

                <TabsContent value="macc" className="pt-2">
                  <div ref={activeChartTab === "macc" ? chartRef : undefined}>
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
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Interventions list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">
                  Interventions in this scenario
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    ({hasFilters ? `${filteredSIs.length} of ${activeScenario.interventions.length}` : activeScenario.interventions.length})
                  </span>
                </p>
                <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add intervention
                </Button>
              </div>

              {activeScenario.interventions.length === 0 ? (
                <Card className="border-gray-200 shadow-none">
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-gray-400">No interventions in this scenario yet.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setAddOpen(true)}
                    >
                      Add intervention
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-gray-50">
                        <TableHead className="text-xs">Intervention</TableHead>
                        <TableHead className="text-xs">Start yr</TableHead>
                        <TableHead className="text-xs">End yr</TableHead>
                        <TableHead className="text-xs">Exec %</TableHead>
                        <TableHead className="text-xs text-right">tCO₂e</TableHead>
                        <TableHead className="w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSIs.map((si) => (
                        <TableRow
                          key={si.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => openEditor(si)}
                        >
                          <TableCell className="text-sm font-medium max-w-[200px]">
                            <span className="truncate block">{si.intervention.name}</span>
                            <span className="text-xs text-gray-400">
                              {si.intervention.category}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{si.startYear}</TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {si.endYear ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm">{si.executionPct}%</TableCell>
                          <TableCell className="text-sm text-right">
                            {si.intervention.totalReductionTco2e.toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const iv = interventions.find(
                                  (iv) => iv.id === si.interventionId
                                );
                                if (iv) toggleIntervention(iv);
                              }}
                              className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                              title="Remove from scenario"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── FINANCIALS TAB ── */}
          <TabsContent value="financials" className="pt-4">
            {activeScenario.interventions.length === 0 ? (
              <Card className="border-gray-200 shadow-none">
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-gray-400">No interventions in this scenario yet.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setAddOpen(true)}
                  >
                    Add intervention
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-gray-50">
                      <TableHead className="text-xs">Intervention</TableHead>
                      <TableHead className="text-xs text-right">CAPEX</TableHead>
                      <TableHead className="text-xs text-right">OPEX/yr</TableHead>
                      <TableHead className="text-xs text-right">Ext. funding</TableHead>
                      <TableHead className="text-xs text-right">MAC ($/tCO₂e)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeScenario.interventions.map((si) => {
                      const mac = computeMac(si);
                      return (
                        <TableRow
                          key={si.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => openEditor(si)}
                        >
                          <TableCell className="text-sm font-medium max-w-[220px]">
                            <span className="truncate block">{si.intervention.name}</span>
                            <span className="text-xs text-gray-400">
                              {si.intervention.category}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            {fmtCurrency(si.capex)}
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            {fmtCurrency(si.opex)}
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            {fmtCurrency(si.externalFunding)}
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            {mac != null ? (
                              <span
                                className={
                                  mac < 0 ? "text-green-600 font-medium" : "text-gray-700"
                                }
                              >
                                {mac < 0 ? "" : "+"}
                                {mac.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {totals && (
                      <TableRow className="bg-gray-50 font-medium hover:bg-gray-50">
                        <TableCell className="text-xs text-gray-500">Total</TableCell>
                        <TableCell className="text-sm text-right">
                          {fmtCurrency(totals.capex)}
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          {fmtCurrency(totals.opex)}
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          {fmtCurrency(totals.externalFunding)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") createScenario();
                }}
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
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createScenario} disabled={saving}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add intervention dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add intervention to scenario</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 max-h-[480px] overflow-y-auto py-1">
            {interventions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                No interventions in library.{" "}
                <a href="/interventions" className="underline">
                  Add some first.
                </a>
              </p>
            ) : (
              interventions.map((iv) => {
                const isAdded = selectedInterventionIds.has(iv.id);
                return (
                  <div
                    key={iv.id}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
                      isAdded
                        ? "bg-gray-900 border-gray-900 text-white"
                        : "bg-white border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <p
                        className={`text-sm font-medium truncate ${
                          isAdded ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {iv.name}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${
                          isAdded ? "text-gray-300" : "text-gray-400"
                        }`}
                      >
                        {iv.totalReductionTco2e.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}{" "}
                        tCO₂e · {iv.category}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isAdded ? "ghost" : "outline"}
                      className={
                        isAdded
                          ? "text-gray-300 hover:text-red-400 hover:bg-transparent shrink-0"
                          : "shrink-0"
                      }
                      onClick={() => toggleIntervention(iv)}
                    >
                      {isAdded ? (
                        <>
                          <X className="h-3.5 w-3.5 mr-1" /> Remove
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add
                        </>
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Side panel editor */}
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
            startQuarter: editingIv.startQuarter,
            endQuarter: editingIv.endQuarter,
            executionPct: editingIv.executionPct,
            implementationPacePctPerYear: editingIv.implementationPacePctPerYear,
            technicalAssetLife: editingIv.technicalAssetLife,
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
