import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native Node.js addon — exclude from bundling
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
