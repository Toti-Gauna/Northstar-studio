import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90000,
  expect: { timeout: 15000 },
  workers: 1,
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    viewport: process.env.DEMO_VIDEO
      ? { width: 1280, height: 800 }
      : { width: 1440, height: 1000 },
    video: process.env.DEMO_VIDEO
      ? { mode: "on", size: { width: 1280, height: 800 } }
      : "off",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    },
  },
  webServer: [
    {
      command: "npm run start -w @northstar/api",
      url: "http://localhost:4000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: "node scripts/serve-static.mjs",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
