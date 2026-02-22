import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { InterventionsList } from "@/components/interventions/interventions-list";

export const metadata = { title: "Interventions — Net Zero Tracker" };

export default async function InterventionsPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const companyId = session.user.companyId;

  const [rows, sites, businessUnits] = await Promise.all([
    db.intervention.findMany({
      where: { companyId },
      include: {
        site: { select: { id: true, name: true, country: true } },
        businessUnit: { select: { id: true, name: true } },
        annualReductions: { orderBy: { year: "asc" } },
        documents: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.site.findMany({ where: { companyId }, select: { id: true, name: true, country: true }, orderBy: { name: "asc" } }),
    db.businessUnit.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
  ]);

  // Parse scopesAffected from JSON string to number[]
  const interventions = rows.map((r) => ({
    ...r,
    scopesAffected: JSON.parse(r.scopesAffected) as number[],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Intervention Library</h1>
        <p className="text-sm text-gray-500 mt-0.5 dark:text-slate-400">
          Define the emissions reduction actions available to your organisation.
        </p>
      </div>
      <InterventionsList
        initialInterventions={interventions}
        sites={sites}
        businessUnits={businessUnits}
      />
    </div>
  );
}
