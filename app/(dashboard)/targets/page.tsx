import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { TargetsList } from "@/components/targets/targets-list";

export const metadata = { title: "Emissions Targets — Net Zero Pathfinder" };

export default async function TargetsPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const targets = await db.target.findMany({
    where: { companyId: session.user.companyId },
    orderBy: [{ targetYear: "asc" }],
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Emissions Targets</h1>
        <p className="text-sm text-gray-500 mt-0.5 dark:text-slate-400">
          Define absolute reduction targets by scope and year.
        </p>
      </div>
      <TargetsList initialTargets={targets} />
    </div>
  );
}
