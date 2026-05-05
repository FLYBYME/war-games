import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests/e2e',
  testMatch: /.*\.v2\.test\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'NODE_ENV=test npm run server',
      url: 'http://127.0.0.1:3000/api/database/profiles',
      reuseExistingServer: true,
    },
    {
      command: 'npm run ui:v2',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: true,
    }
  ],
});
