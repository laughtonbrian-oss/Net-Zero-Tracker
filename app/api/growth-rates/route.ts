import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";

const growthRateSchema = z.object({
  fromYear: z.number().int(),
  toYear: z.number().int(),
  ratePct: z.number(),
});

const putSchema = z.object({
  baselineId: z.string(),
  rates: z.array(growthRateSchema),
});

export async function GET() {
  try {
    const ctx = await getTenantContext();

    const baseline = await db.baseline.findFirst({
      where: { companyId: ctx.companyId },
      include: { growthRates: { orderBy: { fromYear: "asc" } } },
    });

    if (!baseline) {
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: baseline.growthRates });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const ctx = await getTenantContext();
    requireEdit(ctx);

    const json = await request.json();
    const parsed = putSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { baselineId, rates } = parsed.data;

    // Verify baseline belongs to tenant
    const baseline = await db.baseline.findFirst({
      where: { id: baselineId, companyId: ctx.companyId },
    });
    if (!baseline) {
      return NextResponse.json({ error: "Baseline not found" }, { status: 404 });
    }

    // Replace all growth rates
    await db.growthRate.deleteMany({ where: { baselineId } });
    const created = await db.growthRate.createMany({
      data: rates.map((r) => ({ baselineId, ...r })),
    });

    return NextResponse.json({ data: { count: created.count } });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
