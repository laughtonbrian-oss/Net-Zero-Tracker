import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const targetSchema = z.object({
  label: z.string().min(1).max(200),
  scopeCombination: z.enum(["1", "2", "3", "1+2", "1+2+3"]),
  targetYear: z.number().int().min(2000).max(2100),
  reductionPct: z.number().min(0).max(100),
  isInterim: z.boolean().default(false),
  isSbtiAligned: z.boolean().default(false),
});

export async function GET() {
  try {
    const ctx = await getTenantContext();
    const targets = await db.target.findMany({
      where: { companyId: ctx.companyId },
      orderBy: [{ targetYear: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ data: targets });
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
    const parsed = targetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const target = await db.target.create({
      data: { companyId: ctx.companyId, ...parsed.data },
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      userId: ctx.userId,
      entityType: "target",
      entityId: target.id,
      action: "created",
      after: parsed.data,
    });

    return NextResponse.json({ data: target }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[targets POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
