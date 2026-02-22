import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";

const bodySchema = z.object({
  year: z.number().int(),
  scope1: z.number().default(0),
  scope2: z.number().default(0),
  scope3: z.number().default(0),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const ctx = await getTenantContext();
    const emissions = await db.actualEmission.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { year: "asc" },
    });
    return NextResponse.json({ data: emissions });
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

    const { year, scope1, scope2, scope3, notes } = parsed.data;

    const record = await db.actualEmission.upsert({
      where: { companyId_year: { companyId: ctx.companyId, year } },
      create: { companyId: ctx.companyId, year, scope1, scope2, scope3, notes },
      update: { scope1, scope2, scope3, notes },
    });

    return NextResponse.json({ data: record });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
