import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  category: z.string().min(1).max(100).optional(),
  scopesAffected: z.array(z.number().int().min(1).max(3)).min(1).optional(),
  totalReductionTco2e: z.number().positive().optional(),
  implementationStartYear: z.number().int().min(1900).max(2100).optional(),
  fullBenefitYear: z.number().int().min(1900).max(2100).optional(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "ABANDONED"]).optional(),
  owner: z.string().optional(),
  siteId: z.string().optional(),
  businessUnitId: z.string().optional(),
});

function parseScopes(raw: string): number[] {
  try { return JSON.parse(raw); } catch { return []; }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    const { id } = await params;
    const row = await db.intervention.findFirst({
      where: { id, companyId: ctx.companyId },
      include: {
        annualReductions: { orderBy: { year: "asc" } },
        documents: true,
        site: true,
        businessUnit: true,
      },
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { ...row, scopesAffected: parseScopes(row.scopesAffected) } });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { scopesAffected, ...rest } = parsed.data;
    const updated = await db.intervention.update({
      where: { id },
      data: {
        ...rest,
        ...(scopesAffected !== undefined
          ? { scopesAffected: JSON.stringify(scopesAffected) }
          : {}),
      },
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      userId: ctx.userId,
      entityType: "intervention",
      entityId: id,
      action: "updated",
      before: { ...existing, scopesAffected: parseScopes(existing.scopesAffected) },
      after: parsed.data,
    });

    return NextResponse.json({
      data: {
        ...updated,
        scopesAffected: scopesAffected ?? parseScopes(updated.scopesAffected),
      },
    });
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
    const existing = await db.intervention.findFirst({
      where: { id, companyId: ctx.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.intervention.delete({ where: { id } });

    await writeAuditLog({
      companyId: ctx.companyId,
      userId: ctx.userId,
      entityType: "intervention",
      entityId: id,
      action: "deleted",
      before: { ...existing, scopesAffected: parseScopes(existing.scopesAffected) },
    });

    return NextResponse.json({ data: { id } });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
