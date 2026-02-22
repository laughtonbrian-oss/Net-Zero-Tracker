"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, Download } from "lucide-react";
import { GlidepathChart } from "@/components/charts/glidepath-chart";
import { BaselineBreakdownChart } from "@/components/charts/baseline-breakdown-chart";
import { MACCChart } from "@/components/charts/macc-chart";
import { buildGlidepathData } from "@/lib/calculations/emissions";
import { buildMACCData } from "@/lib/calculations/macc";
import type { Target, Baseline, BaselineEntry, Scenario, ScenarioIntervention, Intervention, InterventionAnnualReduction } from "@prisma/client";

type GrowthRate = { fromYear: number; toYear: number; ratePct: number };
type BaselineWithEntries = Baseline & {
  entries: BaselineEntry[];
  growthRates: GrowthRate[];
};
type ScenarioInterventionFull = ScenarioIntervention & {
  intervention: Intervention & { annualReductions: InterventionAnnualReduction[] };
};
type ScenarioWithInterventions = Scenario & { interventions: ScenarioInterventionFull[] };
type Company = { id: string; name: string; logo: string | null; plan: string } | null;

type Props = {
  company: Company;
  baseline: BaselineWithEntries | null;
  targets: Target[];
  scenarios: ScenarioWithInterventions[];
  interventions: { id: string; name: string }[];
};

export function ReportView({ company, baseline, targets, scenarios, interventions }: Props) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(scenarios[0]?.id ?? "");
  const reportRef = useRef<HTMLDivElement>(null);

  const activeScenario = scenarios.find((s) => s.id === selectedScenarioId) ?? scenarios[0] ?? null;

  const currentYear = new Date().getFullYear();
  const baselineYear = baseline?.year ?? currentYear - 3;
  const latestTargetYear = targets.reduce((max, t) => Math.max(max, t.targetYear), currentYear + 25);
  const yearRange = { start: baselineYear, end: Math.max(latestTargetYear, currentYear + 30) };

  const baselineTotal = baseline?.entries.reduce((s, e) => s + e.emissionsTco2e, 0) ?? 0;

  const glidepathData =
    baseline && activeScenario
      ? buildGlidepathData({
          baseline: {
            ...baseline,
            entries: baseline.entries as { scope: number; emissionsTco2e: number }[],
            growthRates: baseline.growthRates,
          },
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

  const primaryTarget =
    targets.find((t) => !t.isInterim && t.scopeCombination === "1+2+3") ??
    targets.find((t) => !t.isInterim) ??
    targets[0];

  const targetLevel = primaryTarget
    ? baselineTotal * (1 - primaryTarget.reductionPct / 100)
    : null;

  const scenarioAtTarget = primaryTarget
    ? glidepathData.find((d) => d.year === primaryTarget.targetYear)
    : null;
  const totalAbatement = scenarioAtTarget
    ? baselineTotal - scenarioAtTarget.residual
    : null;

  function handlePrint() {
    window.print();
  }

  async function handleExportPdf() {
    if (!reportRef.current) return;
    const { default: html2canvas } = await import("html2canvas");
    const { default: jsPDF } = await import("jspdf");
    const canvas = await html2canvas(reportRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
      onclone: (doc) => {
        // Tailwind v4 injects @supports (color: lab()) blocks that override
        // CSS variables with lab() values — html2canvas can't parse them.
        // Appending this <style> after existing sheets wins by cascade order.
        const style = doc.createElement("style");
        style.textContent = `
          :root {
            --background: #ffffff; --foreground: #18181b;
            --card: #ffffff; --card-foreground: #18181b;
            --popover: #ffffff; --popover-foreground: #18181b;
            --primary: #10b981; --primary-foreground: #fafafa;
            --secondary: #f4f4f5; --secondary-foreground: #27272a;
            --muted: #f4f4f5; --muted-foreground: #71717a;
            --accent: #ecfdf5; --accent-foreground: #065f46;
            --destructive: #dc2626;
            --border: #e4e4e7; --input: #e4e4e7; --ring: #10b981;
            --chart-1: #10b981; --chart-2: #34d399; --chart-3: #059669;
            --chart-4: #fbbf24; --chart-5: #71717a;
          }
        `;
        doc.head.appendChild(style);
      },
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height * pageW) / canvas.width;
    let yOffset = 0;
    while (yOffset < imgH) {
      pdf.addImage(imgData, "PNG", 0, -yOffset, pageW, imgH);
      yOffset += pageH;
      if (yOffset < imgH) pdf.addPage();
    }
    pdf.save(`${company?.name ?? "report"}_net_zero_report.pdf`);
  }

  const financialTotals = activeScenario?.interventions.reduce(
    (acc, si) => ({
      capex: acc.capex + (si.capex ?? 0),
      opex: acc.opex + (si.opex ?? 0),
      externalFunding: acc.externalFunding + (si.externalFunding ?? 0),
    }),
    { capex: 0, opex: 0, externalFunding: 0 }
  ) ?? null;

  return (
    <div>
      {/* Controls (no-print) */}
      <div className="flex items-center gap-3 mb-6 no-print">
        <h1 className="text-xl font-semibold text-gray-900 flex-1">Reports</h1>
        {scenarios.length > 1 && (
          <div className="max-w-xs">
            <Select value={selectedScenarioId} onValueChange={setSelectedScenarioId}>
              <SelectTrigger>
                <SelectValue placeholder="Select scenario" />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPdf}>
          <Download className="h-4 w-4 mr-1" /> Export PDF
        </Button>
      </div>

      {/* Report content */}
      <div ref={reportRef} className="space-y-6 print-full">
        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
          {company?.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo} alt={company.name} className="h-12 object-contain" />
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{company?.name ?? "Company"}</h2>
            <p className="text-sm text-gray-500">Net Zero Pathfinder — Decarbonisation Report</p>
            <p className="text-xs text-gray-400">Generated {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>

        {/* KPI summary */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-gray-200 shadow-none">
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">Baseline (tCO₂e)</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {baselineTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Year {baselineYear}</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200 shadow-none">
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">Target Level (tCO₂e)</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {targetLevel != null
                  ? targetLevel.toLocaleString(undefined, { maximumFractionDigits: 0 })
                  : "—"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {primaryTarget ? `${primaryTarget.reductionPct}% by ${primaryTarget.targetYear}` : "No target set"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-gray-200 shadow-none">
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">Total Abatement</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">
                {totalAbatement != null
                  ? totalAbatement.toLocaleString(undefined, { maximumFractionDigits: 0 })
                  : "—"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">tCO₂e from interventions</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200 shadow-none">
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">Scenarios</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{scenarios.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">{interventions.length} interventions</p>
            </CardContent>
          </Card>
        </div>

        {/* Financial summary */}
        {financialTotals && (financialTotals.capex > 0 || financialTotals.opex > 0 || financialTotals.externalFunding > 0) && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-gray-200 shadow-none">
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">Total CAPEX</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  ${financialTotals.capex.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Capital expenditure</p>
              </CardContent>
            </Card>
            <Card className="border-gray-200 shadow-none">
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">Total OPEX</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  ${financialTotals.opex.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Annual operating cost</p>
              </CardContent>
            </Card>
            <Card className="border-gray-200 shadow-none">
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">External Funding</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">
                  ${financialTotals.externalFunding.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Grants &amp; subsidies</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Glidepath chart */}
        {glidepathData.length > 0 && (
          <Card className="border-gray-200 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Emissions Trajectory — {activeScenario?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-hidden">
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
              </div>
            </CardContent>
          </Card>
        )}

        {/* Baseline breakdown */}
        {baseline && baseline.entries.length > 0 && (
          <Card className="border-gray-200 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Baseline Emissions by Category ({baselineYear})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-hidden">
                <BaselineBreakdownChart
                  entries={baseline.entries.map((e) => ({
                    scope: e.scope,
                    category: e.category,
                    emissionsTco2e: e.emissionsTco2e,
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* MACC */}
        {maccData.length > 0 && (
          <Card className="border-gray-200 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Marginal Abatement Cost Curve — {activeScenario?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-hidden">
                <MACCChart data={maccData} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Interventions table */}
        {activeScenario && activeScenario.interventions.length > 0 && (
          <Card className="border-gray-200 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Interventions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Name</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-600">Category</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-600">Reduction (tCO₂e)</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600">Start</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeScenario.interventions.map((si) => (
                    <tr key={si.id}>
                      <td className="px-4 py-2 text-gray-700">{si.intervention.name}</td>
                      <td className="px-3 py-2 text-gray-500">{si.intervention.category}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                        {si.intervention.totalReductionTco2e.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-500">{si.startYear}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Targets table */}
        {targets.length > 0 && (
          <Card className="border-gray-200 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Targets</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Label</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-600">Scopes</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-600">Reduction %</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-600">Target Year</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600">SBTi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {targets.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2 text-gray-700">{t.label}</td>
                      <td className="px-3 py-2 text-gray-500">Scope {t.scopeCombination}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{t.reductionPct}%</td>
                      <td className="px-3 py-2 text-right text-gray-700">{t.targetYear}</td>
                      <td className="px-4 py-2 text-right">
                        {t.isSbtiAligned ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">SBTi</span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
