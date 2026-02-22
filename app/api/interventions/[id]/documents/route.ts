import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
});

export async function POST(
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
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const doc = await db.interventionDocument.create({
      data: { interventionId: id, ...parsed.data },
    });
    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    requireEdit(ctx);

    const { id } = await params;
    const body = await req.json();
    const docId = z.string().parse(body.docId);

    // Verify ownership via intervention
    const doc = await db.interventionDocument.findFirst({
      where: { id: docId, interventionId: id },
      include: { intervention: { select: { companyId: true } } },
    });
    if (!doc || doc.intervention.companyId !== ctx.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.interventionDocument.delete({ where: { id: docId } });
    return NextResponse.json({ data: { id: docId } });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
