import { defineConfig } from "@playwright/test";

export default defineConfig({
  timeout: 30000,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:4321",
    viewport: {
      width: 1440,
      height: 1200,
    },
  },
  webServer: {
    command: "pnpm dev --host 127.0.0.1 --port 4321",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
