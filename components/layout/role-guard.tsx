"use client";

import { useSession } from "next-auth/react";
import type { Role } from "@prisma/client";

type Props = {
  allow: Role | Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/**
 * Renders children only when the current user's role is in the allow list.
 * Use this for UI-level guards. Server-side guards still exist in API routes.
 */
export function RoleGuard({ allow, children, fallback = null }: Props) {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  if (!role) return <>{fallback}</>;
  const allowed = Array.isArray(allow) ? allow : [allow];
  return allowed.includes(role) ? <>{children}</> : <>{fallback}</>;
}
