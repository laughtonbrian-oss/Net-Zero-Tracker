import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      companyId: string | null;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    companyId?: string | null;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    companyId?: string | null;
    role?: string;
  }
}
