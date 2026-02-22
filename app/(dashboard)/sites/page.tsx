import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { SitesView } from "@/components/sites/sites-view";

export const metadata = { title: "Site Management — Net Zero Pathfinder" };

export default async function SitesPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const sites = await db.site.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, address: true, city: true, region: true,
      country: true, latitude: true, longitude: true, siteType: true,
      grossFloorAreaM2: true, yearBuilt: true, siteManager: true, notes: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Site Management</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          {sites.length} site{sites.length !== 1 ? "s" : ""} · Add, edit, or import your facilities
        </p>
      </div>
      <SitesView initialSites={sites} />
    </div>
  );
}
