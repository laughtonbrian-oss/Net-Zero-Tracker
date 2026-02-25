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

// Pre-index annual reductions by year for O(1) lookups instead of O(n) .find() per year
type AnnualReductionMap = Map<number, number>;

function buildAnnualReductionMap(
  reductions: { year: number; tco2eReduction: number }[] | undefined
): AnnualReductionMap | null {
  if (!reductions || reductions.length === 0) return null;
  return new Map(reductions.map((r) => [r.year, r.tco2eReduction]));
}

function getAnnualAbatement(
  si: ScenarioInterventionInput,
  year: number,
  reductionMap: AnnualReductionMap | null
): number {
  const iv = si.intervention;
  const startYear = si.startYear;
  const endYear = si.endYear ?? iv.fullBenefitYear;
  const executionFraction = (si.executionPct ?? 100) / 100;

  if (year < startYear || year > endYear) return 0;

  if (reductionMap) {
    return (reductionMap.get(year) ?? 0) * executionFraction;
  }

  const totalReduction = iv.totalReductionTco2e * executionFraction;
  const rampDuration = iv.fullBenefitYear - iv.implementationStartYear;
  if (rampDuration <= 0) return totalReduction;

  const annualAtFullRamp = totalReduction / rampDuration;
  return annualAtFullRamp;
}

// Pre-compute BAU values for the entire year range to avoid redundant
// re-walking of growth rate periods (was O(years * periods) per call,
// now O(years * periods) total via a single pass).
function buildBauSeries(
  baselineTotal: number,
  baseline: BaselineInput,
  yearRange: YearRange
): Map<number, number> {
  const bauByYear = new Map<number, number>();
  const periods = baseline.growthRates ?? [];
  const defaultRate = (baseline.growthRatePct ?? 0) / 100;

  if (periods.length === 0) {
    // Simple compound growth — no need to walk year-by-year
    for (let y = yearRange.start; y <= yearRange.end; y++) {
      const yearsFromBase = y - baseline.year;
      bauByYear.set(
        y,
        yearsFromBase <= 0
          ? baselineTotal
          : baselineTotal * Math.pow(1 + defaultRate, yearsFromBase)
      );
    }
    return bauByYear;
  }

  // Sort periods once for binary-search-friendly iteration
  const sortedPeriods = [...periods].sort((a, b) => a.fromYear - b.fromYear);

  // Walk forward from baseline year, accumulating the compound value
  let value = baselineTotal;
  // Fill years before/at baseline
  for (let y = yearRange.start; y <= Math.min(baseline.year, yearRange.end); y++) {
    bauByYear.set(y, baselineTotal);
  }
  // Fill years after baseline with compound growth
  for (let y = baseline.year + 1; y <= yearRange.end; y++) {
    const period = sortedPeriods.find((p) => y >= p.fromYear && y <= p.toYear);
    const rate = period ? period.ratePct / 100 : defaultRate;
    value = value * (1 + rate);
    bauByYear.set(y, value);
  }
  return bauByYear;
}

export function buildGlidepathMeta(
  scenarioInterventions: ScenarioInterventionInput[],
  interventionNames: { id: string; name: string }[]
): GlidepathMeta {
  // Map for O(1) name lookups instead of .find() per intervention
  const nameMap = new Map(interventionNames.map((n) => [n.id, n.name]));
  return {
    interventions: scenarioInterventions.map((si, idx) => ({
      id: si.interventionId,
      name: nameMap.get(si.interventionId) ?? si.interventionId,
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

  // Pre-compute BAU for all years in a single pass (avoids re-walking growth periods per year)
  const bauByYear = buildBauSeries(baselineTotal, baseline, yearRange);

  // Pre-index actual emissions by year for O(1) lookups
  const actualByYear = actualEmissions
    ? new Map(actualEmissions.map((a) => [a.year, a.scope1 + a.scope2 + a.scope3]))
    : null;

  // Pre-build annual reduction Maps for each intervention (avoids .find() per year per intervention)
  const reductionMaps = scenarioInterventions.map((si) =>
    buildAnnualReductionMap(si.intervention.annualReductions)
  );

  // Pre-compute target line values that are constant
  const targetLevel = primaryTarget
    ? baselineTotal * (1 - primaryTarget.reductionPct / 100)
    : null;
  const targetSpan = primaryTarget
    ? primaryTarget.targetYear - baseline.year
    : 0;

  const data: GlidepathDataPoint[] = [];

  for (let year = yearRange.start; year <= yearRange.end; year++) {
    const bau = bauByYear.get(year) ?? baselineTotal;

    // Per-intervention abatement this year
    const perIntervention: Record<string, number> = {};
    let totalAbatement = 0;
    for (let i = 0; i < scenarioInterventions.length; i++) {
      const si = scenarioInterventions[i];
      const abatement = getAnnualAbatement(si, year, reductionMaps[i]);
      perIntervention[`i_${si.interventionId}`] = abatement;
      totalAbatement += abatement;
    }

    const residual = Math.max(0, bau - totalAbatement);

    let target: number | null = null;
    if (primaryTarget && targetLevel !== null) {
      if (year <= baseline.year) {
        target = baselineTotal;
      } else if (year >= primaryTarget.targetYear) {
        target = targetLevel;
      } else {
        const progress = (year - baseline.year) / targetSpan;
        target = baselineTotal + (targetLevel - baselineTotal) * progress;
      }
    }

    const actual = actualByYear?.get(year) ?? null;

    data.push({ year, residual, bau, target, actual, ...perIntervention });
  }

  return data;
}
