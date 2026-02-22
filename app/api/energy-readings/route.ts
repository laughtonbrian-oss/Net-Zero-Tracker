import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";

const bodySchema = z.object({
  siteId: z.string(),
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  energyType: z.string(),
  kWh: z.number().nonnegative(),
  cost: z.number().optional(),
});

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext();
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");
    const year = searchParams.get("year");

    const where: Record<string, unknown> = { companyId: ctx.companyId };
    if (siteId) where.siteId = siteId;
    if (year) where.year = parseInt(year);

    const readings = await db.energyReading.findMany({
      where,
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: { site: { select: { id: true, name: true, country: true } } },
    });
    return NextResponse.json({ data: readings });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext();
    requireEdit(ctx);

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Validate site belongs to tenant
    const site = await db.site.findFirst({
      where: { id: parsed.data.siteId, companyId: ctx.companyId },
    });
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const { siteId, year, month, energyType, kWh, cost } = parsed.data;

    const record = await db.energyReading.upsert({
      where: {
        companyId_siteId_year_month_energyType: {
          companyId: ctx.companyId,
          siteId,
          year,
          month,
          energyType,
        },
      },
      create: { companyId: ctx.companyId, siteId, year, month, energyType, kWh, cost },
      update: { kWh, cost },
      include: { site: { select: { id: true, name: true, country: true } } },
    });

    return NextResponse.json({ data: record });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
