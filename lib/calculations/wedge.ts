export type WedgeInput = {
  interventionId: string;
  name: string;
  startYear: number;
  endYear: number | null;
  executionPct: number;
  implementationPacePctPerYear: number | null;
  intervention: {
    totalReductionTco2e: number;
    implementationStartYear: number;
    fullBenefitYear: number;
    annualReductions: { year: number; tco2eReduction: number }[];
    growthRates?: { fromYear: number; toYear: number; ratePct: number }[];
  };
};

export type WedgeDataPoint = {
  year: number;
  [interventionId: string]: number;
};

export function buildWedgeData(
  inputs: WedgeInput[],
  yearRange: { start: number; end: number }
): WedgeDataPoint[] {
  const years: number[] = [];
  for (let y = yearRange.start; y <= yearRange.end; y++) years.push(y);

  // Pre-index annual reductions by year for each input (O(1) lookups instead of .find() per year)
  const reductionMaps = inputs.map((si) =>
    si.intervention.annualReductions.length > 0
      ? new Map(si.intervention.annualReductions.map((r) => [r.year, r.tco2eReduction]))
      : null
  );

  // Pre-compute per-input constants that don't change across years
  const inputConstants = inputs.map((si) => {
    const iv = si.intervention;
    const startY = si.startYear ?? iv.implementationStartYear;
    const endY = si.endYear ?? iv.fullBenefitYear;
    const execFrac = si.executionPct / 100;
    const rampYears = Math.max(1, iv.fullBenefitYear - iv.implementationStartYear);
    const yearsActive = Math.max(1, endY - iv.implementationStartYear + 1);
    const annualFull = iv.totalReductionTco2e / yearsActive;
    const pace = si.implementationPacePctPerYear !== null
      ? si.implementationPacePctPerYear / 100
      : null;
    return { startY, endY, execFrac, rampYears, annualFull, pace, implStart: iv.implementationStartYear };
  });

  return years.map((year) => {
    const point: WedgeDataPoint = { year };
    for (let i = 0; i < inputs.length; i++) {
      const si = inputs[i];
      const c = inputConstants[i];
      const reductionMap = reductionMaps[i];

      if (year < c.startY || year > c.endY) {
        point[si.interventionId] = 0;
        continue;
      }

      // If explicit annual reductions exist, use the pre-built Map
      if (reductionMap) {
        point[si.interventionId] = (reductionMap.get(year) ?? 0) * c.execFrac;
        continue;
      }

      // Otherwise linear ramp
      if (c.pace !== null) {
        const elapsed = year - c.startY;
        const rampFrac = Math.min(1, elapsed * c.pace);
        point[si.interventionId] = c.annualFull * rampFrac * c.execFrac;
      } else {
        const elapsed = year - c.implStart;
        const rampFrac = Math.min(1, elapsed / c.rampYears);
        point[si.interventionId] = c.annualFull * rampFrac * c.execFrac;
      }
    }
    return point;
  });
}
