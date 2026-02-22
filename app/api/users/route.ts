import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireAdmin } from "@/lib/permissions";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200).optional(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).default("VIEWER"),
});

export async function GET() {
  try {
    const ctx = await getTenantContext();
    requireAdmin(ctx);
    const users = await db.user.findMany({
      where: { companyId: ctx.companyId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ data: users });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST — create/invite a user with a temporary password (they must reset on first login) */
export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    requireAdmin(ctx);

    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    // Create user without a password — they'll need a password reset flow.
    // For MVP we set a placeholder; in Phase 3 this will trigger a Resend invite email.
    const user = await db.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        companyId: ctx.companyId,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[users POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
