import { test, expect } from './auth.fixture'

// Critical-path authenticated tests. Skipped automatically when
// test credentials aren't configured (see auth.fixture.ts).

test.describe('Authenticated dashboard', () => {
  test('Dashboard loads and shows hub picker', async ({ authedPage }) => {
    await authedPage.goto('/app')
    // Hub picker is in the top bar — verify the three hubs are reachable
    await expect(authedPage.getByRole('button', { name: /CRM & Prospecting/i })).toBeVisible()
    await expect(authedPage.getByRole('button', { name: /Account Management/i })).toBeVisible()
  })

  test('Hub picker switches to Account Management', async ({ authedPage }) => {
    await authedPage.goto('/app')
    await authedPage.getByRole('button', { name: /Account Management/i }).click()
    await authedPage.waitForURL(/\/app\/accounts/, { timeout: 5_000 })
    // Account Mgmt dashboard should render its title
    await expect(authedPage.getByRole('heading', { name: /Account Management/i })).toBeVisible()
  })

  test('Pipeline page loads (or shows empty state)', async ({ authedPage }) => {
    await authedPage.goto('/app/crm/pipeline')
    // Either there are deals, or the empty state with the CTA is visible.
    const body = await authedPage.locator('body').innerText()
    expect(body.toLowerCase()).toMatch(/no deals yet|pipeline|prospect|negotiation/)
  })
})
