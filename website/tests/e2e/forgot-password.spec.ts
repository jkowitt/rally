import { test, expect } from '@playwright/test'

/**
 * Forgot-password flow — covers the path the user takes when they
 * click "Forgot password" on the sign-in page.
 *
 * Doesn't actually send a real email (Supabase rate limits would
 * make that flaky in CI), but verifies:
 *   1. The "Forgot password?" link is reachable from the sign-in form
 *   2. The reset form renders + has an email input
 *   3. The reset-password landing page (/reset-password) renders
 *      without crashing when a user lands without a recovery session
 */

test.describe('Forgot password', () => {
  test('Forgot password link reaches the reset form', async ({ page }) => {
    await page.goto('/login')
    // The link only appears in sign-in mode, which is the default.
    const forgotLink = page.getByRole('button', { name: /forgot password/i })
    await expect(forgotLink).toBeVisible()
    await forgotLink.click()

    // Reset-password form should now be visible
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
  })

  test('Back-to-sign-in link returns to sign-in form', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /forgot password/i }).click()
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible()

    await page.getByRole('button', { name: /back to sign in/i }).click()
    await expect(page.getByRole('heading', { name: /^sign in$/i })).toBeVisible()
  })

  test('/reset-password renders without a recovery session', async ({ page }) => {
    await page.goto('/reset-password')
    // Without a token, the page should show "Verifying" or "Request a new link"
    // — never crash with a 500 or blank screen.
    const body = await page.locator('body').innerText()
    expect(body.toLowerCase()).toMatch(/verifying|request a new link|reset/)
  })
})
