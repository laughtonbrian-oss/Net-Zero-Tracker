import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    requireEdit(ctx);

    const { id } = await params;

    const factor = await db.companyEmissionFactor.findFirst({
      where: { id, companyId: ctx.companyId },
    });
    if (!factor) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.companyEmissionFactor.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
