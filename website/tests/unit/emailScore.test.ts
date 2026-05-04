import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scoreEmail } from '../../src/lib/emailScore.ts'

// Pure-function tests for the heuristic emailScore. The numbers
// should be defensible at a glance — these tests anchor expected
// behavior so future tweaks to the rubric don't silently regress.

test('empty draft scores 0', () => {
  const r = scoreEmail('')
  assert.equal(r.score, 0)
  assert.equal(r.word_count, 0)
})

test('formulaic AI-tell email scores low', () => {
  const r = scoreEmail(
    'Hi Jane, I hope this email finds you well. I wanted to reach out about our partnership opportunity. ' +
    'Please don\'t hesitate to reach out. Looking forward to hearing from you.'
  )
  assert.ok(r.score <= 4, `expected ≤4 got ${r.score}`)
  assert.ok(r.factors.some(f => f.key.startsWith('ai_tells')))
})

test('clean human email with CTA scores high', () => {
  const r = scoreEmail(
    'Hey Jane, saw the launch last week — congrats. We\'ve worked with three brands in your category and the early returns are strong. ' +
    'Worth a quick 15 min next Tuesday at 10am ET to compare notes?'
  )
  assert.ok(r.score >= 7, `expected ≥7 got ${r.score}`)
  assert.ok(r.factors.some(f => f.key === 'has_cta'))
  assert.ok(r.factors.some(f => f.key === 'no_ai_tells'))
})

test('spam-phrase email penalized', () => {
  const r = scoreEmail(
    'Hi there, this is an AMAZING OPPORTUNITY. Act now — guaranteed results! Click here to learn more!!!'
  )
  assert.ok(r.score <= 3, `expected ≤3 got ${r.score}`)
  assert.ok(r.factors.some(f => f.key === 'spam_phrases'))
  assert.ok(r.factors.some(f => f.key === 'shouting' || f.key === 'too_many_exclaims'))
})

test('too short penalized', () => {
  const r = scoreEmail('Reply when you can.')
  assert.ok(r.factors.some(f => f.key === 'too_short'))
})

test('too long penalized', () => {
  const r = scoreEmail('We have ' + 'lots and lots of context to share '.repeat(50))
  assert.ok(r.factors.some(f => f.key === 'too_long'))
})

test('em-dash overuse flagged', () => {
  const r = scoreEmail(
    'Hey Jane — wanted to share a quick thought — we partnered with three brands — all saw lift.'
  )
  assert.ok(r.factors.some(f => f.key === 'em_dash_overuse'))
})

test('inbound-context reference boosts score', () => {
  const incoming = 'Hi, we just announced our Q3 earnings at Acme Corp.'
  const draft = 'Hey Bob, congrats on the Q3 results at Acme Corp. Worth 15 min next Tuesday?'
  const r = scoreEmail(draft, { incoming })
  assert.ok(r.factors.some(f => f.key === 'uses_inbound_context'))
})
