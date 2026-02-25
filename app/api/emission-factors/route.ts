import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";
import { apiHandler } from "@/lib/api-handler";

const bodySchema = z.object({
  region: z.string(),
  fuelType: z.string(),
  value: z.number().positive(),
  source: z.string(),
  year: z.number().int(),
});

export const GET = apiHandler(async () => {
  const ctx = await getTenantContext();
  const factors = await db.companyEmissionFactor.findMany({
    where: { companyId: ctx.companyId },
    orderBy: [{ region: "asc" }, { fuelType: "asc" }],
  });
  return NextResponse.json({ data: factors });
});

export const POST = apiHandler(async (request) => {
  const ctx = await getTenantContext();
  requireEdit(ctx);

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { region, fuelType, value, source, year } = parsed.data;

  const record = await db.companyEmissionFactor.upsert({
    where: {
      companyId_region_fuelType: {
        companyId: ctx.companyId,
        region,
        fuelType,
      },
    },
    create: { companyId: ctx.companyId, region, fuelType, value, source, year },
    update: { value, source, year },
  });

  return NextResponse.json({ data: record });
});
