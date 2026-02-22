import type { GlidepathDataPoint, GlidepathMeta, YearRange } from "@/lib/types";

// Colour palette for stacked bars (10 emerald→teal→slate shades)
const COLOURS = [
  "#059669", "#10b981", "#34d399", "#6ee7b7",
  "#0d9488", "#14b8a6", "#2dd4bf",
  "#0284c7", "#38bdf8", "#7dd3fc",
];

type BaselineInput = {
  year: number;
  growthRatePct: number;
  entries: { scope: number; emissionsTco2e: number }[];
  growthRates?: { fromYear: number; toYear: number; ratePct: number }[];
};

type ScenarioInterventionInput = {
  interventionId: string;
  startYear: number;
  endYear: number | null;
  executionPct: number;
  implementationPacePctPerYear: number | null;
  intervention: {
    totalReductionTco2e: number;
    implementationStartYear: number;
    fullBenefitYear: number;
    annualReductions?: { year: number; tco2eReduction: number }[];
  };
};

type TargetInput = {
  targetYear: number;
  reductionPct: number;
  isInterim: boolean;
  scopeCombination: string;
};

function getAnnualAbatement(si: ScenarioInterventionInput, year: number): number {
  const iv = si.intervention;
  const startYear = si.startYear;
  const endYear = si.endYear ?? iv.fullBenefitYear;
  const executionFraction = (si.executionPct ?? 100) / 100;

  if (year < startYear || year > endYear) return 0;

  if (iv.annualReductions && iv.annualReductions.length > 0) {
    const entry = iv.annualReductions.find((r) => r.year === year);
    return (entry?.tco2eReduction ?? 0) * executionFraction;
  }

  const totalReduction = iv.totalReductionTco2e * executionFraction;
  const rampDuration = iv.fullBenefitYear - iv.implementationStartYear;
  if (rampDuration <= 0) return totalReduction;

  const annualAtFullRamp = totalReduction / rampDuration;
  return annualAtFullRamp;
}

function getBauForYear(baselineTotal: number, baseline: BaselineInput, year: number): number {
  const yearsFromBase = year - baseline.year;
  if (yearsFromBase <= 0) return baselineTotal;

  const periods = baseline.growthRates ?? [];
  if (periods.length === 0) {
    const growthRate = (baseline.growthRatePct ?? 0) / 100;
    return baselineTotal * Math.pow(1 + growthRate, yearsFromBase);
  }

  // Walk through periods year by year
  let value = baselineTotal;
  for (let y = baseline.year + 1; y <= year; y++) {
    const period = periods.find((p) => y >= p.fromYear && y <= p.toYear);
    const rate = period ? period.ratePct / 100 : (baseline.growthRatePct ?? 0) / 100;
    value = value * (1 + rate);
  }
  return value;
}

export function buildGlidepathMeta(
  scenarioInterventions: ScenarioInterventionInput[],
  interventionNames: { id: string; name: string }[]
): GlidepathMeta {
  return {
    interventions: scenarioInterventions.map((si, idx) => ({
      id: si.interventionId,
      name: interventionNames.find((n) => n.id === si.interventionId)?.name ?? si.interventionId,
      color: COLOURS[idx % COLOURS.length],
    })),
  };
}

export function buildGlidepathData({
  baseline,
  scenarioInterventions,
  targets,
  yearRange,
  actualEmissions,
}: {
  baseline: BaselineInput;
  scenarioInterventions: ScenarioInterventionInput[];
  targets: TargetInput[];
  yearRange: YearRange;
  actualEmissions?: { year: number; scope1: number; scope2: number; scope3: number }[];
}): GlidepathDataPoint[] {
  const baselineTotal = baseline.entries.reduce((s, e) => s + e.emissionsTco2e, 0);

  const primaryTarget =
    targets.find((t) => !t.isInterim && t.scopeCombination === "1+2+3") ??
    targets.find((t) => !t.isInterim) ??
    targets[0];

  const data: GlidepathDataPoint[] = [];

  for (let year = yearRange.start; year <= yearRange.end; year++) {
    const bau = getBauForYear(baselineTotal, baseline, year);

    // Per-intervention abatement this year
    const perIntervention: Record<string, number> = {};
    let totalAbatement = 0;
    for (const si of scenarioInterventions) {
      const abatement = getAnnualAbatement(si, year);
      perIntervention[`i_${si.interventionId}`] = abatement;
      totalAbatement += abatement;
    }

    const residual = Math.max(0, bau - totalAbatement);

    let target: number | null = null;
    if (primaryTarget) {
      if (year <= baseline.year) {
        target = baselineTotal;
      } else if (year >= primaryTarget.targetYear) {
        target = baselineTotal * (1 - primaryTarget.reductionPct / 100);
      } else {
        const progress = (year - baseline.year) / (primaryTarget.targetYear - baseline.year);
        const targetLevel = baselineTotal * (1 - primaryTarget.reductionPct / 100);
        target = baselineTotal + (targetLevel - baselineTotal) * progress;
      }
    }

    const actualPoint = actualEmissions?.find((a) => a.year === year);
    const actual = actualPoint ? actualPoint.scope1 + actualPoint.scope2 + actualPoint.scope3 : null;

    data.push({ year, residual, bau, target, actual, ...perIntervention });
  }

  return data;
}
