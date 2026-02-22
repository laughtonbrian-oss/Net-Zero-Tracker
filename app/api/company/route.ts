import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireAdmin } from "@/lib/permissions";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  logo: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const ctx = await getTenantContext();
    const company = await db.company.findUnique({
      where: { id: ctx.companyId },
      select: { id: true, name: true, slug: true, plan: true, logo: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    return NextResponse.json({ data: company });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getTenantContext();
    requireAdmin(ctx);

    const json = await request.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.logo !== undefined) updateData.logo = parsed.data.logo;

    const company = await db.company.update({
      where: { id: ctx.companyId },
      data: updateData,
      select: { id: true, name: true, slug: true, plan: true, logo: true },
    });

    return NextResponse.json({ data: company });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
