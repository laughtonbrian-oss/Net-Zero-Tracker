import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecrypt } from "jose";
import { hkdf } from "@panva/hkdf";

/**
 * Lightweight edge-compatible middleware that checks the NextAuth v5 JWT
 * session cookie without importing the full auth config (which pulls in
 * Prisma, bcrypt, @libsql/client and blows past the 1 MB edge limit).
 *
 * NextAuth v5 encrypts its JWT with A256CBC-HS512 using a key derived
 * from AUTH_SECRET via HKDF. We replicate that derivation here with jose.
 */

const PUBLIC_PATHS = ["/login", "/register", "/api/auth", "/onboarding"];
// NextAuth v5 uses __Secure- prefix on HTTPS (production) and plain name on HTTP (dev)
const COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
];

async function getDerivedKey(secret: string): Promise<Uint8Array> {
  return hkdf(
    "sha256",
    secret,
    "",
    "Auth.js Generated Encryption Key",
    64
  );
}

async function getToken(req: NextRequest): Promise<{ companyId?: string | null } | null> {
  // Try both cookie names: __Secure- prefix (HTTPS/production) first, then plain (HTTP/dev)
  let cookie: string | undefined;
  for (const name of COOKIE_NAMES) {
    cookie = req.cookies.get(name)?.value;
    if (cookie) break;
  }
  if (!cookie) return null;

  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  try {
    const key = await getDerivedKey(secret);
    const { payload } = await jwtDecrypt(cookie, key, {
      clockTolerance: 15,
    });
    return payload as { companyId?: string | null };
  } catch {
    return null;
  }
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getToken(req);

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated but no company, redirect to onboarding (for OAuth users)
  if (!token.companyId && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|leaflet|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
