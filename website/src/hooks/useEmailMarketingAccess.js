import { useAuth } from './useAuth'
import { useFeatureFlags } from './useFeatureFlags'

/**
 * Unified access check for the Email Marketing feature.
 *
 * Mirrors the can_access_email_marketing() RLS helper in the database
 * (migration 054) so the frontend gate matches the backend gate exactly.
 *
 * Returns `granted: true` when EITHER:
 *   1. user is 'developer' role AND email_marketing_developer flag is ON, OR
 *   2. user is 'admin' | 'businessops' | 'developer' role AND
 *      email_marketing_public flag is ON
 *
 * The returned `mode` is used by the UI to choose between the full
 * developer experience and the beta-labeled admin experience:
 *   - 'developer' — shown when the dev flag path granted access
 *   - 'public'    — shown when only the public flag path granted access
 *   - null        — no access; UI should silently render nothing
 */
export function useEmailMarketingAccess() {
  const { profile, loading: authLoading } = useAuth()
  const { flags, loaded: flagsLoaded } = useFeatureFlags()

  const ready = !authLoading && flagsLoaded
  const role = profile?.role
  const isDeveloper = role === 'developer'
  const isAdminPlus = role === 'developer' || role === 'businessops' || role === 'admin'

  const devFlag = Boolean(flags?.email_marketing_developer)
  const publicFlag = Boolean(flags?.email_marketing_public)

  // Developer path takes precedence — grants more privileges in the UI
  // (full conversations, sync settings, etc).
  const devGranted = isDeveloper && devFlag
  const publicGranted = isAdminPlus && publicFlag

  const granted = ready && (devGranted || publicGranted)
  const mode = !granted ? null : devGranted ? 'developer' : 'public'

  return { granted, ready, mode, isDeveloper, role, devFlag, publicFlag }
}
