import { defineConfig } from "@playwright/test";
import { computers } from "./e2e/servers.js";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.js",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `https://127.0.0.1:${computers.alpha.port}`,
    // Each test server has its own self-signed certificate, like a real computer before a proxy.
    ignoreHTTPSErrors: true,
    browserName: "chromium",
    // CHROMIUM_PATH points at an already installed Chromium; otherwise run `npx playwright install chromium`.
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
    trace: "retain-on-failure",
  },
  outputDir: "e2e/.results",
});
