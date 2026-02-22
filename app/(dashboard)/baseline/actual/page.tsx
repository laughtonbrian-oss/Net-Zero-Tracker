import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ActualEmissionsForm } from "@/components/baseline/actual-emissions-form";

export const metadata = { title: "Actual Emissions — Net Zero Pathfinder" };

export default async function ActualEmissionsPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const companyId = session.user.companyId;

  const baseline = await db.baseline.findFirst({
    where: { companyId },
  });

  const actualEmissions = await db.actualEmission.findMany({
    where: { companyId },
    orderBy: { year: "asc" },
  });

  const baselineYear = baseline?.year ?? new Date().getFullYear() - 3;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Actual Emissions</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Record actual measured emissions by scope for each year since your baseline.
        </p>
      </div>
      <ActualEmissionsForm
        baselineYear={baselineYear}
        initialData={actualEmissions}
      />
    </div>
  );
}
