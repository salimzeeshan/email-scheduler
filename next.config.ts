import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose", "googleapis", "node-cron"],
  outputFileTracingRoot: __dirname,
  generateBuildId: async () => process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || "local-build",
};

export default nextConfig;
