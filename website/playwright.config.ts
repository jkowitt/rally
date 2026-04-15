import { defineConfig, devices } from '@playwright/test'

/**
 * Rally E2E smoke tests.
 *
 * Philosophy: a small suite (<20 tests) of PUBLIC-ROUTE checks that run on
 * every PR and catch the most common regressions:
 *   - lazy-loaded chunks failing to import (stale deploy cache)
 *   - routes 404'ing because the route table got out of sync with the lazy
 *     import list
 *   - public landing / pricing / digest pages failing to render any content
 *   - token-based pages (unsubscribe) handling bad tokens gracefully
 *
 * These intentionally do NOT require auth — CI has no test user. If you want
 * authenticated tests later, set PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD
 * and add a second project below.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3007',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // The app redirects /app/* to /login when unauthenticated, so we don't
    // follow auth state here.
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.CI
    ? {
        command: 'npm run build && npm run start',
        url: 'http://localhost:3007',
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : {
        command: 'npm run dev',
        url: 'http://localhost:3007',
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
