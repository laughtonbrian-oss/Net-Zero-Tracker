import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AlertsView } from "@/components/alerts/alerts-view";

export const metadata = { title: "Alerts — Net Zero Pathfinder" };

const currentYear = new Date().getFullYear();

export default async function AlertsPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const companyId = session.user.companyId;

  const [assets, interventions, scenarioInterventions] = await Promise.all([
    db.asset.findMany({
      where: { companyId },
      include: { site: { select: { id: true, name: true } } },
      orderBy: [{ siteId: "asc" }, { name: "asc" }],
    }),
    db.intervention.findMany({
      where: { companyId },
      include: { site: { select: { id: true, name: true } } },
      orderBy: { implementationStartYear: "asc" },
    }),
    db.scenarioIntervention.findMany({
      where: {
        scenario: { companyId },
        technicalAssetLife: { not: null },
      },
      include: {
        intervention: { select: { id: true, name: true } },
        scenario: { select: { id: true, name: true } },
      },
      orderBy: { startYear: "asc" },
    }),
  ]);

  // EOL alerts: assets where eol year is within alertThresholdYears from now
  const eolAlerts = assets
    .map((a) => ({
      ...a,
      eolYear: a.installationYear + a.expectedUsefulLife,
      yearsRemaining: a.installationYear + a.expectedUsefulLife - currentYear,
    }))
    .filter((a) => a.yearsRemaining <= a.alertThresholdYears)
    .sort((a, b) => a.yearsRemaining - b.yearsRemaining);

  // Overdue interventions: PLANNED status but start year has passed
  const overdueInterventions = interventions.filter(
    (i) => i.status === "PLANNED" && i.implementationStartYear < currentYear
  );

  // In-progress interventions: started but fullBenefitYear has passed
  const stalledInterventions = interventions.filter(
    (i) => i.status === "IN_PROGRESS" && i.fullBenefitYear < currentYear
  );

  // Replacement alerts: scenario interventions whose asset will need replacing before 2050
  // Deduplicate by intervention id — show the earliest replacement year across scenarios
  const replacementMap = new Map<string, {
    interventionId: string;
    interventionName: string;
    scenarioName: string;
    startYear: number;
    technicalAssetLife: number;
    replacementYear: number;
  }>();

  for (const si of scenarioInterventions) {
    if (si.technicalAssetLife === null) continue;
    const replacementYear = si.startYear + si.technicalAssetLife;
    if (replacementYear >= 2050) continue;
    const existing = replacementMap.get(si.intervention.id);
    if (!existing || replacementYear < existing.replacementYear) {
      replacementMap.set(si.intervention.id, {
        interventionId: si.intervention.id,
        interventionName: si.intervention.name,
        scenarioName: si.scenario.name,
        startYear: si.startYear,
        technicalAssetLife: si.technicalAssetLife,
        replacementYear,
      });
    }
  }

  const replacementAlerts = Array.from(replacementMap.values()).sort(
    (a, b) => a.replacementYear - b.replacementYear
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alerts</h1>
        <p className="text-sm text-gray-500 mt-0.5 dark:text-slate-400">
          Asset end-of-life warnings and intervention status flags.
        </p>
      </div>
      <AlertsView
        eolAlerts={eolAlerts}
        overdueInterventions={overdueInterventions}
        stalledInterventions={stalledInterventions}
        replacementAlerts={replacementAlerts}
      />
    </div>
  );
}
