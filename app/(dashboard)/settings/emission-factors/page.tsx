import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { EmissionFactorsView } from "@/components/settings/emission-factors-view";

export const metadata = { title: "Emission Factors — Net Zero Pathfinder" };

export default async function EmissionFactorsPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const overrides = await db.companyEmissionFactor.findMany({
    where: { companyId: session.user.companyId },
    orderBy: [{ region: "asc" }, { fuelType: "asc" }],
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Emission Factors</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          View the default emission factor library and manage company-specific overrides.
        </p>
      </div>
      <EmissionFactorsView initialOverrides={overrides} />
    </div>
  );
}
