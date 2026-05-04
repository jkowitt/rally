import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lintEmail, hasBlockers } from '../../src/lib/deliverability.ts'

// Unit tests for the pre-send deliverability linter. These are
// pure-function tests — no React, no fetch, no Supabase.

test('lintEmail blocks empty subject', () => {
  const issues = lintEmail({ to: 'a@b.com', subject: '', body: 'Hi there friend, hope you are well, just reaching out about the partnership opportunity we discussed last week.' })
  assert.ok(hasBlockers(issues), 'empty subject should be a blocker')
})

test('lintEmail blocks empty body', () => {
  const issues = lintEmail({ to: 'a@b.com', subject: 'Quick note', body: '' })
  assert.ok(hasBlockers(issues), 'empty body should be a blocker')
})

test('lintEmail blocks invalid recipient', () => {
  const issues = lintEmail({ to: 'not-an-email', subject: 'x', body: 'Hello there friend, just a quick note about the partnership.' })
  assert.ok(hasBlockers(issues), 'invalid email should block')
})

test('lintEmail blocks unrendered merge tags in body', () => {
  const issues = lintEmail({
    to: 'a@b.com',
    subject: 'Hi',
    body: 'Hi {{first_name}}, hope you are well today. Just checking in on the partnership timeline you mentioned.',
  })
  assert.ok(hasBlockers(issues), 'unrendered merge tags should block')
})

test('lintEmail warns on ALL CAPS subject', () => {
  const issues = lintEmail({
    to: 'a@b.com',
    subject: 'AMAZING OFFER INSIDE',
    body: 'Hi friend, hope you are well today. Just checking in on the partnership timeline you mentioned.',
  })
  assert.ok(!hasBlockers(issues), 'caps subject should warn but not block')
  assert.ok(issues.some(i => /ALL CAPS|spam/i.test(i.message)), 'should flag caps')
})

test('lintEmail warns on excessive link density', () => {
  const issues = lintEmail({
    to: 'a@b.com',
    subject: 'Quick note',
    body: 'Check these https://a.com https://b.com https://c.com https://d.com https://e.com',
  })
  assert.ok(issues.some(i => /links/i.test(i.message)), 'should warn on link density')
})

test('lintEmail accepts a clean professional email', () => {
  const issues = lintEmail({
    to: 'jane@brand.com',
    subject: 'Following up on partnership',
    body: 'Hi Jane,\n\nWanted to bump my note from earlier. We had three brands with similar audiences activate this season and the early returns look strong. Happy to share what worked over a 15-minute call.\n\nThanks,\nAlex',
  })
  assert.equal(hasBlockers(issues), false, 'clean email should not be blocked')
})

test('lintEmail flags too many recipients', () => {
  const recipients = Array.from({ length: 25 }, (_, i) => `user${i}@example.com`).join(',')
  const issues = lintEmail({ to: recipients, subject: 'Quick note', body: 'Hi friend, hope all is well today. Reaching out about a partnership opportunity that may align well with your team.' })
  assert.ok(issues.some(i => /recipients/i.test(i.message)), 'should warn on >20 recipients')
})
