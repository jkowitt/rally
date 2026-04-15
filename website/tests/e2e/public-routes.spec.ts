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
 */

test.describe('Public routes', () => {
  test('landing page renders', async ({ page }) => {
    await page.goto('/')
    // Don't lock to specific copy — just verify the shell rendered
    await expect(page).toHaveTitle(/Loud Legacy|Rally|Sponsorship/i)
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
    const body = await page.locator('body').innerText()
    // Pricing page has to reference at least one of the known plan keys
    expect(body.toLowerCase()).toMatch(/free|starter|pro|enterprise/)
  })

  test('/digest archive renders without crashing', async ({ page }) => {
    await page.goto('/digest')
    // Whether issues exist or not, the page should render the subscribe form
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(100)
  })

  test('/digest/:slug handles missing slugs gracefully', async ({ page }) => {
    // A slug that definitely does not exist — should NOT 500, should render
    // something (either a not-found message or redirect)
    const resp = await page.goto('/digest/this-slug-does-not-exist-xyz-' + Date.now())
    // Any non-500 is acceptable here
    expect(resp?.status() ?? 200).toBeLessThan(500)
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(50)
  })

  test('/compare hub loads', async ({ page }) => {
    await page.goto('/compare')
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(100)
  })

  test('/unsubscribe/:token handles bad tokens without crashing', async ({ page }) => {
    const resp = await page.goto('/unsubscribe/clearly-not-a-real-token-' + Date.now())
    expect(resp?.status() ?? 200).toBeLessThan(500)
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
