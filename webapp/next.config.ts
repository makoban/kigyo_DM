import type { NextConfig } from "next";
import pkg from "./package.json" with { type: "json" };

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/generate-jpg": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/cron/generate-jpgs": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
};

export default nextConfig;
