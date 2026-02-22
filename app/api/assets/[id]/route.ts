import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  siteId: z.string().optional(),
  name: z.string().min(1).max(200).optional(),
  assetType: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(100).optional(),
  conditionRating: z.enum(["RED", "AMBER", "GREEN"]).optional(),
  conditionNotes: z.string().optional().nullable(),
  installationYear: z.number().int().optional(),
  expectedUsefulLife: z.number().int().positive().optional(),
  currentEnergyKwh: z.number().nonnegative().optional().nullable(),
  scope: z.number().int().min(1).max(3).optional(),
  linkedInterventionId: z.string().optional().nullable(),
  alertThresholdYears: z.number().int().min(0).optional(),
  replacementPriority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    requireEdit(ctx);
    const { id } = await params;
    const existing = await db.asset.findFirst({ where: { id, companyId: ctx.companyId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const updated = await db.asset.update({
      where: { id },
      data: parsed.data,
      include: { site: { select: { id: true, name: true } }, linkedIntervention: { select: { id: true, name: true } } },
    });

    await writeAuditLog({ companyId: ctx.companyId, userId: ctx.userId, entityType: "asset", entityId: id, action: "updated", before: existing, after: parsed.data });
    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    requireEdit(ctx);
    const { id } = await params;
    const existing = await db.asset.findFirst({ where: { id, companyId: ctx.companyId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db.asset.delete({ where: { id } });
    await writeAuditLog({ companyId: ctx.companyId, userId: ctx.userId, entityType: "asset", entityId: id, action: "deleted", before: existing });
    return NextResponse.json({ data: { id } });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
