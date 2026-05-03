// Translate raw error messages (especially from Supabase / Postgres
// / fetch) into user-friendly copy. Centralized so every toast/
// alert/inline-error path can call the same function instead of
// surfacing internals to the user.
//
//   import { humanError } from '@/lib/humanError'
//   toast({ title: 'Error', description: humanError(err), type: 'error' })

export function humanError(err: unknown): string {
  if (!err) return 'Something went wrong. Please try again.'
  const raw = err instanceof Error ? err.message : String(err)
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
