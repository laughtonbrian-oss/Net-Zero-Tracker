import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AssetsList } from "@/components/assets/assets-list";

export const metadata = { title: "Assets — Net Zero Tracker" };

export default async function AssetsPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const companyId = session.user.companyId;

  const [assets, sites, interventions] = await Promise.all([
    db.asset.findMany({
      where: { companyId },
      include: {
        site: { select: { id: true, name: true } },
        linkedIntervention: { select: { id: true, name: true } },
      },
      orderBy: [{ siteId: "asc" }, { name: "asc" }],
    }),
    db.site.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    db.intervention.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Asset Register</h1>
        <p className="text-sm text-gray-500 mt-0.5 dark:text-slate-400">
          Track physical assets, condition ratings, and end-of-life schedules.
        </p>
      </div>
      <AssetsList initialAssets={assets} sites={sites} interventions={interventions} />
    </div>
  );
}
