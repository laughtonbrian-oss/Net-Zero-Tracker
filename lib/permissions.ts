import { Role } from "@prisma/client";
import type { TenantContext } from "@/lib/tenant";

export function canEdit(ctx: TenantContext): boolean {
  return ctx.role === Role.ADMIN || ctx.role === Role.EDITOR;
}

export function canAdmin(ctx: TenantContext): boolean {
  return ctx.role === Role.ADMIN;
}

export function requireEdit(ctx: TenantContext): void {
  if (!canEdit(ctx)) {
    throw new Response(
      JSON.stringify({ error: "Forbidden: editor role required" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
}

export function requireAdmin(ctx: TenantContext): void {
  if (!canAdmin(ctx)) {
    throw new Response(
      JSON.stringify({ error: "Forbidden: admin role required" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
}
