import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { MapOverview } from "@/components/portfolio/map-overview";
import { PlanGate } from "@/components/ui/plan-gate";

export const metadata = { title: "Map Overview — Net Zero Tracker" };

export default async function MapOverviewPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const companyId = session.user.companyId;

  const [sites, company] = await Promise.all([
    db.site.findMany({
      where: { companyId, latitude: { not: null }, longitude: { not: null } },
      select: {
        id: true,
        name: true,
        address: true,
        region: true,
        country: true,
        latitude: true,
        longitude: true,
        interventions: {
          select: { id: true, totalReductionTco2e: true, scopesAffected: true },
        },
        assets: { select: { id: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.company.findUnique({
      where: { id: companyId },
      select: { plan: true },
    }),
  ]);

  // latitude/longitude are filtered to non-null above but Prisma types them as
  // nullable — cast to satisfy SiteMap's required number fields.
  const mappableSites = sites.map((s) => ({
    ...s,
    latitude: s.latitude as number,
    longitude: s.longitude as number,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Map Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5 dark:text-slate-400">
          Geographic view of all sites with location data.
        </p>
      </div>
      <PlanGate plan={company?.plan} feature="portfolioMap">
        <MapOverview sites={mappableSites} />
      </PlanGate>
    </div>
  );
}
