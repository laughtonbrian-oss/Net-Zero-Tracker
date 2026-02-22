import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(100),
});

export async function PATCH(req: Request) {
  try {
    const ctx = await getTenantContext();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const before = await db.user.findUnique({ where: { id: ctx.userId } });
    const updated = await db.user.update({
      where: { id: ctx.userId },
      data: { name: parsed.data.name },
      select: { id: true, name: true, email: true, role: true },
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      userId: ctx.userId,
      entityType: "user",
      entityId: ctx.userId,
      action: "updated",
      before: { name: before?.name },
      after: { name: updated.name },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
