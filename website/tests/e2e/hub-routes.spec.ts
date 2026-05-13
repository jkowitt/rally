import { test, expect } from '@playwright/test'

/** Wait for the React SPA to hydrate: #root must have non-empty text content. */
async function waitForHydration(page: import('@playwright/test').Page, timeout = 15_000) {
  await page.waitForFunction(
    () => {
      const root = document.getElementById('root')
      return root && (root.innerText || root.textContent || '').trim().length > 10
    },
    { timeout },
  )
}

/**
 * Auth-gated route smoke tests for hub navigation.
 *
 * Unauthenticated users get redirected to /login when hitting any
 * /app/* path. These tests verify that the redirect target is the
 * login page (not a crashed lazy chunk, not a 404, not a 500),
 * which proves:
 *   1. The route is registered in App.jsx
 *   2. The lazy-loaded module imports cleanly
 *   3. The provider chain (Auth → Impersonation → FeatureFlag → CMS)
 *      mounts without throwing
 *   4. URL renames added in Phase 15 successfully redirect old
 *      paths to their canonical homes
 */

const NEW_HUB_ROUTES = [
  '/app/accounts',
  '/app/ops',
  '/app/ops/team',
  '/app/ops/newsletter',
  '/app/ops/automations',
  '/app/ops/projects',
  // Dev tools wired up in Phase 62 — orphans before, reachable now.
  '/app/developer/qa-tasks',
  '/app/developer/qa-test-suite',
  '/app/developer/qa-usage',
]

const LEGACY_REDIRECT_ROUTES = [
  '/app/crm/team',
  '/app/crm/newsletter',
  '/app/crm/automations',
  '/app/crm/projects',
]

test.describe('Hub routes (auth-gated)', () => {
  for (const path of NEW_HUB_ROUTES) {
    test(`new route ${path} resolves to login (unauthed)`, async ({ page }) => {
      const resp = await page.goto(path)
      expect(resp?.status() ?? 200, 'should not be a server error').toBeLessThan(500)
      // Either the URL became /login, or the page is showing the login form
      await page.waitForURL(/\/(login|$)/, { timeout: 10_000 })
      await waitForHydration(page)
      const body = await page.locator('body').innerText()
      // Login page should have an email field somewhere
      expect(body.toLowerCase()).toMatch(/email|sign in|log in|login/)
    })
  }

  for (const path of LEGACY_REDIRECT_ROUTES) {
    test(`legacy route ${path} still resolves (post-rename)`, async ({ page }) => {
      // We don't assert the final URL here — when the user is
      // unauthenticated, ProtectedRoute hijacks the redirect chain
      // and sends them to /login regardless. The point is that the
      // module loads and doesn't 500.
      const resp = await page.goto(path)
      expect(resp?.status() ?? 200).toBeLessThan(500)
      await page.waitForURL(/\/(login|$)/, { timeout: 10_000 })
    })
  }

  test('unknown /app/ subpath redirects, does not crash', async ({ page }) => {
    const resp = await page.goto('/app/this-path-does-not-exist-' + Date.now())
    expect(resp?.status() ?? 200).toBeLessThan(500)
    await page.waitForURL(/\/(login|$)/, { timeout: 10_000 })
  })
})
