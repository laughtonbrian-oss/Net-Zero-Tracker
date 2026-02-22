import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const bodySchema = z.object({
  companyName: z.string().min(1),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If user already has a company, redirect to dashboard
    if (session.user.companyId) {
      return NextResponse.json({ error: "Already has company" }, { status: 400 });
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { companyName } = parsed.data;
    const baseSlug = slugify(companyName);

    // Ensure slug is unique
    let slug = baseSlug;
    let suffix = 0;
    while (await db.company.findUnique({ where: { slug } })) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }

    const company = await db.company.create({
      data: { name: companyName, slug, plan: "FREE" },
    });

    await db.user.update({
      where: { id: session.user.id },
      data: { companyId: company.id, role: "ADMIN" },
    });

    return NextResponse.json({ data: { companyId: company.id } });
  } catch (err) {
    console.error("Onboarding error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
