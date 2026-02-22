import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  scopeCombination: z.enum(["1", "2", "3", "1+2", "1+2+3"]).optional(),
  targetYear: z.number().int().min(2000).max(2100).optional(),
  reductionPct: z.number().min(0).max(100).optional(),
  isInterim: z.boolean().optional(),
  isSbtiAligned: z.boolean().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    requireEdit(ctx);

    const { id } = await params;
    const existing = await db.target.findFirst({
      where: { id, companyId: ctx.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await db.target.update({
      where: { id },
      data: parsed.data,
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      userId: ctx.userId,
      entityType: "target",
      entityId: id,
      action: "updated",
      before: existing,
      after: parsed.data,
    });

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
    const existing = await db.target.findFirst({
      where: { id, companyId: ctx.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.target.delete({ where: { id } });

    await writeAuditLog({
      companyId: ctx.companyId,
      userId: ctx.userId,
      entityType: "target",
      entityId: id,
      action: "deleted",
      before: existing,
    });

    return NextResponse.json({ data: { id } });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
