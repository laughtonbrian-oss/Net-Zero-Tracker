import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const assetSchema = z.object({
  siteId: z.string().min(1),
  name: z.string().min(1).max(200),
  assetType: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  conditionRating: z.enum(["RED", "AMBER", "GREEN"]).default("AMBER"),
  conditionNotes: z.string().optional(),
  installationYear: z.number().int().min(1900).max(2100),
  expectedUsefulLife: z.number().int().positive(),
  currentEnergyKwh: z.number().nonnegative().optional(),
  scope: z.number().int().min(1).max(3),
  linkedInterventionId: z.string().optional(),
  alertThresholdYears: z.number().int().min(0).default(3),
  replacementPriority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
});

export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");
    const assets = await db.asset.findMany({
      where: { companyId: ctx.companyId, ...(siteId ? { siteId } : {}) },
      include: {
        site: { select: { id: true, name: true } },
        linkedIntervention: { select: { id: true, name: true } },
      },
      orderBy: [{ siteId: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ data: assets });
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
    const parsed = assetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Verify site belongs to tenant
    const site = await db.site.findFirst({ where: { id: parsed.data.siteId, companyId: ctx.companyId } });
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const asset = await db.asset.create({
      data: { companyId: ctx.companyId, ...parsed.data },
      include: { site: { select: { id: true, name: true } }, linkedIntervention: { select: { id: true, name: true } } },
    });

    await writeAuditLog({ companyId: ctx.companyId, userId: ctx.userId, entityType: "asset", entityId: asset.id, action: "created", after: parsed.data });
    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
