import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { apiHandler } from "@/lib/api-handler";
import { z } from "zod";

const scenarioSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
});

export const GET = apiHandler(async () => {
  const ctx = await getTenantContext();
  const scenarios = await db.scenario.findMany({
    where: { companyId: ctx.companyId },
    include: {
      interventions: {
        include: {
          intervention: { select: { id: true, name: true, category: true, totalReductionTco2e: true, scopesAffected: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ data: scenarios });
});

export const POST = apiHandler(async (req) => {
  const ctx = await getTenantContext();
  requireEdit(ctx);

  const body = await req.json();
  const parsed = scenarioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const scenario = await db.scenario.create({
    data: { companyId: ctx.companyId, ...parsed.data },
  });

  await writeAuditLog({
    companyId: ctx.companyId,
    userId: ctx.userId,
    entityType: "scenario",
    entityId: scenario.id,
    action: "created",
    after: parsed.data,
  });

  return NextResponse.json({ data: scenario }, { status: 201 });
});
