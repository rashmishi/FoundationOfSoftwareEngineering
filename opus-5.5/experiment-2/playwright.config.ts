import { defineConfig, devices } from '@playwright/test';

// Set BASE_URL to test a running deployment, such as the Docker container.
const baseURL = process.env.BASE_URL ?? 'http://localhost:4173';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], baseURL },
  // Every test runs twice: once for people who ask for less motion, and once with animation on.
  projects: [
    { name: 'reduced-motion', use: { contextOptions: { reducedMotion: 'reduce' } } },
    { name: 'full-motion', use: { contextOptions: { reducedMotion: 'no-preference' } } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'npm run build && npm run preview', url: baseURL, reuseExistingServer: true },
});
