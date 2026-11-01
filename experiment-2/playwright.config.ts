import { defineConfig, devices } from '@playwright/test';

// Set BASE_URL to test a running deployment, such as the Docker container.
const baseURL = process.env.BASE_URL ?? 'http://localhost:4173';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], baseURL },
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'npm run build && npm run preview', url: baseURL, reuseExistingServer: true },
});
