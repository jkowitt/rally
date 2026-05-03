import { test as base, expect, type Page } from '@playwright/test'

// Authenticated test fixture.
//
// Skips the test suite entirely if PLAYWRIGHT_TEST_EMAIL +
// PLAYWRIGHT_TEST_PASSWORD aren't set — keeps CI green when the
// repo is checked out by anyone who doesn't have a test account.
//
// To enable locally:
//   export PLAYWRIGHT_TEST_EMAIL=qa+yourtest@yourdomain.com
//   export PLAYWRIGHT_TEST_PASSWORD=longRandomStringHere
//   npm run test:e2e tests/e2e/authenticated
//
// CI: add the same vars to GitHub Actions secrets and reference
// them in .github/workflows/playwright.yml.

const testEmail = process.env.PLAYWRIGHT_TEST_EMAIL
const testPassword = process.env.PLAYWRIGHT_TEST_PASSWORD

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    if (!testEmail || !testPassword) {
      test.skip(true, 'PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD not set — skipping authed tests.')
      await use(page)
      return
    }

    await page.goto('/login')
    await page.locator('input[type="email"]').fill(testEmail)
    await page.locator('input[type="password"]').fill(testPassword)
    await page.getByRole('button', { name: /sign in/i }).click()

    // Sign-in completes when the URL becomes /app/*
    await page.waitForURL(/\/app(\/|$)/, { timeout: 30_000 })
    await use(page)
  },
})

export { expect }
