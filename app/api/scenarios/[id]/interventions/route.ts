import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const upsertSchema = z.object({
  interventionId: z.string(),
  startYear: z.number().int().min(1900).max(2100),
  endYear: z.number().int().min(1900).max(2100).optional(),
  startQuarter: z.number().int().min(1).max(4).optional(),
  endQuarter: z.number().int().min(1).max(4).optional(),
  implementationPacePctPerYear: z.number().min(0).max(100).optional(),
  executionPct: z.number().min(0).max(100).default(100),
  technicalAssetLife: z.number().int().positive().optional(),
  financialLifetime: z.number().int().positive().optional(),
  capex: z.number().nonnegative().optional(),
  opex: z.number().nonnegative().optional(),
  externalFunding: z.number().nonnegative().optional(),
  personnelTimeDays: z.number().nonnegative().optional(),
  personnelRatePerDay: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

async function assertScenarioBelongsToTenant(
  scenarioId: string,
  companyId: string
) {
  const scenario = await db.scenario.findFirst({
    where: { id: scenarioId, companyId },
  });
  if (!scenario) {
    throw new Response(JSON.stringify({ error: "Scenario not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return scenario;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    requireEdit(ctx);

    const { id: scenarioId } = await params;
    await assertScenarioBelongsToTenant(scenarioId, ctx.companyId);

    const body = await req.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Verify the intervention also belongs to this tenant
    const intervention = await db.intervention.findFirst({
      where: { id: parsed.data.interventionId, companyId: ctx.companyId },
    });
    if (!intervention) {
      return NextResponse.json({ error: "Intervention not found" }, { status: 404 });
    }

    const { interventionId, ...rest } = parsed.data;
    const si = await db.scenarioIntervention.upsert({
      where: { scenarioId_interventionId: { scenarioId, interventionId } },
      create: { scenarioId, interventionId, ...rest },
      update: rest,
    });

    return NextResponse.json({ data: si }, { status: 200 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[scenario interventions POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const patchSchema = z.object({
  interventionId: z.string(),
  startYear: z.number().int().min(1900).max(2100).optional(),
  endYear: z.number().int().min(1900).max(2100).nullable().optional(),
  startQuarter: z.number().int().min(1).max(4).nullable().optional(),
  endQuarter: z.number().int().min(1).max(4).nullable().optional(),
  implementationPacePctPerYear: z.number().min(0).max(100).nullable().optional(),
  executionPct: z.number().min(0).max(100).optional(),
  technicalAssetLife: z.number().int().positive().nullable().optional(),
  financialLifetime: z.number().int().positive().nullable().optional(),
  capex: z.number().nonnegative().nullable().optional(),
  opex: z.number().nonnegative().nullable().optional(),
  externalFunding: z.number().nonnegative().nullable().optional(),
  personnelTimeDays: z.number().nonnegative().nullable().optional(),
  personnelRatePerDay: z.number().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    requireEdit(ctx);

    const { id: scenarioId } = await params;
    await assertScenarioBelongsToTenant(scenarioId, ctx.companyId);

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { interventionId, ...updates } = parsed.data;
    const existing = await db.scenarioIntervention.findFirst({
      where: { scenarioId, interventionId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Scenario intervention not found" }, { status: 404 });
    }
    const si = await db.scenarioIntervention.update({
      where: { scenarioId_interventionId: { scenarioId, interventionId } },
      data: updates,
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      userId: ctx.userId,
      entityType: "scenarioIntervention",
      entityId: existing.id,
      action: "updated",
      before: existing,
      after: updates,
    });

    return NextResponse.json({ data: si });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[scenario interventions PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    requireEdit(ctx);

    const { id: scenarioId } = await params;
    await assertScenarioBelongsToTenant(scenarioId, ctx.companyId);

    // Use query param to avoid body-on-DELETE proxy stripping issues
    const { searchParams } = new URL(req.url);
    const interventionId = searchParams.get("interventionId");
    if (!interventionId) {
      return NextResponse.json({ error: "interventionId query param required" }, { status: 400 });
    }

    const existing = await db.scenarioIntervention.findFirst({
      where: { scenarioId, interventionId },
    });

    await db.scenarioIntervention.deleteMany({
      where: { scenarioId, interventionId },
    });

    if (existing) {
      await writeAuditLog({
        companyId: ctx.companyId,
        userId: ctx.userId,
        entityType: "scenarioIntervention",
        entityId: existing.id,
        action: "deleted",
        before: existing,
      });
    }

    return NextResponse.json({ data: { removed: true } });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
