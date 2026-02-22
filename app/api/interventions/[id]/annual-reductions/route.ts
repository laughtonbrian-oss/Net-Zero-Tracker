import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";
import { z } from "zod";

const rowSchema = z.object({ year: z.number().int(), tco2eReduction: z.number() });
const bodySchema = z.object({ rows: z.array(rowSchema) });

/** PUT /api/interventions/[id]/annual-reductions — replaces all rows */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    requireEdit(ctx);

    const { id } = await params;
    const existing = await db.intervention.findFirst({
      where: { id, companyId: ctx.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Delete all then recreate in a transaction
    await db.$transaction([
      db.interventionAnnualReduction.deleteMany({ where: { interventionId: id } }),
      ...parsed.data.rows.map((r) =>
        db.interventionAnnualReduction.create({
          data: { interventionId: id, year: r.year, tco2eReduction: r.tco2eReduction },
        })
      ),
    ]);

    const rows = await db.interventionAnnualReduction.findMany({
      where: { interventionId: id },
      orderBy: { year: "asc" },
    });
    return NextResponse.json({ data: rows });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[annual-reductions PUT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
