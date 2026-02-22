import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";

const registerSchema = z.object({
  companyName: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let i = 0;
  while (await db.company.findUnique({ where: { slug } })) {
    slug = `${slugify(base)}-${++i}`;
  }
  return slug;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { companyName, name, email, password } = parsed.data;

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const slug = await uniqueSlug(companyName);
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create company and first user (Admin) in a transaction
    const result = await db.$transaction(async (tx) => {
      let company;
      try {
        company = await tx.company.create({
          data: { name: companyName, slug },
        });
      } catch {
        // Unique constraint on slug — regenerate with timestamp suffix
        company = await tx.company.create({
          data: { name: companyName, slug: `${slug}-${Date.now()}` },
        });
      }

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          name,
          email,
          password: hashedPassword,
          role: "ADMIN", // First user is always Admin
        },
      });

      return { company, user };
    });

    return NextResponse.json(
      { message: "Account created", companyId: result.company.id },
      { status: 201 }
    );
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
