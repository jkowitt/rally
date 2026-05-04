// ============================================================
// emailScore — heuristic score-out-of-10 for outbound email drafts
// ============================================================
// Deterministic, runs on every keystroke (no API call). Same shape
// as the AI's score so the coach panel can fall back to this
// instantly while waiting for an AI rewrite, then update with the
// model's score when it arrives.
//
// Pure function. No side effects. No network.
// ============================================================

export interface ScoreBreakdown {
  score: number          // 0-10 integer
  factors: Array<{ key: string; label: string; delta: number; note?: string }>
  word_count: number
  char_count: number
}

// Spam-trigger phrases that mail filters or human readers immediately
// flag. Keep the list tight; false positives cost more than false
// negatives at this size.
const SPAM_PHRASES = [
  '100% free', 'act now', 'click here', 'amazing opportunity',
  'guaranteed', 'risk free', 'no obligation', 'urgent action required',
  'limited time', 'congratulations you', '$$$', 'cash prize', 'order now',
]

// AI-tell phrases — formulaic openers/closers that signal an LLM wrote it.
const AI_TELLS = [
  'i hope this email finds you well',
  'i trust you are doing well',
  'i wanted to reach out',
  'i am writing to',
  'please don\'t hesitate to',
  'should you have any questions',
  'looking forward to hearing from you',
  'i hope this message finds',
  'as per our discussion',
  'please find attached',
  'in conclusion',
  'furthermore,',
  'moreover,',
  'in addition to',
]

// Patterns that indicate a clear, concrete CTA. Any single hit boosts the score.
const CTA_PATTERNS = [
  /\b(15|20|25|30) ?min(s|utes)?\b/i,
  /\b(monday|tuesday|wednesday|thursday|friday)\b/i,
  /\b(this|next) week\b/i,
  /\bcalendly\.com\//i,
  /\bquick call\b/i,
  /\bworth a (call|chat|conversation)\b/i,
  /\b(grab|book|schedule) (a |\d+ ?min)/i,
]

// Personalization signals — references to a name, a specific
// company, or a recent event. We approximate by looking for capitalized
// proper nouns mid-sentence (likely brand/person names) and recency words.
const RECENCY_PATTERNS = [
  /\b(saw|noticed|read|caught) (your|the)\b/i,
  /\bcongrats on\b/i,
  /\bjust saw\b/i,
  /\blast (week|month)\b/i,
]

// Public scoring entry. Pass the body; optional subject + incoming
// for richer signals.
export function scoreEmail(text: string, opts?: { subject?: string; incoming?: string }): ScoreBreakdown {
  const trimmed = (text || '').trim()
  const lower = trimmed.toLowerCase()
  const words = trimmed ? trimmed.split(/\s+/).length : 0
  const factors: ScoreBreakdown['factors'] = []
  let score = 5 // Start neutral; nudge up/down from here.

  // ── Length ────────────────────────────────────────────────
  if (words === 0) {
    return { score: 0, factors: [{ key: 'empty', label: 'Empty draft', delta: -5 }], word_count: 0, char_count: 0 }
  }
  if (words < 20) {
    score -= 2
    factors.push({ key: 'too_short', label: 'Very short', delta: -2, note: 'Under 20 words usually reads abrupt.' })
  } else if (words > 250) {
    score -= 2
    factors.push({ key: 'too_long', label: 'Too long', delta: -2, note: 'Replies drop sharply above 250 words.' })
  } else if (words >= 40 && words <= 150) {
    score += 1
    factors.push({ key: 'good_length', label: 'Good length', delta: +1 })
  }

  // ── AI-tells ──────────────────────────────────────────────
  let aiHits = 0
  for (const phrase of AI_TELLS) {
    if (lower.includes(phrase)) aiHits++
  }
  if (aiHits >= 2) {
    score -= 3
    factors.push({ key: 'ai_tells_many', label: `${aiHits} AI-tell phrases`, delta: -3, note: 'Stiff openers/closers.' })
  } else if (aiHits === 1) {
    score -= 1
    factors.push({ key: 'ai_tells_one', label: '1 AI-tell phrase', delta: -1 })
  } else {
    score += 1
    factors.push({ key: 'no_ai_tells', label: 'No AI-tells', delta: +1 })
  }

  // ── Spam triggers ─────────────────────────────────────────
  let spamHits = 0
  for (const phrase of SPAM_PHRASES) {
    if (lower.includes(phrase)) spamHits++
  }
  if (spamHits > 0) {
    score -= 2
    factors.push({ key: 'spam_phrases', label: `${spamHits} spam-trigger phrase${spamHits === 1 ? '' : 's'}`, delta: -2 })
  }

  // ── ALL-CAPS shouting ─────────────────────────────────────
  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean)
  const yelling = lines.filter(l => l.length > 12 && l === l.toUpperCase() && /[A-Z]/.test(l)).length
  if (yelling >= 1) {
    score -= 1
    factors.push({ key: 'shouting', label: `${yelling} ALL-CAPS line${yelling === 1 ? '' : 's'}`, delta: -1 })
  }

  // ── Excessive punctuation ─────────────────────────────────
  const exclam = (trimmed.match(/!/g) || []).length
  if (exclam >= 3) {
    score -= 1
    factors.push({ key: 'too_many_exclaims', label: `${exclam} exclamation marks`, delta: -1 })
  }

  // ── Concrete CTA ──────────────────────────────────────────
  const hasCta = CTA_PATTERNS.some(p => p.test(trimmed))
  if (hasCta) {
    score += 2
    factors.push({ key: 'has_cta', label: 'Specific CTA', delta: +2, note: 'Time-bound ask.' })
  } else {
    score -= 1
    factors.push({ key: 'no_cta', label: 'No specific CTA', delta: -1 })
  }

  // ── Personalization ───────────────────────────────────────
  const recency = RECENCY_PATTERNS.some(p => p.test(trimmed))
  if (recency) {
    score += 1
    factors.push({ key: 'personalized', label: 'References something recent', delta: +1 })
  }

  // Use of recipient name mid-body (not just the greeting) — proxy for personalization
  const referencesIncoming = !!opts?.incoming && containsAnyProperNoun(trimmed, opts.incoming)
  if (referencesIncoming) {
    score += 1
    factors.push({ key: 'uses_inbound_context', label: 'References inbound context', delta: +1 })
  }

  // ── Question presence ─────────────────────────────────────
  if (/\?/.test(trimmed)) {
    score += 1
    factors.push({ key: 'asks_question', label: 'Asks a question', delta: +1 })
  }

  // ── Em-dash overuse (AI tell when used as comma replacement) ─
  const dashCount = (trimmed.match(/—/g) || []).length
  if (dashCount >= 3) {
    score -= 1
    factors.push({ key: 'em_dash_overuse', label: `${dashCount} em-dashes`, delta: -1, note: 'Reads AI-flavored.' })
  }

  // ── Subject quality ───────────────────────────────────────
  const subj = (opts?.subject || '').trim()
  if (subj) {
    if (subj.length < 4) {
      score -= 1
      factors.push({ key: 'subject_too_short', label: 'Subject too short', delta: -1 })
    } else if (subj.length > 78) {
      score -= 1
      factors.push({ key: 'subject_too_long', label: 'Subject truncates in Gmail', delta: -1 })
    } else if (/^[A-Z0-9\s!?]+$/.test(subj) && subj.length > 6) {
      score -= 2
      factors.push({ key: 'subject_caps', label: 'ALL-CAPS subject', delta: -2 })
    }
  }

  return {
    score: Math.max(0, Math.min(10, Math.round(score))),
    factors,
    word_count: words,
    char_count: trimmed.length,
  }
}

// Quick proper-noun check — does the draft mention any capitalized word
// from the inbound email that's longer than 3 chars and not a stopword?
// Cheap approximation of "you referenced what they said."
function containsAnyProperNoun(draft: string, incoming: string): boolean {
  const candidates = new Set<string>()
  const stopwords = new Set(['The', 'This', 'That', 'These', 'Those', 'Hi', 'Hello', 'Hey', 'Best', 'Thanks', 'Regards', 'And', 'But', 'For', 'You', 'Your', 'We', 'Our'])
  for (const m of incoming.matchAll(/\b[A-Z][a-zA-Z]{3,}\b/g)) {
    if (!stopwords.has(m[0])) candidates.add(m[0])
  }
  if (candidates.size === 0) return false
  for (const c of candidates) {
    if (draft.includes(c)) return true
  }
  return false
}
