import { defineConfig, devices } from '@playwright/test';

const clientPort = process.env.E2E_CLIENT_PORT ?? '8080';
const serverPort = process.env.E2E_SERVER_PORT ?? '3001';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 180_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://127.0.0.1:${clientPort}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: 'pnpm --filter aniquizz-server dev',
          url: `http://127.0.0.1:${serverPort}/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: 'pnpm --filter aniquizz-client dev',
          url: `http://127.0.0.1:${clientPort}`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});
