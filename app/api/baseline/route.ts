import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const entrySchema = z.object({
  scope: z.number().int().min(1).max(3),
  category: z.string().min(1),
  emissionsTco2e: z.number().nonnegative(),
});

const baselineSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  growthRatePct: z.number().min(-100).max(100).default(0),
  entries: z.array(entrySchema).min(1),
});

export async function GET() {
  try {
    const ctx = await getTenantContext();
    const baseline = await db.baseline.findFirst({
      where: { companyId: ctx.companyId },
      include: { entries: { orderBy: [{ scope: "asc" }, { category: "asc" }] } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: baseline });
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
    const parsed = baselineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { year, growthRatePct, entries } = parsed.data;

    // Replace existing baseline (upsert)
    const existing = await db.baseline.findFirst({
      where: { companyId: ctx.companyId },
    });

    const baseline = await db.$transaction(async (tx) => {
      if (existing) {
        await tx.baselineEntry.deleteMany({ where: { baselineId: existing.id } });
        return tx.baseline.update({
          where: { id: existing.id },
          data: {
            year,
            growthRatePct,
            entries: { create: entries },
          },
          include: { entries: true },
        });
      }
      return tx.baseline.create({
        data: {
          companyId: ctx.companyId,
          year,
          growthRatePct,
          entries: { create: entries },
        },
        include: { entries: true },
      });
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      userId: ctx.userId,
      entityType: "baseline",
      entityId: baseline.id,
      action: existing ? "updated" : "created",
      after: { year, growthRatePct, entryCount: entries.length },
    });

    return NextResponse.json({ data: baseline }, { status: existing ? 200 : 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[baseline POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
