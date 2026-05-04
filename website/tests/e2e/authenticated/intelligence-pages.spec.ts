import { test, expect } from './auth.fixture'

// Smoke tests for the prospect-intelligence pages. They should
// all render their headings without throwing, even when there is
// no data (empty-state path). Skipped when test credentials aren't
// configured (see auth.fixture.ts).

const PAGES: Array<{ path: string; heading: RegExp }> = [
  { path: '/app/crm/priority',           heading: /Priority Queue/i },
  { path: '/app/crm/signals',            heading: /Signal Radar/i },
  { path: '/app/crm/lookalikes',         heading: /Lookalikes/i },
  { path: '/app/crm/sequences',          heading: /Sequences/i },
  { path: '/app/crm/outreach-analytics', heading: /Outreach Analytics/i },
  { path: '/app/crm/postmortems',        heading: /Win\/Loss Postmortems/i },
  { path: '/app/crm/relationships',      heading: /Relationship Search/i },
]

test.describe('Prospect-intelligence pages', () => {
  for (const { path, heading } of PAGES) {
    test(`${path} renders without throwing`, async ({ authedPage }) => {
      const errors: string[] = []
      authedPage.on('pageerror', (e) => errors.push(e.message))
      await authedPage.goto(path)
      await expect(authedPage.getByRole('heading', { name: heading })).toBeVisible({ timeout: 8000 })
      // Block silently-failing pages: nothing should have thrown.
      expect(errors, `Console errors on ${path}: ${errors.join(', ')}`).toHaveLength(0)
    })
  }

  test('Sequences builder shows New button when empty', async ({ authedPage }) => {
    await authedPage.goto('/app/crm/sequences')
    await expect(authedPage.getByRole('heading', { name: /Sequences/i })).toBeVisible()
    // Builder tab should expose a "+ New" button to create the first sequence.
    await expect(authedPage.getByRole('button', { name: /\+ New/ })).toBeVisible()
  })
})
