import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AlertsView } from "@/components/alerts/alerts-view";

export const metadata = { title: "Alerts — Net Zero Tracker" };

const currentYear = new Date().getFullYear();

export default async function AlertsPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const companyId = session.user.companyId;

  const [assets, interventions] = await Promise.all([
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Alerts</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Asset end-of-life warnings and intervention status flags.
        </p>
      </div>
      <AlertsView
        eolAlerts={eolAlerts}
        overdueInterventions={overdueInterventions}
        stalledInterventions={stalledInterventions}
      />
    </div>
  );
}
