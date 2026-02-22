"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GlidepathChart } from "@/components/charts/glidepath-chart";
import { buildGlidepathData } from "@/lib/calculations/emissions";
import type { Scenario, Intervention, Baseline, Target, BaselineEntry } from "@prisma/client";

type AnnualReduction = { year: number; tco2eReduction: number };
type ScenarioIntervention = {
  interventionId: string;
  startYear: number;
  endYear: number | null;
  executionPct: number;
  implementationPacePctPerYear: number | null;
  capex: number | null;
  opex: number | null;
  financialLifetime: number | null;
  externalFunding: number | null;
  intervention: Intervention & { annualReductions: AnnualReduction[] };
};
type ScenarioWithInterventions = Scenario & { interventions: ScenarioIntervention[] };
type BaselineWithEntries = Baseline & { entries: BaselineEntry[] };

// TODO: gate behind PlanGate feature='scenarioComparison'
type Props = {
  scenarios: ScenarioWithInterventions[];
  baseline: BaselineWithEntries;
  targets: Target[];
};

function scenarioMetrics(
  scenario: ScenarioWithInterventions,
  baseline: BaselineWithEntries,
  targets: Target[],
  yearRange: { start: number; end: number }
) {
  const baseTotal = baseline.entries.reduce((s, e) => s + e.emissionsTco2e, 0);

  const glidepath = buildGlidepathData({
    baseline: { ...baseline, entries: baseline.entries as { scope: number; emissionsTco2e: number }[] },
    scenarioInterventions: scenario.interventions.map((si) => ({
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
  });

  const totalAbatement = scenario.interventions.reduce(
    (s, si) => s + si.intervention.totalReductionTco2e * (si.executionPct / 100),
    0
  );
  const totalCost = scenario.interventions.reduce((s, si) => {
    const life = si.financialLifetime ?? 10;
    return s + (si.capex ?? 0) + (si.opex ?? 0) * life - (si.externalFunding ?? 0);
  }, 0);
  const costPerTonne = totalAbatement > 0 ? totalCost / totalAbatement : null;

  const latestTarget = [...targets].sort((a, b) => b.targetYear - a.targetYear)[0];
  let gap: number | null = null;
  if (latestTarget) {
    const targetLevel = baseTotal * (1 - latestTarget.reductionPct / 100);
    const atTarget = glidepath.find((d) => d.year === latestTarget.targetYear);
    gap = atTarget ? atTarget.residual - targetLevel : null;
  }

  return { glidepath, totalAbatement, totalCost, costPerTonne, gap };
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

export function ScenarioCompareView({ scenarios, baseline, targets }: Props) {
  const [aId, setAId] = useState(scenarios[0]?.id ?? "");
  const [bId, setBId] = useState(scenarios[1]?.id ?? scenarios[0]?.id ?? "");

  const currentYear = new Date().getFullYear();
  const latestTargetYear = targets.reduce((max, t) => Math.max(max, t.targetYear), currentYear + 25);
  const yearRange = { start: baseline.year, end: Math.max(latestTargetYear, currentYear + 30) };

  const scenarioA = scenarios.find((s) => s.id === aId);
  const scenarioB = scenarios.find((s) => s.id === bId);

  if (scenarios.length < 2) {
    return (
      <p className="text-sm text-gray-500">
        Create at least two scenarios to compare them.
      </p>
    );
  }

  const metricsA = scenarioA ? scenarioMetrics(scenarioA, baseline, targets, yearRange) : null;
  const metricsB = scenarioB ? scenarioMetrics(scenarioB, baseline, targets, yearRange) : null;

  function formatGap(gap: number | null) {
    if (gap === null) return "—";
    return gap <= 0
      ? "On track"
      : `${gap.toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO₂e gap`;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <Select value={aId} onValueChange={setAId}>
          <SelectTrigger>
            <SelectValue placeholder="Scenario A" />
          </SelectTrigger>
          <SelectContent>
            {scenarios.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={bId} onValueChange={setBId}>
          <SelectTrigger>
            <SelectValue placeholder="Scenario B" />
          </SelectTrigger>
          <SelectContent>
            {scenarios.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary metrics */}
      {metricsA && metricsB && (
        <div className="grid grid-cols-2 gap-6">
          {[
            { metrics: metricsA, scenario: scenarioA! },
            { metrics: metricsB, scenario: scenarioB! },
          ].map(({ metrics, scenario }) => (
            <Card key={scenario.id} className="border-gray-200 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">{scenario.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <MetricCard
                    label="Total abatement"
                    value={`${metrics.totalAbatement.toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO₂e`}
                  />
                  <MetricCard
                    label="Total cost"
                    value={
                      metrics.totalCost > 0
                        ? `$${metrics.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : "—"
                    }
                  />
                  <MetricCard
                    label="Cost per tCO₂e"
                    value={
                      metrics.costPerTonne !== null
                        ? `$${metrics.costPerTonne.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : "—"
                    }
                  />
                  <MetricCard
                    label="Target gap"
                    value={formatGap(metrics.gap)}
                  />
                </div>
                <GlidepathChart data={metrics.glidepath} baselineYear={baseline.year} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
