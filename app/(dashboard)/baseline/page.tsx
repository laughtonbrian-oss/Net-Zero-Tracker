import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { BaselineForm } from "@/components/baseline/baseline-form";

export const metadata = { title: "Baseline Emissions — Net Zero Tracker" };

export default async function BaselinePage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const baseline = await db.baseline.findFirst({
    where: { companyId: session.user.companyId },
    include: {
      entries: { orderBy: [{ scope: "asc" }, { category: "asc" }] },
      growthRates: { orderBy: { fromYear: "asc" } },
    },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Baseline Emissions</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Enter your organisation&apos;s annual emissions by scope and category.
        </p>
      </div>
      <BaselineForm baseline={baseline} />
    </div>
  );
}
