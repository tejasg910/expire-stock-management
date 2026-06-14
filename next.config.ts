import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["@neondatabase/serverless", "postgres"],
};

export default nextConfig;
