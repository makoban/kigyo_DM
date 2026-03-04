import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/generate-jpg": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/cron/generate-jpgs": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
