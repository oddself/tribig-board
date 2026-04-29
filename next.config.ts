import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // We allow all origins in dev to support localtunnel/ngrok sharing
  allowedDevOrigins: ["*"],
  serverExternalPackages: ["node:fs", "node:path"],
  turbopack: {
    root: projectRoot
  }
};


export default nextConfig;
