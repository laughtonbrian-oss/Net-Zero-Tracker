import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { apiHandler } from "@/lib/api-handler";
import { z } from "zod";

export const SITE_TYPES = ["office", "warehouse", "manufacturing", "retail", "data_centre", "other"] as const;

const schema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  siteType: z.enum(SITE_TYPES).optional(),
  grossFloorAreaM2: z.number().positive().optional(),
  yearBuilt: z.number().int().min(1800).max(2100).optional(),
  siteManager: z.string().optional(),
  notes: z.string().optional(),
});

export const GET = apiHandler(async () => {
  const ctx = await getTenantContext();
  const sites = await db.site.findMany({
    where: { companyId: ctx.companyId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: sites });
});

export const POST = apiHandler(async (req) => {
  const ctx = await getTenantContext();
  requireEdit(ctx);
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const site = await db.site.create({
    data: { companyId: ctx.companyId, ...parsed.data },
  });
  await writeAuditLog({
    companyId: ctx.companyId, userId: ctx.userId,
    entityType: "site", entityId: site.id,
    action: "created", before: null, after: site,
  });
  return NextResponse.json({ data: site }, { status: 201 });
});
