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

  return years.map((year) => {
    const point: WedgeDataPoint = { year };
    for (const si of inputs) {
      const iv = si.intervention;
      const execFrac = si.executionPct / 100;
      const startY = si.startYear ?? iv.implementationStartYear;
      const endY = si.endYear ?? iv.fullBenefitYear;

      if (year < startY || year > endY) {
        point[si.interventionId] = 0;
        continue;
      }

      // If explicit annual reductions exist, use those
      if (iv.annualReductions.length > 0) {
        const match = iv.annualReductions.find((r) => r.year === year);
        point[si.interventionId] = (match?.tco2eReduction ?? 0) * execFrac;
        continue;
      }

      // Otherwise linear ramp from startY to fullBenefitYear
      const rampYears = Math.max(1, iv.fullBenefitYear - iv.implementationStartYear);
      const yearsActive = Math.max(1, endY - iv.implementationStartYear + 1);
      const annualFull = iv.totalReductionTco2e / yearsActive;

      if (si.implementationPacePctPerYear !== null) {
        const pace = si.implementationPacePctPerYear / 100;
        const elapsed = year - startY;
        const rampFrac = Math.min(1, elapsed * pace);
        point[si.interventionId] = annualFull * rampFrac * execFrac;
      } else {
        const elapsed = year - iv.implementationStartYear;
        const rampFrac = Math.min(1, elapsed / rampYears);
        point[si.interventionId] = annualFull * rampFrac * execFrac;
      }
    }
    return point;
  });
}
