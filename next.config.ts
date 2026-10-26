import type { NextConfig } from "next";
import { getAllowedDevOrigins } from "./lib/dev-origins";

const config: NextConfig = {
  allowedDevOrigins: getAllowedDevOrigins({
    CODESPACE_NAME: process.env.CODESPACE_NAME,
    GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:
      process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN,
    PORT: process.env.PORT,
  }),
};
export default config;
