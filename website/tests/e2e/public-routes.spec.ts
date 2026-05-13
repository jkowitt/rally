import { test, expect } from '@playwright/test'

/**
 * Public route smoke tests.
 *
 * Every test here runs against a route that is reachable WITHOUT login.
 * The goal is to catch:
 *   1. Broken lazy-load chunks (lazyRetry auto-reloads on failure; if a page
 *      stays blank we fail fast)
 *   2. A route that was removed from the Routes table but still linked
 *   3. Layout / provider chain errors (AuthProvider, CMSProvider, etc)
 *   4. Basic content sanity (headline, form, etc)
 *
 * All body-text assertions wait for the React app to hydrate before reading
 * innerText — this prevents false failures caused by reading the DOM before
 * the JS bundle has finished rendering.
 */

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

test.describe('Public routes', () => {
  test('landing page renders', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)
    // Don't lock to specific copy — just verify the shell rendered
    await expect(page).toHaveTitle(/Loud CRM|Rally|Sponsorship/i)
    // Some form of CTA or subscribe button should be on the page
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(200) // not a blank page
  })

  test('login page renders and has an email input', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
  })

  test('/pricing renders plans from the database', async ({ page }) => {
    await page.goto('/pricing')
    await waitForHydration(page)
    const body = await page.locator('body').innerText()
    // Pricing page has to reference at least one of the known plan keys
    expect(body.toLowerCase()).toMatch(/free|starter|pro|enterprise/)
  })

  test('/digest archive renders without crashing', async ({ page }) => {
    await page.goto('/digest')
    await waitForHydration(page)
    // Whether issues exist or not, the page should render the subscribe form
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(100)
  })

  test('/digest/:slug handles missing slugs gracefully', async ({ page }) => {
    // A slug that definitely does not exist — the app redirects to /digest
    const resp = await page.goto('/digest/this-slug-does-not-exist-xyz-' + Date.now())
    // Any non-500 is acceptable here
    expect(resp?.status() ?? 200).toBeLessThan(500)
    // The DigestArticle component redirects to /digest when slug is not found.
    // Wait for that redirect to complete, then verify the archive page rendered.
    await page.waitForURL(/\/digest\/?$/, { timeout: 15_000 })
    await waitForHydration(page)
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(50)
  })

  test('/compare hub loads', async ({ page }) => {
    await page.goto('/compare')
    await waitForHydration(page)
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(100)
  })

  test('/unsubscribe/:token handles bad tokens without crashing', async ({ page }) => {
    const resp = await page.goto('/unsubscribe/clearly-not-a-real-token-' + Date.now())
    expect(resp?.status() ?? 200).toBeLessThan(500)
    await waitForHydration(page)
    const body = await page.locator('body').innerText()
    // Should show *something* explaining the failure, not a blank white page
    expect(body.length).toBeGreaterThan(20)
  })

  test('unknown /app/* routes redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/app/crm/pipeline')
    // Should end up at /login or /
    await page.waitForURL(/\/(login|$)/, { timeout: 10_000 })
  })

  test('catch-all path redirects home', async ({ page }) => {
    await page.goto('/totally-made-up-path-' + Date.now())
    // App.jsx catch-all routes "*" → Navigate to "/"
    await page.waitForURL(/\/$/, { timeout: 10_000 })
  })
})
