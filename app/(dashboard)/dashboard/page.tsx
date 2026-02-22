import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart2,
  Target,
  Zap,
  GitBranch,
  TrendingDown,
  Building2,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Dashboard — Net Zero Tracker" };

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

  const kpis = [
    {
      label: "Baseline Emissions",
      value: totalBaseline > 0
        ? `${totalBaseline.toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO₂e`
        : "—",
      sub: baseline ? `Base year ${baseline.year}` : "No baseline yet",
      icon: BarChart2,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      href: "/baseline",
    },
    {
      label: "Reduction Target",
      value: primaryTarget
        ? `${primaryTarget.reductionPct}% by ${primaryTarget.targetYear}`
        : "—",
      sub: primaryTarget
        ? `${(totalBaseline * primaryTarget.reductionPct / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO₂e to reduce`
        : "No target set",
      icon: Target,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      href: "/targets",
    },
    {
      label: "Total Abatement",
      value: totalAbatement > 0
        ? `${totalAbatement.toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO₂e`
        : "—",
      sub: `${interventions.length} intervention${interventions.length !== 1 ? "s" : ""} · ${interventions.filter((i) => i.status === "IN_PROGRESS").length} in progress`,
      icon: Zap,
      iconBg: "bg-yellow-50",
      iconColor: "text-yellow-600",
      href: "/interventions",
    },
    {
      label: "Target Coverage",
      value: primaryTarget && totalBaseline > 0
        ? `${coveragePct.toFixed(0)}%`
        : "—",
      sub: `${scenarios.length} scenario${scenarios.length !== 1 ? "s" : ""}`,
      icon: TrendingDown,
      iconBg: coveragePct >= 100 ? "bg-emerald-50" : coveragePct >= 50 ? "bg-amber-50" : "bg-red-50",
      iconColor: coveragePct >= 100 ? "text-emerald-600" : coveragePct >= 50 ? "text-amber-600" : "text-red-500",
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
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Overview of your net zero program
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, sub, icon: Icon, iconBg, iconColor, href }) => (
          <Link key={label} href={href} className="block group">
            <Card className="border-gray-200 shadow-none hover:border-emerald-200 hover:shadow-sm transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-9 w-9 rounded-lg ${iconBg} flex items-center justify-center`}>
                    <Icon className={`h-4.5 w-4.5 ${iconColor}`} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-emerald-500 transition-colors mt-1" />
                </div>
                <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide font-medium">{label}</p>
                <p className="text-xs text-gray-500 mt-1">{sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Alerts banner */}
      {(eolAlerts > 0 || overdueCount > 0) && (
        <Link href="/alerts">
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100 transition-colors">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              {[
                eolAlerts > 0 && `${eolAlerts} asset${eolAlerts !== 1 ? "s" : ""} approaching end of life`,
                overdueCount > 0 && `${overdueCount} overdue intervention${overdueCount !== 1 ? "s" : ""}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <ArrowRight className="h-4 w-4 text-amber-600 ml-auto shrink-0" />
          </div>
        </Link>
      )}

      {/* Get started prompt */}
      {totalBaseline === 0 && (
        <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-8 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <BarChart2 className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold text-gray-800">Get started</p>
          <p className="text-sm text-gray-500 mt-1">
            Begin by entering your{" "}
            <Link href="/baseline" className="text-emerald-700 font-medium hover:underline">
              baseline emissions
            </Link>
            , then set{" "}
            <Link href="/targets" className="text-emerald-700 font-medium hover:underline">
              reduction targets
            </Link>
            .
          </p>
        </div>
      )}

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Explore</h2>
        <div className="grid grid-cols-3 gap-4">
          {quickLinks.map(({ label, desc, icon: Icon, href }) => (
            <Link key={label} href={href} className="block group">
              <Card className="border-gray-200 shadow-none hover:border-emerald-200 hover:shadow-sm transition-all h-full">
                <CardContent className="p-5">
                  <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-emerald-50 transition-colors">
                    <Icon className="h-4 w-4 text-gray-500 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500 mt-1">{desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
