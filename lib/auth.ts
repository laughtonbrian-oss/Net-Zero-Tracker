import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const providers = [
  Credentials({
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const user = await db.user.findUnique({
        where: { email: parsed.data.email },
        include: { company: true },
      });

      if (!user || !user.password) return null;

      const passwordMatch = await bcrypt.compare(
        parsed.data.password,
        user.password
      );
      if (!passwordMatch) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        companyId: user.companyId,
        role: user.role,
      };
    },
  }),
];

// Only add Microsoft Entra ID if credentials are configured
if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entraConfig: any = {
    clientId: process.env.AZURE_AD_CLIENT_ID,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
  };
  if (process.env.AZURE_AD_TENANT_ID) {
    entraConfig.issuer = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providers.push(MicrosoftEntraID(entraConfig) as any);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    async jwt({ token, user, account: _account }) {
      if (user) {
        token.companyId = (user as { companyId?: string | null }).companyId ?? null;
        token.role = (user as { role?: string }).role ?? "VIEWER";
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.companyId = token.companyId as string | null;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
