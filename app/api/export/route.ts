import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import * as XLSX from "xlsx";

export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();

    const company = await db.company.findUnique({
      where: { id: ctx.companyId },
      select: { plan: true },
    });
    if (company?.plan !== "PAID") {
      return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const scenarioId = searchParams.get("scenarioId");

    const [baseline, targets, interventions] = await Promise.all([
      db.baseline.findFirst({
        where: { companyId: ctx.companyId },
        include: { entries: { orderBy: [{ scope: "asc" }, { category: "asc" }] } },
      }),
      db.target.findMany({
        where: { companyId: ctx.companyId },
        orderBy: { targetYear: "asc" },
      }),
      db.intervention.findMany({
        where: { companyId: ctx.companyId },
        include: { annualReductions: { orderBy: { year: "asc" } } },
        orderBy: { name: "asc" },
      }),
    ]);

    const wb = XLSX.utils.book_new();

    // Sheet 1: Baseline
    if (baseline) {
      const baselineRows = baseline.entries.map((e) => ({
        Scope: e.scope,
        Category: e.category,
        "Emissions (tCO2e)": e.emissionsTco2e,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(baselineRows), "Baseline");
    }

    // Sheet 2: Targets
    const targetRows = targets.map((t) => ({
      Label: t.label,
      "Scope Combination": t.scopeCombination,
      "Target Year": t.targetYear,
      "Reduction (%)": t.reductionPct,
      Interim: t.isInterim ? "Yes" : "No",
      "SBTi Aligned": t.isSbtiAligned ? "Yes" : "No",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(targetRows), "Targets");

    // Sheet 3: Interventions
    const interventionRows = interventions.map((i) => ({
      Name: i.name,
      Category: i.category,
      "Scopes Affected": i.scopesAffected,
      "Total Reduction (tCO2e)": i.totalReductionTco2e,
      "Start Year": i.implementationStartYear,
      "Full Benefit Year": i.fullBenefitYear,
      Status: i.status,
      Owner: i.owner ?? "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(interventionRows), "Interventions");

    // Sheet 4: Scenario (if requested)
    if (scenarioId) {
      const scenario = await db.scenario.findFirst({
        where: { id: scenarioId, companyId: ctx.companyId },
        include: {
          interventions: {
            include: { intervention: true },
          },
        },
      });
      if (scenario) {
        const siRows = scenario.interventions.map((si) => ({
          Intervention: si.intervention.name,
          "Start Year": si.startYear,
          "End Year": si.endYear ?? "",
          "Execution (%)": si.executionPct,
          "Pace (%/yr)": si.implementationPacePctPerYear ?? "",
          "Capex ($)": si.capex ?? "",
          "Opex ($/yr)": si.opex ?? "",
          "Financial Lifetime (yrs)": si.financialLifetime ?? "",
          "External Funding ($)": si.externalFunding ?? "",
          "Personnel Days": si.personnelTimeDays ?? "",
          "Day Rate ($/day)": si.personnelRatePerDay ?? "",
          Notes: si.notes ?? "",
        }));
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(siRows),
          `Scenario - ${scenario.name}`.slice(0, 31)
        );
      }
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="net-zero-export.xlsx"`,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[export GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
