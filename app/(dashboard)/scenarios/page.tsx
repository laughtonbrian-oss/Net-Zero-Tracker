import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ScenariosView } from "@/components/scenarios/scenarios-view";
import { ScenarioCompareView } from "@/components/scenarios/scenario-compare-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = { title: "Scenarios — Net Zero Tracker" };

export default async function ScenariosPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const companyId = session.user.companyId;

  const [scenarios, interventions, baseline, targets] = await Promise.all([
    db.scenario.findMany({
      where: { companyId },
      include: {
        interventions: {
          include: {
            intervention: {
              include: {
                annualReductions: { orderBy: { year: "asc" } },
                site: { select: { id: true, name: true, country: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.intervention.findMany({
      where: { companyId },
      include: {
        annualReductions: { orderBy: { year: "asc" } },
        site: { select: { id: true, name: true, country: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.baseline.findFirst({
      where: { companyId },
      include: { entries: true, growthRates: { orderBy: { fromYear: "asc" } } },
    }),
    db.target.findMany({
      where: { companyId },
      orderBy: { targetYear: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scenarios</h1>
        <p className="text-sm text-gray-500 mt-0.5 dark:text-slate-400">
          Build and compare reduction pathways using your intervention library.
        </p>
      </div>
      <Tabs defaultValue="build">
        <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 h-auto mb-4">
          {["build", "compare"].map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:text-gray-900 rounded-none pb-2 text-sm capitalize"
            >
              {t === "build" ? "Build" : "Compare"}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="build">
          <ScenariosView
            initialScenarios={scenarios}
            interventions={interventions}
            baseline={baseline}
            targets={targets}
          />
        </TabsContent>
        <TabsContent value="compare">
          {baseline ? (
            <ScenarioCompareView scenarios={scenarios} baseline={baseline} targets={targets} />
          ) : (
            <p className="text-sm text-gray-500">Enter baseline emissions first.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
