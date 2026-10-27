import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";
const privateTestDirectory = (process.env.HOME_VIEW_TEST_DATA_DIR ||=
  mkdtempSync(join(tmpdir(), "home-view-browser-")));
export default defineConfig({
  globalSetup: "./tests/browser/private-setup.ts",
  testDir: "./tests/browser",
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      args: [
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    env: {
      HOME_VIEW_DATA_DIR: privateTestDirectory,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    timeout: 60000,
  },
});
