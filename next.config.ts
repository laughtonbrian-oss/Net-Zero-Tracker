import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma and bcrypt server-side only — prevents bundling node: modules into client/edge
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
