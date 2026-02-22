// Premium features gated behind the PAID plan
export const PREMIUM_FEATURES = {
  portfolioMap: "Interactive portfolio map",
  maccChart: "MACC (Marginal Abatement Cost Curve) chart",
  wedgeChart: "Wedge abatement chart",
  scenarioComparison: "Multi-scenario comparison",
  excelExport: "Excel / CSV data export",
} as const;

export type PremiumFeature = keyof typeof PREMIUM_FEATURES;

export function isPremium(plan: string | undefined | null): boolean {
  return plan === "PAID";
}
