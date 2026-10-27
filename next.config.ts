import type { NextConfig } from "next";
import { getAllowedDevOrigins } from "./lib/dev-origins";

const config: NextConfig = {
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
      {
        source: "/privado",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
  allowedDevOrigins: getAllowedDevOrigins({
    CODESPACE_NAME: process.env.CODESPACE_NAME,
    GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:
      process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN,
    PORT: process.env.PORT,
  }),
};
export default config;
