// Shared TypeScript types used across the app
// Prisma-generated types are imported directly from @prisma/client

export type ScopeCombination = "1" | "2" | "3" | "1+2" | "1+2+3";

export const SCOPE_COMBINATIONS: { value: ScopeCombination; label: string }[] = [
  { value: "1", label: "Scope 1 only" },
  { value: "2", label: "Scope 2 only" },
  { value: "3", label: "Scope 3 only" },
  { value: "1+2", label: "Scope 1 + 2" },
  { value: "1+2+3", label: "Scope 1 + 2 + 3 (Full value chain)" },
];

export type YearRange = { start: number; end: number };

// Chart data types
export type GlidepathDataPoint = {
  year: number;
  residual: number;
  bau: number;
  target: number | null;
  actual?: number | null;
  // dynamic keys: `i_${interventionId}` → annual abatement tCO2e
  [key: string]: number | null | undefined;
};

export type GlidepathMeta = {
  interventions: { id: string; name: string; color: string }[];
};

export type WedgeDataPoint = {
  year: number;
  [interventionId: string]: number;
};

export type MACCDataPoint = {
  interventionId: string;
  name: string;
  mac: number; // $/tCO2e
  annualAbatement: number; // tCO2e/year
  totalAbatement: number; // tCO2e
};

// API response wrappers
export type ApiSuccess<T> = { data: T };
export type ApiError = { error: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
