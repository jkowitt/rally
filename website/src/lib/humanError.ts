// Translate raw error messages (especially from Supabase / Postgres
// / fetch) into user-friendly copy. Centralized so every toast/
// alert/inline-error path can call the same function instead of
// surfacing internals to the user.
//
//   import { humanError } from '@/lib/humanError'
//   toast({ title: 'Error', description: humanError(err), type: 'error' })

export function humanError(err: unknown): string {
  if (!err) return 'Something went wrong. Please try again.'
  // Supabase PostgrestError + edge-function FunctionsError + plain
  // `{ message, details, hint, code }` objects don't extend Error,
  // so `instanceof Error` misses them and `String(err)` returns the
  // useless "[object Object]". Pull `.message` (and friends) directly
  // when present.
  let raw: string
  if (err instanceof Error) {
    raw = err.message
  } else if (typeof err === 'object' && err !== null) {
    const e = err as { message?: unknown; details?: unknown; hint?: unknown; error?: unknown; error_description?: unknown }
    raw =
      (typeof e.message === 'string' && e.message) ||
      (typeof e.error_description === 'string' && e.error_description) ||
      (typeof e.error === 'string' && e.error) ||
      (typeof e.details === 'string' && e.details) ||
      (typeof e.hint === 'string' && e.hint) ||
      (() => { try { return JSON.stringify(err) } catch { return String(err) } })()
  } else {
    raw = String(err)
  }
  const msg = raw.toLowerCase()

  // Auth
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return "That email and password don't match. Try again, or use Forgot password."
  }
  if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
    return 'Confirm your email first — check your inbox for the verification link.'
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'That email is already registered. Try signing in instead.'
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many attempts. Wait a minute before trying again.'
  }
  if (msg.includes('jwt') || msg.includes('expired') && msg.includes('token')) {
    return 'Your session expired. Sign in again to continue.'
  }

  // RLS / permissions
  if (msg.includes('row-level security') || msg.includes('rls') || msg.includes('42501')) {
    return "You don't have permission to do that. Contact an admin if you think this is wrong."
  }

  // Constraints
  if (msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('23505')) {
    return 'That already exists. Try a different name or value.'
  }
  if (msg.includes('foreign key') || msg.includes('23503')) {
    return "Can't do that — something else is still linked to this record."
  }
  if (msg.includes('not-null') || msg.includes('23502')) {
    return 'Missing a required field. Check the form and try again.'
  }
  if (msg.includes('check constraint') || msg.includes('23514')) {
    return 'One of the values is invalid. Check the form and try again.'
  }

  // Network
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network error')) {
    return 'Network problem. Check your connection and try again.'
  }
  if (msg.includes('cors') || msg.includes('blocked by cors')) {
    return 'Connection blocked. Try refreshing the page.'
  }

  // Plan-gated features (edge functions returning 403 / "plan_required").
  // The shared assertPlan helper sends back a friendly `message` field
  // naming the required plan; surface it directly. Catch-all check
  // covers cases where only the error code reaches us.
  if (msg.includes('plan_required') || (msg.includes('requires the') && msg.includes('plan'))) {
    return raw.includes('requires the')
      ? raw
      : 'This feature requires a higher-tier plan. Upgrade in Settings → Billing.'
  }

  // Edge function failures
  if (msg.includes('edge function') && msg.includes('non-2xx')) {
    return 'An AI feature is temporarily unavailable. Try again in a moment — other features still work.'
  }

  // Storage / file
  if (msg.includes('payload too large') || msg.includes('413')) {
    return 'That file is too large. Try one under 50 MB.'
  }

  // Fallback — return the raw message so devs aren't completely
  // blind, but trim Postgres prefixes that confuse users.
  return raw
    .replace(/^(error: |postgres error: |supabase error: )/i, '')
    .replace(/\s*\([0-9]{5}\)$/, '') // strip trailing PG error codes
    .trim() || 'Something went wrong. Please try again.'
}
