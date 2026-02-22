import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

export type TenantContext = {
  userId: string;
  companyId: string;
  role: Role;
};

/**
 * Call this at the top of every API route handler.
 * Returns tenant context from the session, or throws a Response with 401/403.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!session.user.companyId) {
    throw new Response(
      JSON.stringify({ error: "No company associated with this account" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    role: session.user.role as Role,
  };
}
