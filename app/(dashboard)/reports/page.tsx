import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ReportView } from "@/components/report/report-view";

export const metadata = { title: "Reports — Net Zero Pathfinder" };

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const companyId = session.user.companyId;

  const [company, baseline, targets, scenarios, interventions] = await Promise.all([
    db.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, logo: true, plan: true },
    }),
    db.baseline.findFirst({
      where: { companyId },
      include: {
        entries: { orderBy: [{ scope: "asc" }, { category: "asc" }] },
        growthRates: { orderBy: { fromYear: "asc" } },
      },
    }),
    db.target.findMany({
      where: { companyId },
      orderBy: { targetYear: "asc" },
    }),
    db.scenario.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
      include: {
        interventions: {
          include: {
            intervention: {
              include: { annualReductions: true },
            },
          },
        },
      },
    }),
    db.intervention.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <ReportView
      company={company}
      baseline={baseline}
      targets={targets}
      scenarios={scenarios}
      interventions={interventions}
    />
  );
}
