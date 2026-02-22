import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireAdmin } from "@/lib/permissions";
import { z } from "zod";

const updateSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    requireAdmin(ctx);

    const { id } = await params;

    // Prevent demoting yourself
    if (id === ctx.userId) {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
    }

    const target = await db.user.findFirst({ where: { id, companyId: ctx.companyId } });
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await db.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return NextResponse.json({ data: updated });
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
    requireAdmin(ctx);

    const { id } = await params;

    if (id === ctx.userId) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

    const target = await db.user.findFirst({ where: { id, companyId: ctx.companyId } });
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.user.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
