import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { apiHandler } from "@/lib/api-handler";
import { z } from "zod";

const entrySchema = z.object({
  scope: z.number().int().min(1).max(3),
  category: z.string().min(1),
  emissionsTco2e: z.number().nonnegative(),
});

const growthRateSchema = z.object({
  fromYear: z.number().int().min(1900).max(2100),
  toYear: z.number().int().min(1900).max(2100),
  ratePct: z.number().min(-100).max(100),
});

const baselineSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  growthRatePct: z.number().min(-100).max(100).default(0),
  entries: z.array(entrySchema).min(1),
  growthRates: z.array(growthRateSchema).optional().default([]),
});

export const GET = apiHandler(async () => {
  const ctx = await getTenantContext();
  const baseline = await db.baseline.findFirst({
    where: { companyId: ctx.companyId },
    include: {
      entries: { orderBy: [{ scope: "asc" }, { category: "asc" }] },
      growthRates: { orderBy: { fromYear: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: baseline });
});

export const POST = apiHandler(async (req) => {
  const ctx = await getTenantContext();
  requireEdit(ctx);

  const body = await req.json();
  const parsed = baselineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { year, growthRatePct, entries, growthRates } = parsed.data;

  const existing = await db.baseline.findFirst({
    where: { companyId: ctx.companyId },
  });

  const baseline = await db.$transaction(async (tx) => {
    if (existing) {
      // Explicitly include companyId as defence-in-depth against cross-tenant deletion
      await tx.baselineEntry.deleteMany({
        where: { baselineId: existing.id, baseline: { companyId: ctx.companyId } },
      });
      await tx.growthRate.deleteMany({
        where: { baselineId: existing.id, baseline: { companyId: ctx.companyId } },
      });
      if (growthRates.length > 0) {
        await tx.growthRate.createMany({
          data: growthRates.map((gr) => ({ baselineId: existing.id, ...gr })),
        });
      }
      return tx.baseline.update({
        where: { id: existing.id },
        data: { year, growthRatePct, entries: { create: entries } },
        include: {
          entries: true,
          growthRates: { orderBy: { fromYear: "asc" } },
        },
      });
    }
    return tx.baseline.create({
      data: {
        companyId: ctx.companyId,
        year,
        growthRatePct,
        entries: { create: entries },
        growthRates: { create: growthRates },
      },
      include: {
        entries: true,
        growthRates: { orderBy: { fromYear: "asc" } },
      },
    });
  });

  await writeAuditLog({
    companyId: ctx.companyId,
    userId: ctx.userId,
    entityType: "baseline",
    entityId: baseline.id,
    action: existing ? "updated" : "created",
    after: { year, growthRatePct, entryCount: entries.length, growthRateCount: growthRates.length },
  });

  return NextResponse.json({ data: baseline }, { status: existing ? 200 : 201 });
});
