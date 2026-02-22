export type MACCInput = {
  interventionId: string;
  name: string;
  category: string;
  totalReductionTco2e: number;
  implementationStartYear: number;
  fullBenefitYear: number;
  capex: number | null;
  opex: number | null;
  financialLifetime: number | null;
  externalFunding: number | null;
};

export type MACCDataPoint = {
  interventionId: string;
  name: string;
  category: string;
  mac: number;          // $/tCO2e
  annualAbatement: number; // tCO2e/yr at full benefit
  totalAbatement: number;  // tCO2e over lifetime
  totalCost: number;
};

export function buildMACCData(inputs: MACCInput[]): MACCDataPoint[] {
  const points: MACCDataPoint[] = inputs.map((i) => {
    const lifetime = i.financialLifetime ?? Math.max(1, i.fullBenefitYear - i.implementationStartYear + 1);
    const totalCost =
      (i.capex ?? 0) + (i.opex ?? 0) * lifetime - (i.externalFunding ?? 0);
    const yearsActive = Math.max(1, i.fullBenefitYear - i.implementationStartYear + 1);
    const annualAbatement = i.totalReductionTco2e / yearsActive;
    const totalAbatement = i.totalReductionTco2e;
    const mac = totalAbatement > 0 ? totalCost / totalAbatement : 0;
    return {
      interventionId: i.interventionId,
      name: i.name,
      category: i.category,
      mac,
      annualAbatement,
      totalAbatement,
      totalCost,
    };
  });

  // Sort ascending by MAC (cheapest first)
  return points.sort((a, b) => a.mac - b.mac);
}
