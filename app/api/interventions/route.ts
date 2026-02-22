import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const interventionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().min(1).max(100),
  scopesAffected: z.array(z.number().int().min(1).max(3)).min(1),
  totalReductionTco2e: z.number().positive(),
  implementationStartYear: z.number().int().min(1900).max(2100),
  fullBenefitYear: z.number().int().min(1900).max(2100),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "ABANDONED"]).default("PLANNED"),
  owner: z.string().optional(),
  siteId: z.string().optional(),
  businessUnitId: z.string().optional(),
});

/** Parse scopesAffected JSON string → number[] for API responses */
function parseScopes(raw: string): number[] {
  try { return JSON.parse(raw); } catch { return []; }
}

export async function GET() {
  try {
    const ctx = await getTenantContext();
    const rows = await db.intervention.findMany({
      where: { companyId: ctx.companyId },
      include: {
        annualReductions: { orderBy: { year: "asc" } },
        documents: true,
        site: true,
        businessUnit: true,
      },
      orderBy: { createdAt: "desc" },
    });
    const data = rows.map((r) => ({ ...r, scopesAffected: parseScopes(r.scopesAffected) }));
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    requireEdit(ctx);

    const body = await req.json();
    const parsed = interventionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.fullBenefitYear < parsed.data.implementationStartYear) {
      return NextResponse.json(
        { error: "Full benefit year must be ≥ implementation start year" },
        { status: 400 }
      );
    }

    const { scopesAffected, ...rest } = parsed.data;
    const intervention = await db.intervention.create({
      data: {
        companyId: ctx.companyId,
        ...rest,
        scopesAffected: JSON.stringify(scopesAffected),
      },
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      userId: ctx.userId,
      entityType: "intervention",
      entityId: intervention.id,
      action: "created",
      after: parsed.data,
    });

    return NextResponse.json(
      { data: { ...intervention, scopesAffected } },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[interventions POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
