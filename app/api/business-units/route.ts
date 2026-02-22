import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireAdmin } from "@/lib/permissions";
import { z } from "zod";

const schema = z.object({ name: z.string().min(1).max(200) });

export async function GET() {
  try {
    const ctx = await getTenantContext();
    const units = await db.businessUnit.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: units });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    requireAdmin(ctx);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const unit = await db.businessUnit.create({
      data: { companyId: ctx.companyId, ...parsed.data },
    });
    return NextResponse.json({ data: unit }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
