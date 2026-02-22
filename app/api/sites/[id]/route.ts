import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { SITE_TYPES } from "../route";

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  siteType: z.enum(SITE_TYPES).nullable().optional(),
  grossFloorAreaM2: z.number().positive().nullable().optional(),
  yearBuilt: z.number().int().min(1800).max(2100).nullable().optional(),
  siteManager: z.string().optional(),
  notes: z.string().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext();
    requireEdit(ctx);
    const { id } = await params;
    const existing = await db.site.findFirst({ where: { id, companyId: ctx.companyId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const site = await db.site.update({ where: { id }, data: parsed.data });
    await writeAuditLog({
      companyId: ctx.companyId, userId: ctx.userId,
      entityType: "site", entityId: id,
      action: "updated", before: existing, after: site,
    });
    return NextResponse.json({ data: site });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext();
    requireEdit(ctx);
    const { id } = await params;
    const existing = await db.site.findFirst({ where: { id, companyId: ctx.companyId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.site.delete({ where: { id } });
    await writeAuditLog({
      companyId: ctx.companyId, userId: ctx.userId,
      entityType: "site", entityId: id,
      action: "deleted", before: existing, after: null,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
