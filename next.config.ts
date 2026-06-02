import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native / Node-only packages out of the bundler so they load at runtime.
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "@prisma/client",
    "yahoo-finance2",
  ],
};

export default nextConfig;
