// Hardcoded emission factor library
// All values in kgCO2e/kWh unless noted

export type EmissionFactor = {
  region: string;
  fuelType: string;
  value: number;   // kgCO2e/kWh
  source: string;
  year: number;
  unit: string;
};

export const EMISSION_FACTORS: EmissionFactor[] = [
  // UK DEFRA 2025
  { region: "UK", fuelType: "Natural Gas", value: 0.18254, source: "UK DEFRA 2025", year: 2025, unit: "kgCO2e/kWh" },
  { region: "UK", fuelType: "Grid Electricity", value: 0.20705, source: "UK DEFRA 2025", year: 2025, unit: "kgCO2e/kWh" },
  { region: "UK", fuelType: "Diesel", value: 0.25440, source: "UK DEFRA 2025", year: 2025, unit: "kgCO2e/kWh" },
  { region: "UK", fuelType: "LPG", value: 0.21444, source: "UK DEFRA 2025", year: 2025, unit: "kgCO2e/kWh" },
  { region: "UK", fuelType: "Petrol", value: 0.22480, source: "UK DEFRA 2025", year: 2025, unit: "kgCO2e/kWh" },
  // US EPA 2024
  { region: "US", fuelType: "Natural Gas", value: 0.18153, source: "US EPA 2024", year: 2024, unit: "kgCO2e/kWh" },
  { region: "US", fuelType: "Grid Electricity", value: 0.38590, source: "US EPA eGRID 2024", year: 2024, unit: "kgCO2e/kWh" },
  { region: "US", fuelType: "Diesel", value: 0.26456, source: "US EPA 2024", year: 2024, unit: "kgCO2e/kWh" },
  { region: "US", fuelType: "LPG", value: 0.21700, source: "US EPA 2024", year: 2024, unit: "kgCO2e/kWh" },
  // Canada NIR 2024
  { region: "Canada", fuelType: "Natural Gas", value: 0.18620, source: "Canada NIR 2024", year: 2024, unit: "kgCO2e/kWh" },
  { region: "Canada", fuelType: "Grid Electricity", value: 0.13000, source: "Canada NIR 2024", year: 2024, unit: "kgCO2e/kWh" },
  { region: "Canada", fuelType: "Diesel", value: 0.26860, source: "Canada NIR 2024", year: 2024, unit: "kgCO2e/kWh" },
  // Poland
  { region: "Poland", fuelType: "Grid Electricity", value: 0.77300, source: "KOBiZE 2024", year: 2024, unit: "kgCO2e/kWh" },
  { region: "Poland", fuelType: "Natural Gas", value: 0.20200, source: "KOBiZE 2024", year: 2024, unit: "kgCO2e/kWh" },
  { region: "Poland", fuelType: "Diesel", value: 0.26800, source: "KOBiZE 2024", year: 2024, unit: "kgCO2e/kWh" },
  // US eGRID 2024 subregions
  { region: "US-WECC", fuelType: "Grid Electricity", value: 0.290, source: "US EPA eGRID 2024 WECC", year: 2024, unit: "kgCO2e/kWh" },
  { region: "US-SERC", fuelType: "Grid Electricity", value: 0.440, source: "US EPA eGRID 2024 SERC", year: 2024, unit: "kgCO2e/kWh" },
  { region: "US-RFC",  fuelType: "Grid Electricity", value: 0.380, source: "US EPA eGRID 2024 RFC",  year: 2024, unit: "kgCO2e/kWh" },
  { region: "US-MRO",  fuelType: "Grid Electricity", value: 0.530, source: "US EPA eGRID 2024 MRO",  year: 2024, unit: "kgCO2e/kWh" },
  { region: "US-NPCC", fuelType: "Grid Electricity", value: 0.220, source: "US EPA eGRID 2024 NPCC", year: 2024, unit: "kgCO2e/kWh" },
  { region: "US-TRE",  fuelType: "Grid Electricity", value: 0.380, source: "US EPA eGRID 2024 TRE (ERCOT)", year: 2024, unit: "kgCO2e/kWh" },
  { region: "US-HICC", fuelType: "Grid Electricity", value: 0.700, source: "US EPA eGRID 2024 HICC (Hawaii)", year: 2024, unit: "kgCO2e/kWh" },
  { region: "US-AKGR", fuelType: "Grid Electricity", value: 0.520, source: "US EPA eGRID 2024 AKGR (Alaska)", year: 2024, unit: "kgCO2e/kWh" },
];

export function getEmissionFactor(region: string, fuelType: string): EmissionFactor | undefined {
  return EMISSION_FACTORS.find(
    (f) => f.region.toLowerCase() === region.toLowerCase() &&
           f.fuelType.toLowerCase() === fuelType.toLowerCase()
  );
}

export function kWhToTco2e(kWh: number, region: string, fuelType: string): number {
  const factor = getEmissionFactor(region, fuelType);
  if (!factor) return 0;
  return (kWh * factor.value) / 1000; // kgCO2e → tCO2e
}

export const FUEL_TYPES = ["Natural Gas", "Grid Electricity", "Diesel", "LPG", "Petrol"];
export const REGIONS = ["UK", "US", "Canada", "Poland"];

export const US_EGRID_REGIONS = [
  "US-WECC", "US-SERC", "US-RFC", "US-MRO", "US-NPCC", "US-TRE", "US-HICC", "US-AKGR",
] as const;

export const US_EGRID_LABELS: Record<string, string> = {
  "US-WECC": "WECC (West)",
  "US-SERC": "SERC (Southeast)",
  "US-RFC":  "RFC (Mid-Atlantic)",
  "US-MRO":  "MRO (Midwest)",
  "US-NPCC": "NPCC (Northeast)",
  "US-TRE":  "TRE (Texas / ERCOT)",
  "US-HICC": "HICC (Hawaii)",
  "US-AKGR": "AKGR (Alaska)",
};
