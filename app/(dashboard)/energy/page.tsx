import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { EnergyDashboard } from "@/components/energy/energy-dashboard";

export const metadata = { title: "Energy — Net Zero Pathfinder" };

export default async function EnergyPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const companyId = session.user.companyId;

  const [readings, sites] = await Promise.all([
    db.energyReading.findMany({
      where: { companyId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: { site: { select: { id: true, name: true, country: true } } },
    }),
    db.site.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, country: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Energy</h1>
        <p className="text-sm text-gray-500 mt-0.5 dark:text-slate-400">
          Track energy consumption and costs across all sites.
        </p>
      </div>
      <EnergyDashboard initialReadings={readings} sites={sites} />
    </div>
  );
}
