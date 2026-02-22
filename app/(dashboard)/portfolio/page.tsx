import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PortfolioView } from "@/components/portfolio/portfolio-view";
import { PlanGate } from "@/components/ui/plan-gate";

export const metadata = { title: "Portfolio — Net Zero Tracker" };

export default async function PortfolioPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const companyId = session.user.companyId;

  const [sites, baseline, company] = await Promise.all([
    db.site.findMany({
      where: { companyId },
      include: {
        interventions: {
          select: {
            id: true,
            totalReductionTco2e: true,
            scopesAffected: true,
          },
        },
        assets: {
          select: {
            id: true,
            installationYear: true,
            expectedUsefulLife: true,
            alertThresholdYears: true,
            currentEnergyKwh: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.baseline.findFirst({
      where: { companyId },
      include: { entries: true },
    }),
    db.company.findUnique({
      where: { id: companyId },
      select: { plan: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Portfolio Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          League table and map view across all sites.
        </p>
      </div>
      <PlanGate plan={company?.plan} feature="portfolioMap">
        <PortfolioView sites={sites} baseline={baseline} />
      </PlanGate>
    </div>
  );
}
