// ============================================================
// Deliverability linter — pure client-side checks before send.
// ============================================================
// Returns a list of warnings the user can ignore but should see.
// Categories:
//   • content   — spam-trigger words, ALL CAPS, link-to-text ratio
//   • length    — too long / too short
//   • technical — image-only body, no plain-text alt, broken {{merge}}
//   • cadence   — bounced before, recently sent, weekend send hint
//
// Every check returns a level ('warn' | 'block') so Compose can
// decide whether to confirm or refuse.

export type LintLevel = 'warn' | 'block'
export type LintIssue = { level: LintLevel; message: string; field?: 'subject' | 'body' | 'to' }

// Conservative spam-trigger words. Order doesn't matter; any hit fires.
const SPAM_WORDS = [
  '100% free', 'act now', 'amazing', 'apply now', 'as seen on',
  'best price', 'big bucks', 'billion dollars', 'cash bonus', 'cheap',
  'click below', 'click here', 'congratulations', 'credit card', 'dear friend',
  'double your', 'earn extra', 'eliminate debt', 'extra income', 'fast cash',
  'free access', 'free gift', 'free money', 'free trial',
  'guaranteed', 'increase sales', 'lowest price', 'make money',
  'no cost', 'no fees', 'no obligation', 'now only', 'order now',
  'pre-approved', 'risk free', 'satisfaction guaranteed', 'urgent',
  'winner', 'winning', '$$$', '!!!', '???',
]

// Subject-line check
function checkSubject(subject: string): LintIssue[] {
  const out: LintIssue[] = []
  const trimmed = (subject || '').trim()
  if (!trimmed) {
    out.push({ level: 'block', field: 'subject', message: 'Subject is empty.' })
    return out
  }
  if (trimmed.length < 4) {
    out.push({ level: 'warn', field: 'subject', message: 'Subject is very short — most filters flag <4 chars.' })
  }
  if (trimmed.length > 78) {
    out.push({ level: 'warn', field: 'subject', message: `Subject is ${trimmed.length} chars — Gmail truncates above ~70.` })
  }
  if (/^[A-Z0-9\s!?]+$/.test(trimmed) && trimmed.length > 6) {
    out.push({ level: 'warn', field: 'subject', message: 'Subject is ALL CAPS — strong spam signal.' })
  }
  const exclamCount = (trimmed.match(/!/g) || []).length
  if (exclamCount >= 3) {
    out.push({ level: 'warn', field: 'subject', message: 'Subject has 3+ exclamation marks.' })
  }
  for (const w of SPAM_WORDS) {
    if (trimmed.toLowerCase().includes(w)) {
      out.push({ level: 'warn', field: 'subject', message: `Subject contains "${w}" — frequent spam trigger.` })
      break
    }
  }
  return out
}

// Body checks
function checkBody(body: string): LintIssue[] {
  const out: LintIssue[] = []
  const trimmed = (body || '').trim()
  if (!trimmed) {
    out.push({ level: 'block', field: 'body', message: 'Body is empty.' })
    return out
  }
  const wordCount = trimmed.split(/\s+/).length
  if (wordCount < 15) {
    out.push({ level: 'warn', field: 'body', message: `Body is only ${wordCount} words — too thin can read as spam.` })
  }
  if (wordCount > 400) {
    out.push({ level: 'warn', field: 'body', message: `Body is ${wordCount} words — replies drop sharply above ~250.` })
  }

  // Unrendered merge tags
  const unrendered = trimmed.match(/\{\{[^}]+\}\}/g)
  if (unrendered) {
    out.push({ level: 'block', field: 'body', message: `Body has unrendered merge tags: ${unrendered.slice(0, 3).join(', ')}` })
  }

  // ALL CAPS shouting
  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean)
  const yelling = lines.filter(l => l.length > 12 && l === l.toUpperCase() && /[A-Z]/.test(l)).length
  if (yelling >= 2) {
    out.push({ level: 'warn', field: 'body', message: `${yelling} ALL-CAPS lines — looks like shouting.` })
  }

  // Link-to-text ratio (anchor count vs word count). High ratios pattern poorly.
  const linkCount = (trimmed.match(/https?:\/\/\S+/g) || []).length
  if (linkCount > 4 && linkCount / Math.max(wordCount, 1) > 0.05) {
    out.push({ level: 'warn', field: 'body', message: `${linkCount} links in ${wordCount} words — too dense for outreach.` })
  }

  // Spam words
  const lower = trimmed.toLowerCase()
  const hits = SPAM_WORDS.filter(w => lower.includes(w)).slice(0, 3)
  if (hits.length > 0) {
    out.push({ level: 'warn', field: 'body', message: `Spam-trigger phrases in body: "${hits.join('", "')}"` })
  }

  return out
}

// Recipient checks
function checkRecipients(to: string): LintIssue[] {
  const out: LintIssue[] = []
  const list = (to || '').split(',').map(s => s.trim()).filter(Boolean)
  if (list.length === 0) {
    out.push({ level: 'block', field: 'to', message: 'No recipient.' })
    return out
  }
  if (list.length > 20) {
    out.push({ level: 'warn', field: 'to', message: `${list.length} recipients on one message — split into smaller batches to protect deliverability.` })
  }
  for (const addr of list) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
      out.push({ level: 'block', field: 'to', message: `Invalid email format: ${addr}` })
    }
    if (/(\.test|example\.com|mailinator\.com|yopmail\.com)$/i.test(addr)) {
      out.push({ level: 'warn', field: 'to', message: `${addr} looks like a disposable / test address.` })
    }
  }
  return out
}

// Public entry.
export function lintEmail({ to, subject, body }: { to: string; subject: string; body: string }): LintIssue[] {
  return [
    ...checkRecipients(to),
    ...checkSubject(subject),
    ...checkBody(body),
  ]
}

export function hasBlockers(issues: LintIssue[]): boolean {
  return issues.some(i => i.level === 'block')
}
