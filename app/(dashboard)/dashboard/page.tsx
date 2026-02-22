import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart2,
  GitBranch,
  Target,
  Building2,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { KpiCards, type KpiItem } from "@/components/dashboard/kpi-cards";

export const metadata = { title: "Dashboard — Net Zero Pathfinder" };

const currentYear = new Date().getFullYear();

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const companyId = session.user.companyId;

  const [baseline, targets, interventions, scenarios, assets] = await Promise.all([
    db.baseline.findFirst({ where: { companyId }, include: { entries: true } }),
    db.target.findMany({ where: { companyId } }),
    db.intervention.findMany({ where: { companyId } }),
    db.scenario.findMany({ where: { companyId } }),
    db.asset.findMany({
      where: { companyId },
      select: { installationYear: true, expectedUsefulLife: true, alertThresholdYears: true },
    }),
  ]);

  const totalBaseline = baseline?.entries.reduce(
    (sum: number, e: { emissionsTco2e: number }) => sum + e.emissionsTco2e,
    0
  ) ?? 0;

  const primaryTarget = targets.find((t) => !t.isInterim && t.scopeCombination === "1+2+3")
    ?? targets[0];

  const totalAbatement = interventions.reduce((s, i) => s + i.totalReductionTco2e, 0);
  const coveragePct = totalBaseline > 0
    ? Math.min(100, (totalAbatement / (totalBaseline * (primaryTarget?.reductionPct ?? 100) / 100)) * 100)
    : 0;

  // EOL alerts
  const eolAlerts = assets.filter((a) => {
    const eol = a.installationYear + a.expectedUsefulLife;
    return eol - currentYear <= a.alertThresholdYears;
  }).length;

  // Overdue interventions
  const overdueCount = interventions.filter(
    (i) => i.status === "PLANNED" && i.implementationStartYear < currentYear
  ).length;

  const kpis: KpiItem[] = [
    {
      label: "Baseline Emissions",
      value: totalBaseline > 0
        ? `${totalBaseline.toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO₂e`
        : "—",
      numericValue: totalBaseline > 0 ? Math.round(totalBaseline) : null,
      suffix: "tCO₂e",
      sub: baseline ? `Base year ${baseline.year}` : "No baseline yet",
      iconName: "BarChart2",
      iconBg: "bg-emerald-50 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      href: "/baseline",
    },
    {
      label: "Reduction Target",
      value: primaryTarget
        ? `${primaryTarget.reductionPct}% by ${primaryTarget.targetYear}`
        : "—",
      numericValue: null,
      suffix: "",
      sub: primaryTarget
        ? `${(totalBaseline * primaryTarget.reductionPct / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO₂e to reduce`
        : "No target set",
      iconName: "Target",
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      href: "/targets",
    },
    {
      label: "Total Abatement",
      value: totalAbatement > 0
        ? `${totalAbatement.toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO₂e`
        : "—",
      numericValue: totalAbatement > 0 ? Math.round(totalAbatement) : null,
      suffix: "tCO₂e",
      sub: `${interventions.length} intervention${interventions.length !== 1 ? "s" : ""} · ${interventions.filter((i) => i.status === "IN_PROGRESS").length} in progress`,
      iconName: "Zap",
      iconBg: "bg-yellow-50 dark:bg-yellow-900/30",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      href: "/interventions",
    },
    {
      label: "Target Coverage",
      value: primaryTarget && totalBaseline > 0
        ? `${coveragePct.toFixed(0)}%`
        : "—",
      numericValue: primaryTarget && totalBaseline > 0 ? Math.round(coveragePct) : null,
      suffix: "%",
      sub: `${scenarios.length} scenario${scenarios.length !== 1 ? "s" : ""}`,
      iconName: "TrendingDown",
      iconBg: coveragePct >= 100 ? "bg-emerald-50 dark:bg-emerald-900/30" : coveragePct >= 50 ? "bg-amber-50 dark:bg-amber-900/30" : "bg-red-50 dark:bg-red-900/30",
      iconColor: coveragePct >= 100 ? "text-emerald-600 dark:text-emerald-400" : coveragePct >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-500 dark:text-red-400",
      href: "/scenarios",
    },
  ];

  const quickLinks = [
    { label: "Scenarios", desc: "Model and compare decarbonisation pathways", icon: GitBranch, href: "/scenarios" },
    { label: "Asset Register", desc: "Track physical assets and end-of-life schedules", icon: Building2, href: "/assets" },
    { label: "Portfolio", desc: "League table and map view across all sites", icon: Target, href: "/portfolio" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Overview of your net zero program
        </p>
      </div>

      {/* KPI Cards — client component with count-up animation */}
      <KpiCards items={kpis} />

      {/* Alerts banner */}
      {(eolAlerts > 0 || overdueCount > 0) && (
        <Link href="/alerts">
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {[
                eolAlerts > 0 && `${eolAlerts} asset${eolAlerts !== 1 ? "s" : ""} approaching end of life`,
                overdueCount > 0 && `${overdueCount} overdue intervention${overdueCount !== 1 ? "s" : ""}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <ArrowRight className="h-4 w-4 text-amber-600 dark:text-amber-400 ml-auto shrink-0" />
          </div>
        </Link>
      )}

      {/* Get started prompt */}
      {totalBaseline === 0 && (
        <div className="rounded-xl border border-dashed border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-900/10 p-8 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <BarChart2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-gray-800 dark:text-white">Get started</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Begin by entering your{" "}
            <Link href="/baseline" className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline">
              baseline emissions
            </Link>
            , then set{" "}
            <Link href="/targets" className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline">
              reduction targets
            </Link>
            .
          </p>
        </div>
      )}

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Explore</h2>
        <div className="grid grid-cols-3 gap-4">
          {quickLinks.map(({ label, desc, icon: Icon, href }) => (
            <Link key={label} href={href} className="block group">
              <Card className="border-gray-200 dark:border-slate-700 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-700 h-full bg-white dark:bg-slate-800">
                <CardContent className="p-5">
                  <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-3 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 transition-colors">
                    <Icon className="h-4 w-4 text-gray-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
