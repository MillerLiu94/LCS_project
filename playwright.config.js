import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:5500/LCS_project/",
    browserName: "chromium",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5500/LCS_project/index.html",
    reuseExistingServer: !process.env.CI,
  },
});
